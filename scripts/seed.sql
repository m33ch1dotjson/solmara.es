-- Seed data.
--
-- The people and cases from the design handoff, as real rows. Fixed UUIDs so the
-- script is idempotent: running it twice changes nothing, which matters because it
-- will be run twice.
--
-- Run as the admin connection (postgres), not as app_server — seeding is exactly the
-- kind of thing RLS is meant to stop an application from doing.

BEGIN;

-- ------------------------------------------------------------------- the team

INSERT INTO app.staff_user (id, email, name, initials, title, role) VALUES
  ('11111111-0000-4000-8000-000000000001', 'nuria@example.invalid',  'Núria Camps',    'NC', 'Case manager · Málaga',   'CASE_MANAGER'),
  ('11111111-0000-4000-8000-000000000002', 'pau@example.invalid',    'Pau Ribó',       'PR', 'Case manager · Estepona', 'CASE_MANAGER'),
  ('11111111-0000-4000-8000-000000000003', 'lucia@example.invalid',  'Lucía Márquez',  'LM', 'Case manager · Marbella', 'CASE_MANAGER'),
  ('11111111-0000-4000-8000-000000000004', 'admin@example.invalid',  'Romara',         'RO', 'Admin · Marbella',        'ADMIN')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------- the services

INSERT INTO app.service (id, slug, category, internal_name, display_name) VALUES
  ('22222222-0000-4000-8000-000000000001', 'nie-application', 'SERVICES',
   'NIE Application',
   '{"en":"Spanish NIE number","nl":"Spaans NIE-nummer","es":"Número NIE"}'::jsonb),
  ('22222222-0000-4000-8000-000000000002', 'property-purchase', 'REAL_ESTATE',
   'Property Purchase',
   '{"en":"Buying your home","nl":"Uw woning kopen","es":"La compra de su vivienda"}'::jsonb),
  ('22222222-0000-4000-8000-000000000003', 'mortgage-assistance', 'REAL_ESTATE',
   'Mortgage Assistance',
   '{"en":"Mortgage","nl":"Hypotheek","es":"Hipoteca"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- The template holds the workflow as data. Stages carry both the internal key and
-- the sentence the client reads, so no screen has to invent wording.
INSERT INTO app.service_template
  (id, service_id, version, expected_duration_days, default_price_cents, published_at, definition)
VALUES (
  '33333333-0000-4000-8000-000000000001',
  '22222222-0000-4000-8000-000000000001',
  3, 35, 45000, now(),
  '{
    "stages": [
      {"key":"INTAKE","label":"Intake","slaDays":2,"clientVisible":true,"progressWeight":10,
       "clientLabel":{"en":"We received your request","nl":"Wij hebben uw aanvraag ontvangen","es":"Hemos recibido su solicitud"},
       "clientMeta":{"en":"Finished on 28 August","nl":"Afgerond op 28 augustus","es":"Finalizado el 28 de agosto"}},
      {"key":"WAITING_FOR_DOCS","label":"Docs collected","slaDays":10,"clientVisible":true,"progressWeight":30,
       "clientLabel":{"en":"We collected your documents","nl":"Wij hebben uw documenten verzameld","es":"Hemos reunido sus documentos"},
       "clientMeta":{"en":"Finished on 5 September","nl":"Afgerond op 5 september","es":"Finalizado el 5 de septiembre"}},
      {"key":"APPOINTMENT_SET","label":"Appointment booked","slaDays":null,"clientVisible":true,"progressWeight":20,
       "clientLabel":{"en":"Your appointment","nl":"Uw afspraak","es":"Su cita"},
       "clientMeta":{"en":"Booked for 24 September, in Málaga","nl":"Gepland op 24 september, in Málaga","es":"Programada para el 24 de septiembre, en Málaga"}},
      {"key":"WAITING_AUTHORITY","label":"Submitted","slaDays":10,"clientVisible":true,"progressWeight":30,
       "clientLabel":{"en":"The authorities review your application","nl":"De autoriteiten beoordelen uw aanvraag","es":"Las autoridades revisan su solicitud"},
       "clientMeta":{"en":"Usually two to four weeks after the appointment","nl":"Meestal twee tot vier weken na de afspraak","es":"Normalmente de dos a cuatro semanas después de la cita"}},
      {"key":"COMPLETED","label":"Issued","slaDays":null,"clientVisible":true,"progressWeight":10,
       "clientLabel":{"en":"Your NIE number is issued","nl":"Uw NIE-nummer wordt afgegeven","es":"Se emite su número NIE"},
       "clientMeta":{"en":"We send the certificate here and by email","nl":"Wij sturen het certificaat hierheen en per e-mail","es":"Le enviamos el certificado aquí y por correo"}}
    ],
    "automations": [
      {"on":"document.status_changed","if":"all_required_documents_approved",
       "then":[{"advance_stage_to":"DOCS_COMPLETE"},
               {"create_task":"Review complete file","assign":"case.assignee","due_in_days":2},
               {"notify_slack":"docs_complete"}],
       "once_per":"case"}
    ]
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------ the client

INSERT INTO app.client (
  id, code, name, status, email, phone, whatsapp, preferred_locale,
  date_of_birth, nationality, marital_status, passport_number, passport_expiry,
  address_home_country, address_spain, context, lead_source, assigned_to, internal_notes
) VALUES (
  '44444444-0000-4000-8000-000000000001',
  'SM-C-0021', 'Maartje de Vries', 'ACTIVE',
  'm.devries@example.invalid', '+31 6 21 44 09 87', '+31 6 21 44 09 87', 'nl',
  '1984-03-11', 'Dutch', 'Married', 'NX4821993', '2031-04-30',
  'Rozengracht 118, 1016 NH Amsterdam, Netherlands',
  'Calle Ancha 12, 3ºB, 29601 Marbella',
  'Dutch national · relocating to Marbella · prefers Dutch',
  'website enquiry',
  '11111111-0000-4000-8000-000000000001',
  'Partner travels for work; schedule calls after 17:00 where possible.'
) ON CONFLICT (id) DO NOTHING;

-- The person who signs in. Separate from the client because a purchase usually has
-- two buyers and both want to follow it.
INSERT INTO app.client_contact (id, client_id, name, email, preferred_locale) VALUES
  ('55555555-0000-4000-8000-000000000001', '44444444-0000-4000-8000-000000000001',
   'Maartje de Vries', 'm.devries@example.invalid', 'nl')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------- the cases

INSERT INTO app."case"
  (id, code, client_id, service_id, template_id, stage_key, assignee_id, next_action, due_date)
VALUES
  ('66666666-0000-4000-8000-000000000001', 'ES-2481',
   '44444444-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001',
   '33333333-0000-4000-8000-000000000001', 'APPOINTMENT_SET',
   '11111111-0000-4000-8000-000000000001', 'Review padrón + tasa receipt', current_date),
  ('66666666-0000-4000-8000-000000000002', 'ES-2483',
   '44444444-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000002',
   '33333333-0000-4000-8000-000000000001', 'WAITING_FOR_DOCS',
   '11111111-0000-4000-8000-000000000001', 'Nota simple ordered', current_date + 17),
  ('66666666-0000-4000-8000-000000000003', 'ES-2490',
   '44444444-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000003',
   '33333333-0000-4000-8000-000000000001', 'INTAKE',
   '11111111-0000-4000-8000-000000000002', 'Awaiting income proof', current_date + 23)
ON CONFLICT (id) DO NOTHING;

-- Access is per person and per case, never derived from the client record.
INSERT INTO app.case_access (case_id, contact_id, granted_by)
SELECT c.id, '55555555-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001'
FROM app."case" c
WHERE c.client_id = '44444444-0000-4000-8000-000000000001'
ON CONFLICT (case_id, contact_id) DO NOTHING;

-- --------------------------------------------------------------- the documents

-- One passport serves three cases. That is the point of hanging documents off the
-- client rather than the case.
INSERT INTO app.client_document
  (id, client_id, key, name, status, version, available_to_client, expires_at, uploaded_at, reviewed_by, reviewed_at)
VALUES
  ('77777777-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000001','passport_copy',
   'Passport — photo page','APPROVED',1,true,'2031-04-30', now() - interval '16 days',
   '11111111-0000-4000-8000-000000000001', now() - interval '16 days'),
  ('77777777-0000-4000-8000-000000000002','44444444-0000-4000-8000-000000000001','proof_of_address',
   'Proof of address (Netherlands)','APPROVED',1,true,NULL, now() - interval '14 days',
   '11111111-0000-4000-8000-000000000002', now() - interval '14 days'),
  ('77777777-0000-4000-8000-000000000003','44444444-0000-4000-8000-000000000001','ex15_signed',
   'EX-15 form, signed','APPROVED',1,true,NULL, now() - interval '16 days',
   '11111111-0000-4000-8000-000000000001', now() - interval '16 days'),
  ('77777777-0000-4000-8000-000000000004','44444444-0000-4000-8000-000000000001','padron_certificate',
   'Padrón certificate','RECEIVED',1,false,'2026-12-15', now() - interval '3 days', NULL, NULL),
  ('77777777-0000-4000-8000-000000000005','44444444-0000-4000-8000-000000000001','tasa_790_012_receipt',
   'Tasa 790-012 payment receipt','RECEIVED',2,false,NULL, now() - interval '2 days', NULL, NULL),
  ('77777777-0000-4000-8000-000000000006','44444444-0000-4000-8000-000000000001','passport_photo',
   'Passport-size photo','REJECTED',1,false,NULL, now() - interval '7 days',
   '11111111-0000-4000-8000-000000000001', now() - interval '7 days'),
  ('77777777-0000-4000-8000-000000000007','44444444-0000-4000-8000-000000000001','proof_of_funds',
   'Proof of funds or employment contract','REQUIRED',1,false,NULL, NULL, NULL, NULL),
  ('77777777-0000-4000-8000-000000000008','44444444-0000-4000-8000-000000000001','appointment_slip',
   'Empadronamiento appointment slip','REQUIRED',1,false,NULL, NULL, NULL, NULL),
  ('77777777-0000-4000-8000-000000000009','44444444-0000-4000-8000-000000000001','power_of_attorney',
   'Power of attorney','REQUIRED',1,false,NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

UPDATE app.client_document
SET rejection_reason = 'Unreadable or cropped',
    rejection_note   = 'The background is grey; the Spanish authorities need plain white.'
WHERE id = '77777777-0000-4000-8000-000000000006';

-- Reusable documents are linked to all three cases; the NIE-specific ones to one.
INSERT INTO app.document_case (document_id, case_id)
SELECT d.id, c.id
FROM app.client_document d
CROSS JOIN app."case" c
WHERE d.client_id = '44444444-0000-4000-8000-000000000001'
  AND c.client_id = '44444444-0000-4000-8000-000000000001'
  AND (
    d.key IN ('passport_copy', 'proof_of_address')
    OR c.code = 'ES-2481'
  )
ON CONFLICT (document_id, case_id) DO NOTHING;

-- ------------------------------------------------------- tasks, diary, money

INSERT INTO app.task (id, case_id, title, assignee_id, due_date, done_at, done_by) VALUES
  ('88888888-0000-4000-8000-000000000001','66666666-0000-4000-8000-000000000001',
   'Check padrón address matches the rental contract','11111111-0000-4000-8000-000000000001', current_date, NULL, NULL),
  ('88888888-0000-4000-8000-000000000002','66666666-0000-4000-8000-000000000001',
   'Confirm cita previa time with client by phone','11111111-0000-4000-8000-000000000001', current_date + 1, NULL, NULL),
  ('88888888-0000-4000-8000-000000000003','66666666-0000-4000-8000-000000000001',
   'Pay tasa 790-012 on client behalf','11111111-0000-4000-8000-000000000002', current_date - 1,
   now() - interval '1 day', '11111111-0000-4000-8000-000000000002'),
  ('88888888-0000-4000-8000-000000000004','66666666-0000-4000-8000-000000000001',
   'Send welcome pack in Dutch','11111111-0000-4000-8000-000000000003', current_date - 20,
   now() - interval '20 days', '11111111-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO app.appointment (id, case_id, kind, starts_at, place, address, bring) VALUES
  ('99999999-0000-4000-8000-000000000001','66666666-0000-4000-8000-000000000001',
   'cita_previa', '2026-09-24 09:40:00+02',
   'National Police station, foreigners office',
   'Avenida de la Rosaleda 19, Málaga',
   '{"en":["Your passport, the original","The printed application form we emailed you","The payment receipt for the government fee"],
     "nl":["Uw paspoort, het origineel","Het geprinte aanvraagformulier dat wij u hebben gemaild","Het betaalbewijs van de overheidsheffing"],
     "es":["Su pasaporte, el original","El formulario de solicitud impreso que le enviamos","El justificante de pago de la tasa"]}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO app.payment (id, case_id, label, meta, amount_cents, status, advanced, paid_at) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001','66666666-0000-4000-8000-000000000001',
   '{"en":"Our fee for the NIE service","nl":"Ons tarief voor de NIE-aanvraag","es":"Nuestros honorarios por el NIE"}'::jsonb,
   '{"en":"Paid on 30 August","nl":"Betaald op 30 augustus","es":"Pagado el 30 de agosto"}'::jsonb,
   45000, 'PAID', false, now() - interval '20 days'),
  ('aaaaaaaa-0000-4000-8000-000000000002','66666666-0000-4000-8000-000000000001',
   '{"en":"Government fee","nl":"Overheidsheffing","es":"Tasa oficial"}'::jsonb,
   '{"en":"We paid this for you","nl":"Door ons voorgeschoten","es":"La adelantamos por usted"}'::jsonb,
   984, 'OUTSTANDING', true, NULL)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------- history

INSERT INTO app.event (id, actor_staff_id, case_id, client_id, action, payload) VALUES
  ('bbbbbbbb-0000-4000-8000-000000000001', NULL,
   '66666666-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000001',
   'case.created', '{"source":"website enquiry"}'::jsonb),
  ('bbbbbbbb-0000-4000-8000-000000000002','11111111-0000-4000-8000-000000000001',
   '66666666-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000001',
   'appointment.booked', '{"when":"2026-09-24T09:40:00+02:00","where":"Comisaría Málaga"}'::jsonb),
  ('bbbbbbbb-0000-4000-8000-000000000003','11111111-0000-4000-8000-000000000001',
   '66666666-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000001',
   'document.status_changed', '{"document":"passport_photo","to":"REJECTED","reason":"background not plain white"}'::jsonb),
  ('bbbbbbbb-0000-4000-8000-000000000004', NULL,
   '66666666-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000001',
   'email.sent', '{"template":"document_reminder","locale":"nl","attempt":2}'::jsonb),
  ('bbbbbbbb-0000-4000-8000-000000000005', NULL,
   '66666666-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000001',
   'document.received', '{"document":"tasa_790_012_receipt","version":2}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Keep the sequences ahead of the codes seeded above, so the next real client is
-- not handed SM-C-0001 while SM-C-0021 already exists.
SELECT setval('app.client_code_seq', GREATEST(21, (SELECT COALESCE(MAX(code_number), 1) FROM app.client)));
SELECT setval('app.case_code_seq',   GREATEST(2490, (SELECT COALESCE(MAX(code_number), 1) FROM app."case")));

COMMIT;
