import { useRef, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Loader2, Trash2, Upload, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUserNotebook, type NotebookTemplate } from "@/hooks/use-user-notebook";
import { ACCEPTED_NOTEBOOK_TYPES } from "@/lib/notebook-background";

/**
 * "My Notebook" — saved-per-account notebook page background.
 * Purely a background chooser; handwriting styles stay untouched.
 */
export function NotebookBackgroundManager() {
  const { notebook, isLoading, upload, setTemplate, remove } = useUserNotebook();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const template: NotebookTemplate = notebook?.template ?? "classic";

  async function onPick(file?: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      await upload(file);
      toast.success("Notebook saved to your account");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that notebook page");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onTemplateChange(v: string) {
    setBusy(true);
    try {
      await setTemplate(v as NotebookTemplate);
    } catch {
      toast.error("Could not update notebook template");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    try {
      await remove();
      toast.success("Custom notebook deleted");
    } catch {
      toast.error("Could not delete notebook");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-white/10 p-3">
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <NotebookPen className="h-3.5 w-3.5" /> Notebook template
        </Label>
        <Select value={template} onValueChange={onTemplateChange} disabled={busy || isLoading}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="classic">Classic School Notebook (Default)</SelectItem>
            <SelectItem value="custom">My Notebook (Custom)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {template === "custom" && (
        <div className="space-y-3">
          {notebook?.signedUrl ? (
            <div className="space-y-2">
              <div className="overflow-hidden rounded-md border border-white/10 bg-white">
                <img
                  src={notebook.signedUrl}
                  alt="Your saved notebook page background"
                  className="mx-auto max-h-56 w-auto object-contain"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Saved to your account — used automatically for every notebook PDF until you
                replace it or switch back to the classic notebook.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={busy}
                  onClick={() => fileRef.current?.click()}>
                  {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                  Replace
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-1.5" />Delete
                </Button>
                <Button size="sm" variant="ghost" disabled={busy}
                  onClick={() => onTemplateChange("classic")}>
                  <BookOpen className="h-4 w-4 mr-1.5" />Use classic
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-1.5 rounded-md border border-dashed border-white/20 p-5 text-center text-sm transition hover:border-primary/50"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="font-medium">Upload a blank page from your notebook</span>
              <span className="text-xs text-muted-foreground">JPG, PNG or PDF — lines, margins and headers are kept</span>
            </button>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_NOTEBOOK_TYPES}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
    </div>
  );
}
