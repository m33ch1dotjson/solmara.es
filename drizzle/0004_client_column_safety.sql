-- Two fixes, both about what a client can reach.
--
-- 1. Documents were invisible for the same reason cases were: the policy consulted
--    app.document_case, which has no client policy, so the lookup came back empty.
--
-- 2. More seriously: a client could read their own row in app.client, and that row
--    carries internal_notes and lead_source. RLS filters rows, not columns, so
--    "you may see your own record" meant "you may see the note a case manager wrote
--    about you". That is not a hypothetical — the seeded note is about someone's
--    partner's work schedule.
--
-- The column problem is solved without a second database role: the client policy on
-- app.client is removed entirely, so a client sees no rows of that table at all, and
-- their profile is served by a function that returns only the safe columns. A
-- `select *` from the client tier now returns nothing rather than too much.

-- ------------------------------------------------------------------ documents

CREATE OR REPLACE FUNCTION app.contact_can_see_document(p_document_id uuid) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.document_case dc
    JOIN app.case_access ca ON ca.case_id = dc.case_id
    WHERE dc.document_id = p_document_id
      AND ca.contact_id = app.actor_id()
      AND ca.revoked_at IS NULL
      AND app.actor_kind() = 'client'
  )
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION app.contact_can_see_document(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.contact_can_see_document(uuid) TO app_server;--> statement-breakpoint

DROP POLICY IF EXISTS client_read ON app.client_document;--> statement-breakpoint
CREATE POLICY client_read ON app.client_document FOR SELECT
  USING (app.contact_can_see_document(id));--> statement-breakpoint

-- The client's own case screen lists what is still missing, so the requirements are
-- readable too — they contain no internal wording.
DROP POLICY IF EXISTS client_read ON app.document_requirement;--> statement-breakpoint
CREATE POLICY client_read ON app.document_requirement FOR SELECT
  USING (app.contact_can_see_case(case_id));--> statement-breakpoint

-- --------------------------------------------------------- the client's profile

-- No rows of app.client for a client actor. Their details come from the function
-- below, which decides column by column what may leave.
DROP POLICY IF EXISTS client_read ON app.client;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.client_self()
RETURNS TABLE (
  code text,
  name text,
  email text,
  phone text,
  preferred_locale app.locale,
  date_of_birth date,
  nationality text,
  passport_number text,
  passport_expiry date,
  nie_number text,
  nuss_number text,
  sip_number text,
  address_home_country text,
  address_spain text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, pg_temp
AS $$
  SELECT
    c.code, c.name, c.email, c.phone, c.preferred_locale,
    c.date_of_birth, c.nationality,
    c.passport_number, c.passport_expiry,
    c.nie_number, c.nuss_number, c.sip_number,
    c.address_home_country, c.address_spain
  FROM app.client c
  WHERE c.id = app.contact_client_id()
    AND app.actor_kind() = 'client';
$$;
--> statement-breakpoint

-- Deliberately absent from that list: internal_notes, lead_source, assigned_to,
-- status, context. They describe how we work on this person, not who they are.
REVOKE ALL ON FUNCTION app.client_self() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.client_self() TO app_server;--> statement-breakpoint
