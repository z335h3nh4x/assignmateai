CREATE TABLE public.subscription_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  plan_id uuid REFERENCES public.plans(id),
  plan_name text,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  provider text NOT NULL DEFAULT 'razorpay',
  provider_payment_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX subscription_emails_payment_unique
  ON public.subscription_emails (provider, provider_payment_id);
CREATE INDEX subscription_emails_user_idx ON public.subscription_emails (user_id, created_at DESC);

GRANT SELECT ON public.subscription_emails TO authenticated;
GRANT ALL ON public.subscription_emails TO service_role;

ALTER TABLE public.subscription_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read subscription emails"
  ON public.subscription_emails FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "subscription_emails_no_client_insert"
  ON public.subscription_emails AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "subscription_emails_no_client_update"
  ON public.subscription_emails AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "subscription_emails_no_client_delete"
  ON public.subscription_emails AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

CREATE TRIGGER subscription_emails_set_updated_at
  BEFORE UPDATE ON public.subscription_emails
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();