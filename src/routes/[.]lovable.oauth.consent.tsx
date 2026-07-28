import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

type OAuthResult = {
  data?: {
    client?: { name?: string } | null;
    redirect_url?: string;
    redirect_to?: string;
  } | null;
  error?: { message: string } | null;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="glass rounded-3xl p-8 max-w-md text-center">
        <h1 className="text-xl font-display font-bold">Authorization request failed</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {String((error as Error)?.message ?? error)}
        </p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="glass rounded-3xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <BrandLogo size="h-12" imgMaxWidth="max-w-[180px]" showName={false} />
        </div>
        <h1 className="text-2xl font-display font-bold text-center">
          Connect {clientName} to Assignmate
        </h1>
        <p className="text-sm text-muted-foreground text-center mt-2">
          {clientName} will be able to read your assignments and plan usage as you. It cannot see
          other students&apos; data.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive text-center mt-4">
            {error}
          </p>
        )}
        <div className="mt-8 space-y-3">
          <Button className="w-full h-11 gradient-bg text-white" disabled={busy} onClick={() => decide(true)}>
            Approve
          </Button>
          <Button variant="ghost" className="w-full h-11" disabled={busy} onClick={() => decide(false)}>
            Deny
          </Button>
        </div>
      </div>
    </main>
  );
}
