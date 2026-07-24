-- ============ platform_settings ============
CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_public_read" ON public.platform_settings
  FOR SELECT TO anon, authenticated
  USING (key LIKE 'public.%');

CREATE POLICY "settings_admin_read_all" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "settings_admin_write" ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============ feature_flags ============
CREATE TABLE public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  description text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_flags TO anon, authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flags_public_read" ON public.feature_flags
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "flags_admin_write" ON public.feature_flags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('ocr', true, 'Scan & extract text from uploaded images and PDFs'),
  ('humanizer', true, 'Human writing engine post-processing'),
  ('ai_chat', true, 'Ask follow-up questions about a generated assignment'),
  ('citation_generator', true, 'Auto-generated citations in APA / MLA / etc.'),
  ('grammar_checker', true, 'Grammar & writing analysis panel'),
  ('notebook_pdf', true, 'Handwritten notebook-style PDF export'),
  ('academic_pdf', true, 'Formal academic PDF export'),
  ('docx_export', true, 'Word (.docx) export'),
  ('image_uploads', true, 'Allow image files as assignment sources'),
  ('url_sources', true, 'Allow URLs as assignment sources'),
  ('followup_questions', true, 'Allow follow-up questions in the assistant'),
  ('priority_queue', true, 'Priority generation queue for paid plans'),
  ('faster_generation', true, 'Fast lane generation for paid plans'),
  ('premium_templates', true, 'Premium assignment templates'),
  ('new_ai_models', true, 'Expose newest AI models in the model picker'),
  ('beta_features', false, 'Experimental features under active development')
ON CONFLICT (key) DO NOTHING;


-- ============ announcements ============
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  button_text text,
  button_url text,
  bg_color text NOT NULL DEFAULT '#6366f1',
  audiences text[] NOT NULL DEFAULT ARRAY['homepage']::text[],
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_public_read_active" ON public.announcements
  FOR SELECT TO anon, authenticated
  USING (
    is_active
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY "announcements_admin_read_all" ON public.announcements
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "announcements_admin_write" ON public.announcements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============ audit_logs ============
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  target_user_id uuid,
  ip text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_action_idx ON public.audit_logs (action);
CREATE INDEX audit_logs_target_user_idx ON public.audit_logs (target_user_id);
CREATE INDEX audit_logs_actor_idx ON public.audit_logs (actor_id);