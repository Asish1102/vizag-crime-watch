CREATE TABLE IF NOT EXISTS dataset_uploads (
  id BIGSERIAL PRIMARY KEY,
  dataset_type TEXT NOT NULL CHECK (dataset_type IN ('coordinate', 'gis')),
  file_name TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  detected_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dataset_uploads_type_time_idx
  ON dataset_uploads (dataset_type, uploaded_at DESC);
