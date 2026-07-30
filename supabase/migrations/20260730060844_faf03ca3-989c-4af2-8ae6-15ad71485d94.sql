CREATE TABLE public.user_notebooks (
  user_id uuid PRIMARY KEY,
  template text NOT NULL DEFAULT 'classic',
  storage_path text,
  width integer,
  height integer,
  insets jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notebooks TO authenticated;
GRANT ALL ON public.user_notebooks TO service_role;

ALTER TABLE public.user_notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notebook" ON public.user_notebooks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_notebooks_updated_at BEFORE UPDATE ON public.user_notebooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Users read own notebook files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'notebooks' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users upload own notebook files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notebooks' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own notebook files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'notebooks' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own notebook files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'notebooks' AND (storage.foldername(name))[1] = auth.uid()::text);