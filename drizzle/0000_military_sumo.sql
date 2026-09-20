CREATE SCHEMA "app";
--> statement-breakpoint
CREATE TYPE "app"."client_status" AS ENUM('ACTIVE', 'DORMANT', 'CLOSED');--> statement-breakpoint
CREATE TYPE "app"."document_status" AS ENUM('REQUIRED', 'RECEIVED', 'APPROVED', 'REJECTED', 'EXPIRED', 'WAIVED');--> statement-breakpoint
CREATE TYPE "app"."locale" AS ENUM('en', 'nl', 'es');--> statement-breakpoint
CREATE TYPE "app"."payment_status" AS ENUM('OUTSTANDING', 'PAID', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "app"."service_category" AS ENUM('REAL_ESTATE', 'SERVICES');--> statement-breakpoint
CREATE TYPE "app"."staff_role" AS ENUM('ADMIN', 'CASE_MANAGER', 'VIEWER');--> statement-breakpoint
CREATE SEQUENCE "app"."case_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "app"."client_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "app"."appointment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"place" text,
	"address" text,
	"bring" jsonb,
	"calendar_event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."case_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"granted_by" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_number" bigint DEFAULT nextval('app.case_code_seq') NOT NULL,
	"code" text NOT NULL,
	"client_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"stage_key" text NOT NULL,
	"stage_entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"on_hold_reason" text,
	"assignee_id" uuid,
	"next_action" text,
	"due_date" date,
	"priority" integer DEFAULT 0 NOT NULL,
	"linked_case_id" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "app"."client" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_number" bigint DEFAULT nextval('app.client_code_seq') NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" "app"."client_status" DEFAULT 'ACTIVE' NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"whatsapp" text,
	"preferred_locale" "app"."locale" DEFAULT 'en' NOT NULL,
	"date_of_birth" date,
	"nationality" text,
	"marital_status" text,
	"passport_number" text,
	"passport_expiry" date,
	"nie_number" text,
	"nuss_number" text,
	"sip_number" text,
	"address_home_country" text,
	"address_spain" text,
	"context" text,
	"lead_source" text,
	"assigned_to" uuid,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "app"."client_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"auth_user_id" uuid,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"preferred_locale" "app"."locale" DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_contact_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
CREATE TABLE "app"."client_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"status" "app"."document_status" DEFAULT 'REQUIRED' NOT NULL,
	"storage_key" text,
	"mime_type" text,
	"size_bytes" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"replaces_id" uuid,
	"expires_at" date,
	"rejection_reason" text,
	"rejection_note" text,
	"uploaded_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"available_to_client" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."document_case" (
	"document_id" uuid NOT NULL,
	"case_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."document_requirement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"expires_after_days" integer,
	"help_text" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_staff_id" uuid,
	"actor_contact_id" uuid,
	"case_id" uuid,
	"client_id" uuid,
	"action" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."intake_submission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "intake_submission_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "app"."outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"label" jsonb NOT NULL,
	"meta" jsonb,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" "app"."payment_status" DEFAULT 'OUTSTANDING' NOT NULL,
	"advanced" boolean DEFAULT false NOT NULL,
	"stripe_id" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."service" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"category" "app"."service_category" NOT NULL,
	"internal_name" text NOT NULL,
	"display_name" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "app"."service_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"definition" jsonb NOT NULL,
	"expected_duration_days" integer,
	"default_price_cents" integer,
	"default_currency" text DEFAULT 'EUR' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."staff_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"role" "app"."staff_role" DEFAULT 'CASE_MANAGER' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_user_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
CREATE TABLE "app"."task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"title" text NOT NULL,
	"assignee_id" uuid,
	"due_date" date,
	"blocking" boolean DEFAULT false NOT NULL,
	"done_at" timestamp with time zone,
	"done_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."appointment" ADD CONSTRAINT "appointment_case_id_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."case_access" ADD CONSTRAINT "case_access_case_id_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."case_access" ADD CONSTRAINT "case_access_contact_id_client_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "app"."client_contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."case_access" ADD CONSTRAINT "case_access_granted_by_staff_user_id_fk" FOREIGN KEY ("granted_by") REFERENCES "app"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."case" ADD CONSTRAINT "case_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."client"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."case" ADD CONSTRAINT "case_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "app"."service"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."case" ADD CONSTRAINT "case_template_id_service_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "app"."service_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."case" ADD CONSTRAINT "case_assignee_id_staff_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "app"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client" ADD CONSTRAINT "client_assigned_to_staff_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "app"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_contact" ADD CONSTRAINT "client_contact_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_document" ADD CONSTRAINT "client_document_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_document" ADD CONSTRAINT "client_document_reviewed_by_staff_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "app"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."document_case" ADD CONSTRAINT "document_case_document_id_client_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "app"."client_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."document_case" ADD CONSTRAINT "document_case_case_id_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."document_requirement" ADD CONSTRAINT "document_requirement_case_id_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."event" ADD CONSTRAINT "event_actor_staff_id_staff_user_id_fk" FOREIGN KEY ("actor_staff_id") REFERENCES "app"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."event" ADD CONSTRAINT "event_actor_contact_id_client_contact_id_fk" FOREIGN KEY ("actor_contact_id") REFERENCES "app"."client_contact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."event" ADD CONSTRAINT "event_case_id_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."event" ADD CONSTRAINT "event_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."intake_submission" ADD CONSTRAINT "intake_submission_case_id_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment" ADD CONSTRAINT "payment_case_id_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."service_template" ADD CONSTRAINT "service_template_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "app"."service"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."task" ADD CONSTRAINT "task_case_id_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "app"."case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."task" ADD CONSTRAINT "task_assignee_id_staff_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "app"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."task" ADD CONSTRAINT "task_done_by_staff_user_id_fk" FOREIGN KEY ("done_by") REFERENCES "app"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_case_idx" ON "app"."appointment" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "appointment_starts_idx" ON "app"."appointment" USING btree ("starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "case_access_pair_idx" ON "app"."case_access" USING btree ("case_id","contact_id");--> statement-breakpoint
CREATE INDEX "case_access_contact_idx" ON "app"."case_access" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "case_client_idx" ON "app"."case" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "case_assignee_idx" ON "app"."case" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "case_stage_idx" ON "app"."case" USING btree ("stage_key");--> statement-breakpoint
CREATE INDEX "case_due_idx" ON "app"."case" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "client_assigned_idx" ON "app"."client" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "client_email_idx" ON "app"."client" USING btree ("email");--> statement-breakpoint
CREATE INDEX "client_contact_client_idx" ON "app"."client_contact" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_contact_email_idx" ON "app"."client_contact" USING btree ("client_id","email");--> statement-breakpoint
CREATE INDEX "client_document_client_idx" ON "app"."client_document" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "client_document_status_idx" ON "app"."client_document" USING btree ("status");--> statement-breakpoint
CREATE INDEX "client_document_expiry_idx" ON "app"."client_document" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "document_case_pair_idx" ON "app"."document_case" USING btree ("document_id","case_id");--> statement-breakpoint
CREATE INDEX "document_case_case_idx" ON "app"."document_case" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_requirement_key_idx" ON "app"."document_requirement" USING btree ("case_id","key");--> statement-breakpoint
CREATE INDEX "event_case_idx" ON "app"."event" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "event_client_idx" ON "app"."event" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "event_action_idx" ON "app"."event" USING btree ("action");--> statement-breakpoint
CREATE INDEX "event_created_idx" ON "app"."event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "intake_case_idx" ON "app"."intake_submission" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_idempotency_idx" ON "app"."outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "outbox_pending_idx" ON "app"."outbox" USING btree ("processed_at","available_at");--> statement-breakpoint
CREATE INDEX "payment_case_idx" ON "app"."payment" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_template_version_idx" ON "app"."service_template" USING btree ("service_id","version");--> statement-breakpoint
CREATE INDEX "staff_user_active_idx" ON "app"."staff_user" USING btree ("active");--> statement-breakpoint
CREATE INDEX "task_case_idx" ON "app"."task" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "task_assignee_idx" ON "app"."task" USING btree ("assignee_id");