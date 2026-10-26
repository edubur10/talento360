CREATE TYPE "public"."action_status" AS ENUM('PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."campaign_mode" AS ENUM('ANONIMA', 'CONFIDENCIAL');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('BORRADOR', 'ACTIVA', 'CERRADA');--> statement-breakpoint
CREATE TYPE "public"."close_type" AS ENUM('EFECTIVIDAD_VERIFICADA', 'ADMINISTRATIVO');--> statement-breakpoint
CREATE TYPE "public"."effectiveness_result" AS ENUM('EFECTIVA', 'PARCIALMENTE_EFECTIVA', 'NO_EFECTIVA');--> statement-breakpoint
CREATE TYPE "public"."escalation_channel" AS ENUM('NINGUNO', 'SST', 'CONVIVENCIA_LABORAL', 'SEGURIDAD_PACIENTE', 'CONTROL_INTERNO');--> statement-breakpoint
CREATE TYPE "public"."need_category" AS ENUM('CONDICIONES_TRABAJO', 'FORMACION_COMPETENCIAS', 'BIENESTAR_DESARROLLO', 'CARGA_ORGANIZACION', 'COMUNICACION', 'CULTURA_CLIMA', 'CICLO_VIDA_LABORAL', 'COMPENSACION_INCENTIVOS', 'DOCENCIA_SERVICIO', 'OTRA');--> statement-breakpoint
CREATE TYPE "public"."need_origin" AS ENUM('CAMPANA', 'REGISTRO_DIRECTO');--> statement-breakpoint
CREATE TYPE "public"."need_status" AS ENUM('RECIBIDA', 'CLASIFICADA', 'EN_ANALISIS', 'PRIORIZADA', 'ASIGNADA', 'EN_EJECUCION', 'RESPUESTA_EMITIDA', 'PENDIENTE_EFECTIVIDAD', 'CERRADA', 'REABIERTA');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('ESCALA', 'UNICA', 'MULTIPLE', 'TEXTO', 'SI_NO');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('COLABORADOR', 'LIDER_SERVICIO', 'TALENTO_HUMANO', 'CALIDAD', 'SST', 'GERENCIA', 'AUDITOR', 'ADMIN_TECNICO');--> statement-breakpoint
CREATE TABLE "actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"need_id" uuid NOT NULL,
	"description" text NOT NULL,
	"responsible_id" uuid,
	"start_date" timestamp with time zone,
	"due_date" timestamp with time zone NOT NULL,
	"verification_means" text NOT NULL,
	"resources" text,
	"status" "action_status" DEFAULT 'PROGRAMADA' NOT NULL,
	"evidence" text,
	"completed_at" timestamp with time zone,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" uuid,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"submission_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"value" jsonb,
	"not_applicable" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid,
	"actor_id" uuid,
	"actor_role" "role",
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"mode" "campaign_mode" NOT NULL,
	"status" "campaign_status" DEFAULT 'BORRADOR' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"eligible_count" integer,
	"created_by_id" uuid,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "effectiveness_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"need_id" uuid NOT NULL,
	"result" "effectiveness_result" NOT NULL,
	"method" text NOT NULL,
	"evidence" text NOT NULL,
	"notes" text,
	"reviewed_by_id" uuid NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employment_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"nit" text,
	"city" text,
	"slogan" text DEFAULT 'Tu voz transforma nuestra institución' NOT NULL,
	"primary_color" text DEFAULT '#1E5B4F' NOT NULL,
	"accent_color" text DEFAULT '#F2B33D' NOT NULL,
	"min_group_size" integer DEFAULT 5 NOT NULL,
	"response_days" integer DEFAULT 15 NOT NULL,
	"priority_weights" jsonb,
	"priority_approved_by" text,
	"priority_approved_at" timestamp with time zone,
	"indicator_targets" jsonb,
	"need_seq" integer DEFAULT 0 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "institutions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "need_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"need_id" uuid NOT NULL,
	"actor_id" uuid,
	"type" text NOT NULL,
	"from_status" "need_status",
	"to_status" "need_status",
	"note" text,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "needs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"code" text NOT NULL,
	"origin" "need_origin" NOT NULL,
	"campaign_id" uuid,
	"submission_id" uuid,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"reporter_id" uuid,
	"tracking_code_hash" text,
	"service_id" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"proposal" text,
	"category" "need_category" NOT NULL,
	"th1_criterion" integer,
	"affects_patient_safety" boolean DEFAULT false NOT NULL,
	"analysis" text,
	"impact" text,
	"scores" jsonb,
	"priority_score" double precision,
	"priority" "priority",
	"priority_method" text,
	"priority_approved_by_id" uuid,
	"priority_approved_at" timestamp with time zone,
	"is_urgent" boolean DEFAULT false NOT NULL,
	"escalation" "escalation_channel" DEFAULT 'NINGUNO' NOT NULL,
	"status" "need_status" DEFAULT 'RECIBIDA' NOT NULL,
	"assigned_to_id" uuid,
	"due_date" timestamp with time zone,
	"resources_required" text,
	"response" text,
	"responded_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"close_type" "close_type",
	"close_justification" text,
	"group_parent_id" uuid,
	"publish_improvement" boolean DEFAULT false NOT NULL,
	"public_summary" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"section" text NOT NULL,
	"code" text NOT NULL,
	"text" text NOT NULL,
	"help" text,
	"type" "question_type" NOT NULL,
	"options" jsonb,
	"required" boolean DEFAULT false NOT NULL,
	"allow_na" boolean DEFAULT true NOT NULL,
	"th1_criterion" integer,
	"category" "need_category",
	"show_if_code" text,
	"show_if_values" jsonb,
	"only_for_employment_codes" jsonb
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"site_id" uuid,
	"name" text NOT NULL,
	"kind" text DEFAULT 'ASISTENCIAL' NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"institution_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid,
	"employment_type_id" uuid,
	"service_id" uuid,
	"submitted_on" date NOT NULL,
	"tracking_code_hash" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	CONSTRAINT "submissions_tracking_code_hash_unique" UNIQUE("tracking_code_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"service_id" uuid,
	"employment_type_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_need_id_needs_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."needs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_responsible_id_users_id_fk" FOREIGN KEY ("responsible_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effectiveness_reviews" ADD CONSTRAINT "effectiveness_reviews_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effectiveness_reviews" ADD CONSTRAINT "effectiveness_reviews_need_id_needs_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."needs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effectiveness_reviews" ADD CONSTRAINT "effectiveness_reviews_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment_types" ADD CONSTRAINT "employment_types_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need_events" ADD CONSTRAINT "need_events_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need_events" ADD CONSTRAINT "need_events_need_id_needs_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."needs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need_events" ADD CONSTRAINT "need_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "needs" ADD CONSTRAINT "needs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "needs" ADD CONSTRAINT "needs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "needs" ADD CONSTRAINT "needs_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "needs" ADD CONSTRAINT "needs_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "needs" ADD CONSTRAINT "needs_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "needs" ADD CONSTRAINT "needs_priority_approved_by_id_users_id_fk" FOREIGN KEY ("priority_approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "needs" ADD CONSTRAINT "needs_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_employment_type_id_employment_types_id_fk" FOREIGN KEY ("employment_type_id") REFERENCES "public"."employment_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_employment_type_id_employment_types_id_fk" FOREIGN KEY ("employment_type_id") REFERENCES "public"."employment_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actions_inst_status_due" ON "actions" USING btree ("institution_id","status","due_date");--> statement-breakpoint
CREATE INDEX "answers_question" ON "answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "audit_inst_date" ON "audit_logs" USING btree ("institution_id","created_at");--> statement-breakpoint
CREATE INDEX "campaigns_inst_status" ON "campaigns" USING btree ("institution_id","status");--> statement-breakpoint
CREATE INDEX "reviews_inst_date" ON "effectiveness_reviews" USING btree ("institution_id","reviewed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "emp_inst_code" ON "employment_types" USING btree ("institution_id","code");--> statement-breakpoint
CREATE INDEX "need_events_need" ON "need_events" USING btree ("need_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "needs_inst_code" ON "needs" USING btree ("institution_id","code");--> statement-breakpoint
CREATE INDEX "needs_inst_status" ON "needs" USING btree ("institution_id","status");--> statement-breakpoint
CREATE INDEX "needs_inst_category" ON "needs" USING btree ("institution_id","category");--> statement-breakpoint
CREATE INDEX "needs_tracking" ON "needs" USING btree ("tracking_code_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_campaign_code" ON "questions" USING btree ("campaign_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "services_inst_name" ON "services" USING btree ("institution_id","name");--> statement-breakpoint
CREATE INDEX "sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sites_inst_name" ON "sites" USING btree ("institution_id","name");--> statement-breakpoint
CREATE INDEX "submissions_inst_campaign" ON "submissions" USING btree ("institution_id","campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_campaign_user" ON "submissions" USING btree ("campaign_id","user_id");--> statement-breakpoint
CREATE INDEX "users_inst_role" ON "users" USING btree ("institution_id","role");