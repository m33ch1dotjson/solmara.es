CREATE SCHEMA "app";
--> statement-breakpoint
CREATE TYPE "app"."client_status" AS ENUM('INVITED', 'ACTIVE', 'CLOSED');--> statement-breakpoint
CREATE TYPE "app"."document_kind" AS ENUM('PASSPORT', 'PHOTO');--> statement-breakpoint
CREATE TYPE "app"."document_status" AS ENUM('REQUIRED', 'RECEIVED', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "app"."locale" AS ENUM('en', 'nl', 'es');--> statement-breakpoint
CREATE TYPE "app"."staff_role" AS ENUM('ADMIN', 'STAFF');--> statement-breakpoint
CREATE SEQUENCE "app"."client_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "app"."client" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_number" bigint DEFAULT nextval('app.client_code_seq') NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"status" "app"."client_status" DEFAULT 'INVITED' NOT NULL,
	"preferred_locale" "app"."locale" DEFAULT 'en' NOT NULL,
	"phone" text,
	"date_of_birth" date,
	"nationality" text,
	"passport_number" text,
	"passport_expiry" date,
	"address_home_country" text,
	"address_spain" text,
	"internal_notes" text,
	"created_by" uuid,
	"details_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "app"."client_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"auth_user_id" uuid,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_contact_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
CREATE TABLE "app"."client_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"kind" "app"."document_kind" NOT NULL,
	"status" "app"."document_status" DEFAULT 'REQUIRED' NOT NULL,
	"storage_key" text,
	"mime_type" text,
	"size_bytes" integer,
	"uploaded_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"rejection_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."client_invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"token" text NOT NULL,
	"created_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_invite_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "app"."event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_staff_id" uuid,
	"actor_contact_id" uuid,
	"client_id" uuid,
	"action" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."property" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"address" text NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."property_photo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."sop" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."staff_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"role" "app"."staff_role" DEFAULT 'STAFF' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_user_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "staff_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "app"."client" ADD CONSTRAINT "client_created_by_staff_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_contact" ADD CONSTRAINT "client_contact_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_document" ADD CONSTRAINT "client_document_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_document" ADD CONSTRAINT "client_document_reviewed_by_staff_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "app"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_invite" ADD CONSTRAINT "client_invite_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_invite" ADD CONSTRAINT "client_invite_created_by_staff_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."event" ADD CONSTRAINT "event_actor_staff_id_staff_user_id_fk" FOREIGN KEY ("actor_staff_id") REFERENCES "app"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."event" ADD CONSTRAINT "event_actor_contact_id_client_contact_id_fk" FOREIGN KEY ("actor_contact_id") REFERENCES "app"."client_contact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."event" ADD CONSTRAINT "event_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."property" ADD CONSTRAINT "property_created_by_staff_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."property_photo" ADD CONSTRAINT "property_photo_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "app"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."sop" ADD CONSTRAINT "sop_created_by_staff_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_email_idx" ON "app"."client" USING btree ("email");--> statement-breakpoint
CREATE INDEX "client_status_idx" ON "app"."client" USING btree ("status");--> statement-breakpoint
CREATE INDEX "client_contact_client_idx" ON "app"."client_contact" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_contact_email_idx" ON "app"."client_contact" USING btree ("client_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "client_document_kind_idx" ON "app"."client_document" USING btree ("client_id","kind");--> statement-breakpoint
CREATE INDEX "client_document_status_idx" ON "app"."client_document" USING btree ("status");--> statement-breakpoint
CREATE INDEX "client_invite_client_idx" ON "app"."client_invite" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "event_client_idx" ON "app"."event" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "event_created_idx" ON "app"."event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "property_created_idx" ON "app"."property" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "property_photo_property_idx" ON "app"."property_photo" USING btree ("property_id","sort_order");--> statement-breakpoint
CREATE INDEX "sop_published_idx" ON "app"."sop" USING btree ("published","sort_order");--> statement-breakpoint
CREATE INDEX "staff_user_active_idx" ON "app"."staff_user" USING btree ("active");