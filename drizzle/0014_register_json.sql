-- app.client_register, third time, and the last.
--
-- RETURNS TABLE (client_id uuid, ...) declares OUT parameters, and an OUT parameter
-- shadows a column of the same name everywhere in the body — including inside
-- `ON CONFLICT (client_id, email)`, where PostgreSQL cannot tell which one is meant
-- and refuses the call. Qualifying every reference does not help: the conflict
-- target may not be qualified at all.
--
-- So the function returns one jsonb value and declares no OUT parameters. Nothing in
-- the body can be shadowed, the caller reads three keys, and this class of error
-- cannot come back.

DROP FUNCTION IF EXISTS app.client_register(text, uuid, text, text, text);--> statement-breakpoint

CREATE FUNCTION app.client_register(
  p_email text,
  p_auth_user_id uuid,
  p_name text,
  p_code_prefix text,
  p_locale text DEFAULT 'en'
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = app, pg_temp
AS $$
DECLARE
  v_email  text := lower(trim(p_email));
  v_client app.client%ROWTYPE;
  v_client_id uuid;
  v_contact_id uuid;
  v_made boolean := false;
  v_number bigint;
  v_code text;
  v_name text := nullif(trim(coalesce(p_name, '')), '');
BEGIN
  -- Staff are not clients. Somebody on the team who signs up here would otherwise
  -- get a client file of their own and two portals to be confused by.
  IF EXISTS (SELECT 1 FROM app.staff_user su WHERE lower(su.email) = v_email) THEN
    RETURN NULL;
  END IF;

  -- Already has an account: hand back the one that exists. Registering twice is a
  -- refresh, not a second file.
  SELECT cc.id, cc.client_id INTO v_contact_id, v_client_id
  FROM app.client_contact cc
  WHERE lower(cc.email) = v_email
  ORDER BY cc.created_at
  LIMIT 1;

  IF v_contact_id IS NOT NULL THEN
    UPDATE app.client_contact cc
    SET auth_user_id = coalesce(cc.auth_user_id, p_auth_user_id)
    WHERE cc.id = v_contact_id;

    RETURN jsonb_build_object(
      'client_id', v_client_id,
      'contact_id', v_contact_id,
      'created_client', false
    );
  END IF;

  -- A client we already know, who is signing up instead of using their link.
  SELECT c.* INTO v_client
  FROM app.client c
  WHERE lower(c.email) = v_email
  ORDER BY c.created_at
  LIMIT 1;

  IF NOT FOUND THEN
    v_number := nextval('app.client_code_seq');
    v_code := p_code_prefix || '-C-' || lpad(v_number::text, 4, '0');

    INSERT INTO app.client (code, code_number, name, email, preferred_locale, self_registered)
    VALUES (v_code, v_number, coalesce(v_name, v_email), v_email,
            p_locale::app.locale, true)
    RETURNING * INTO v_client;

    -- The same two documents every client is asked for, so a self-registered file
    -- looks exactly like one the office created.
    INSERT INTO app.client_document (client_id, kind)
    VALUES (v_client.id, 'PASSPORT'), (v_client.id, 'PHOTO');

    v_made := true;
  END IF;

  INSERT INTO app.client_contact (client_id, auth_user_id, email)
  VALUES (v_client.id, p_auth_user_id, v_email)
  ON CONFLICT (client_id, email) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id
  RETURNING id INTO v_contact_id;

  -- An outstanding link for this client has been overtaken by events.
  UPDATE app.client_invite ci
  SET used_at = now()
  WHERE ci.client_id = v_client.id AND ci.used_at IS NULL;

  INSERT INTO app.event (actor_contact_id, client_id, action, payload)
  VALUES (v_contact_id, v_client.id,
          CASE WHEN v_made THEN 'client.self_registered' ELSE 'account.self_linked' END,
          jsonb_build_object('email', v_email));

  RETURN jsonb_build_object(
    'client_id', v_client.id,
    'contact_id', v_contact_id,
    'created_client', v_made
  );
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION app.client_register(text, uuid, text, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.client_register(text, uuid, text, text, text) TO app_server;--> statement-breakpoint
