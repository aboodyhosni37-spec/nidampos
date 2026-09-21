ALTER TABLE public.pos_sessions
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS pos_sessions_open_idx
  ON public.pos_sessions (last_seen_at)
  WHERE ended_at IS NULL;