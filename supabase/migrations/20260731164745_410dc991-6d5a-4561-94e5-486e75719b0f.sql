ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS regeneration_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_regenerations integer NOT NULL DEFAULT 1;