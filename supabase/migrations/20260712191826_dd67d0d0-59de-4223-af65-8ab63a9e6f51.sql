
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'essay',
  ADD COLUMN IF NOT EXISTS citation_style text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quality_score jsonb,
  ADD COLUMN IF NOT EXISTS grammar_report jsonb,
  ADD COLUMN IF NOT EXISTS exports_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.assignment_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assignment_messages_assignment_id_idx
  ON public.assignment_messages(assignment_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_messages TO authenticated;
GRANT ALL ON public.assignment_messages TO service_role;

ALTER TABLE public.assignment_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own assignment messages"
  ON public.assignment_messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
