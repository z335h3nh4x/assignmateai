import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_INSETS,
  processNotebookFile,
  type NotebookInsets,
} from "@/lib/notebook-background";

export type NotebookTemplate = "classic" | "custom";

export type UserNotebook = {
  template: NotebookTemplate;
  storagePath: string | null;
  insets: NotebookInsets;
  signedUrl: string | null;
};

const BUCKET = "notebooks";

async function signPath(path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

/**
 * Saved-per-account notebook background preference. Persists across devices,
 * sessions and logins — it is stored on the user's row, not locally.
 */
export function useUserNotebook() {
  const qc = useQueryClient();

  const query = useQuery<UserNotebook>({
    queryKey: ["user-notebook"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return { template: "classic", storagePath: null, insets: DEFAULT_INSETS, signedUrl: null };
      const { data, error } = await supabase
        .from("user_notebooks")
        .select("template, storage_path, insets")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { template: "classic", storagePath: null, insets: DEFAULT_INSETS, signedUrl: null };
      const insets = { ...DEFAULT_INSETS, ...((data.insets as Partial<NotebookInsets>) ?? {}) };
      return {
        template: (data.template as NotebookTemplate) ?? "classic",
        storagePath: data.storage_path,
        insets,
        signedUrl: await signPath(data.storage_path),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["user-notebook"] }), [qc]);

  const upload = useCallback(
    async (file: File) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("You need to be signed in");

      const processed = await processNotebookFile(file);
      const path = `${uid}/notebook-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, processed.blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;

      const previous = query.data?.storagePath ?? null;

      const { error } = await supabase.from("user_notebooks").upsert(
        {
          user_id: uid,
          template: "custom",
          storage_path: path,
          width: processed.width,
          height: processed.height,
          insets: processed.insets,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;

      if (previous && previous !== path) {
        await supabase.storage.from(BUCKET).remove([previous]);
      }
      URL.revokeObjectURL(processed.previewUrl);
      await refresh();
    },
    [query.data?.storagePath, refresh],
  );

  const setTemplate = useCallback(
    async (template: NotebookTemplate) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      const { error } = await supabase
        .from("user_notebooks")
        .upsert({ user_id: uid, template }, { onConflict: "user_id" });
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    const path = query.data?.storagePath;
    if (path) await supabase.storage.from(BUCKET).remove([path]);
    const { error } = await supabase
      .from("user_notebooks")
      .upsert(
        { user_id: uid, template: "classic", storage_path: null, width: null, height: null, insets: {} },
        { onConflict: "user_id" },
      );
    if (error) throw error;
    await refresh();
  }, [query.data?.storagePath, refresh]);

  return { ...query, notebook: query.data, upload, setTemplate, remove };
}
