
-- PLANS TABLE
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  monthly_price_cents INTEGER NOT NULL DEFAULT 0,
  yearly_price_cents INTEGER NOT NULL DEFAULT 0,
  credits INTEGER NOT NULL DEFAULT 0,
  daily_limit INTEGER NOT NULL DEFAULT 0,
  monthly_limit INTEGER NOT NULL DEFAULT 0,
  max_words INTEGER NOT NULL DEFAULT 0,
  max_upload_mb INTEGER NOT NULL DEFAULT 0,
  max_upload_pages INTEGER NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_recommended BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plans TO anon;
GRANT SELECT ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active non-archived plans"
  ON public.plans FOR SELECT
  USING (is_active = true AND is_archived = false);

CREATE POLICY "Admins can read all plans"
  ON public.plans FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert plans"
  ON public.plans FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update plans"
  ON public.plans FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete plans"
  ON public.plans FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER plans_set_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Extend subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_interval TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS renewal_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS lifetime_spending_cents INTEGER NOT NULL DEFAULT 0;

-- Seed default Free plan
INSERT INTO public.plans (
  slug, name, description, currency,
  monthly_price_cents, yearly_price_cents,
  credits, daily_limit, monthly_limit, max_words, max_upload_mb, max_upload_pages,
  features, is_active, is_recommended, sort_order
) VALUES (
  'free', 'Free', 'Get started with core AssignAI features.', 'USD',
  0, 0,
  10000, 3, 15, 1500, 5, 10,
  '{"humanized_writing": false, "ocr": true, "ai_chat": true, "pdf_export": true, "docx_export": true, "notebook_pdf": false, "citation_generator": true, "grammar_checker": true, "priority_queue": false, "faster_generation": false, "premium_templates": false, "api_access": false, "future_features": false}'::jsonb,
  true, false, 0
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.plans (
  slug, name, description, currency,
  monthly_price_cents, yearly_price_cents,
  credits, daily_limit, monthly_limit, max_words, max_upload_mb, max_upload_pages,
  features, is_active, is_recommended, sort_order
) VALUES (
  'pro', 'Pro', 'For serious students who want the best output every time.', 'USD',
  1900, 19000,
  100000, 25, 500, 8000, 50, 100,
  '{"humanized_writing": true, "ocr": true, "ai_chat": true, "pdf_export": true, "docx_export": true, "notebook_pdf": true, "citation_generator": true, "grammar_checker": true, "priority_queue": true, "faster_generation": true, "premium_templates": true, "api_access": false, "future_features": true}'::jsonb,
  true, true, 1
)
ON CONFLICT (slug) DO NOTHING;

-- Link existing subscriptions to plans by matching plan text -> plans.slug
UPDATE public.subscriptions s
SET plan_id = p.id
FROM public.plans p
WHERE s.plan_id IS NULL AND p.slug = s.plan;
