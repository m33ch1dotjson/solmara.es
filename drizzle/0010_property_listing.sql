-- A property becomes a listing.
--
-- Until now a property was a title, an address and a note typed into a textarea —
-- and the note was doing the work of an advertisement: "320.000 EUR / 5 Rooms /
-- Swimmingpool" in one grey paragraph. That text is real and stays; it moves into a
-- proper description written with the same editor as a Process Guide, and the facts
-- that every listing shows get columns of their own so they can be laid out rather
-- than read out of a sentence.
--
-- Nothing is required. A property with only a title and an address looks exactly as
-- it did, minus the empty labels.

ALTER TABLE app.property ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';--> statement-breakpoint

-- Cents, like every other amount in this database. See lib/money.ts.
ALTER TABLE app.property ADD COLUMN IF NOT EXISTS price_cents bigint;--> statement-breakpoint
ALTER TABLE app.property ADD COLUMN IF NOT EXISTS bedrooms integer;--> statement-breakpoint
ALTER TABLE app.property ADD COLUMN IF NOT EXISTS bathrooms integer;--> statement-breakpoint
ALTER TABLE app.property ADD COLUMN IF NOT EXISTS area_m2 integer;--> statement-breakpoint

-- The existing note becomes the first paragraph of the listing. Escaped, not
-- trusted: whatever was typed there is text, and a < in it was a literal <.
UPDATE app.property
SET description = '<p>' || replace(
      replace(replace(replace(notes, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
      E'\n', '<br>'
    ) || '</p>'
WHERE description = '' AND notes IS NOT NULL AND notes <> '';--> statement-breakpoint

-- One text about the property, not two. The content is above, in description.
ALTER TABLE app.property DROP COLUMN IF EXISTS notes;--> statement-breakpoint
