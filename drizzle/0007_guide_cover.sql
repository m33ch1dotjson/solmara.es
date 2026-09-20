-- A cover image for a Process Guide.
--
-- Not a second storage key on the guide: the picture is an ordinary
-- process_guide_file row like every other image in a guide, and the guide simply
-- points at which one is the cover. That way the file is served, protected and
-- cleaned up by the machinery that already exists, and a guide without a cover is
-- a NULL rather than a special case.
--
-- ON DELETE SET NULL, so removing the file removes the cover and leaves the guide.

ALTER TABLE app.process_guide
  ADD COLUMN IF NOT EXISTS cover_file_id uuid
  REFERENCES app.process_guide_file(id) ON DELETE SET NULL;--> statement-breakpoint
