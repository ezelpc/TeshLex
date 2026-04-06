-- prisma/migrations/20250315000000_init/migration.sql
-- TeshLex — Migración inicial completa
-- ─────────────────────────────────────────────────────────────────────────────
-- Esta migración la genera Prisma automáticamente con:
--   pnpm prisma migrate dev --name init
--
-- Si prefieres aplicarla manualmente en PostgreSQL, usa este archivo.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensiones ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- Full-text search con trigrams
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ── Wrapper IMMUTABLE para unaccent ──────────────────────────────────────────
-- unaccent() es STABLE por defecto; necesitamos un wrapper IMMUTABLE
-- para poder usarlo en expresiones de índice (GIN, etc.)
CREATE OR REPLACE FUNCTION f_unaccent(text)
  RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$func$
  SELECT public.unaccent('public.unaccent', $1)
$func$;

-- ── ENUMs ─────────────────────────────────────────────────────────────────────
CREATE TYPE "Role" AS ENUM (
  'STUDENT', 'TEACHER', 'ADMIN', 'SUPERADMIN'
);

CREATE TYPE "LanguageLevel" AS ENUM (
  'A1', 'A2', 'B1', 'B2', 'C1', 'C2'
);

CREATE TYPE "CourseModality" AS ENUM (
  'WEEKDAY', 'SATURDAY'
);

CREATE TYPE "CourseStatus" AS ENUM (
  'DRAFT', 'ACTIVE', 'FULL', 'FINISHED', 'CANCELLED'
);

CREATE TYPE "EnrollmentStatus" AS ENUM (
  'PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'DROPPED', 'EXPELLED'
);

CREATE TYPE "PaymentStatus" AS ENUM (
  'PENDING', 'APPROVED', 'REJECTED', 'REFUNDED', 'IN_PROCESS', 'CANCELLED', 'EXPIRED'
);

CREATE TYPE "PaymentType" AS ENUM (
  'ENROLLMENT_FEE', 'MONTHLY_FEE', 'MATERIAL_FEE', 'CERTIFICATION', 'LATE_FEE'
);

CREATE TYPE "DocumentType" AS ENUM (
  'BOLETA', 'CERTIFICATE', 'CONSTANCY'
);

CREATE TYPE "DocumentStatus" AS ENUM (
  'PENDING', 'RELEASED', 'REJECTED'
);

CREATE TYPE "NotificationChannel" AS ENUM (
  'EMAIL', 'SYSTEM'
);

CREATE TYPE "AuditAction" AS ENUM (
  'USER_LOGIN', 'USER_LOGOUT', 'USER_PASSWORD_CHANGED',
  'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED',
  'COURSE_CREATED', 'COURSE_UPDATED', 'COURSE_CANCELLED',
  'ENROLLMENT_CREATED', 'ENROLLMENT_ACTIVATED', 'ENROLLMENT_DROPPED',
  'ENROLLMENT_EXPELLED', 'ENROLLMENT_COMPLETED',
  'GRADES_SAVED',
  'PAYMENT_CREATED', 'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 'PAYMENT_REFUNDED',
  'DOCUMENT_RELEASED', 'DOCUMENT_REJECTED',
  'CONFIG_UPDATED'
);

-- ── TABLAS ────────────────────────────────────────────────────────────────────

-- users
CREATE TABLE "users" (
  "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
  "email"         VARCHAR(255) NOT NULL,
  "password"      VARCHAR(255) NOT NULL,
  "role"          "Role"       NOT NULL DEFAULT 'STUDENT',
  "isActive"      BOOLEAN      NOT NULL DEFAULT true,
  "emailVerified" BOOLEAN      NOT NULL DEFAULT false,
  "firstName"     VARCHAR(100) NOT NULL,
  "lastName"      VARCHAR(150) NOT NULL,
  "curp"          VARCHAR(18),
  "phone"         VARCHAR(15),
  "birthDate"     DATE,
  "avatarUrl"     VARCHAR(500),
  "lastLoginAt"   TIMESTAMPTZ,
  "lastLoginIp"   VARCHAR(45),
  "createdAt"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "users_pkey"        PRIMARY KEY ("id"),
  CONSTRAINT "users_email_key"   UNIQUE ("email"),
  CONSTRAINT "users_curp_key"    UNIQUE ("curp")
);

CREATE INDEX "users_email_idx"          ON "users" ("email");
CREATE INDEX "users_role_isactive_idx"  ON "users" ("role", "isActive");
CREATE INDEX "users_name_idx"           ON "users" ("firstName", "lastName");
-- Full-text search en nombre completo usando trigrams
-- NOTA: Usa f_unaccent() (wrapper IMMUTABLE) en lugar de unaccent() directamente,
-- ya que unaccent() es STABLE y PostgreSQL no permite funciones STABLE en índices.
CREATE INDEX "users_fulltext_idx"
  ON "users" USING GIN (
    to_tsvector('spanish', f_unaccent("firstName") || ' ' || f_unaccent("lastName"))
  );

-- student_profiles
CREATE TABLE "student_profiles" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "userId"    UUID         NOT NULL,
  "matricula" VARCHAR(20)  NOT NULL,
  "curp"      VARCHAR(18),
  "career"    VARCHAR(150) NOT NULL,
  "semester"  INTEGER      NOT NULL,
  "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "student_profiles_pkey"        PRIMARY KEY ("id"),
  CONSTRAINT "student_profiles_userId_key"  UNIQUE ("userId"),
  CONSTRAINT "student_profiles_matricula_key" UNIQUE ("matricula"),
  CONSTRAINT "student_profiles_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "student_profiles_semester_check"
    CHECK ("semester" BETWEEN 1 AND 12)
);

CREATE INDEX "student_profiles_matricula_idx" ON "student_profiles" ("matricula");

-- teacher_profiles
CREATE TABLE "teacher_profiles" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "userId"      UUID        NOT NULL,
  "specialties" TEXT[]      NOT NULL DEFAULT '{}',
  "bio"         TEXT,
  "maxStudents" INTEGER     NOT NULL DEFAULT 35,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "teacher_profiles_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "teacher_profiles_userId_key" UNIQUE ("userId"),
  CONSTRAINT "teacher_profiles_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "teacher_profiles_maxStudents_check"
    CHECK ("maxStudents" BETWEEN 1 AND 60)
);

-- system_config
CREATE TABLE "system_config" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "key"       VARCHAR(100) NOT NULL,
  "value"     TEXT         NOT NULL,
  "type"      VARCHAR(20)  NOT NULL,
  "label"     VARCHAR(200) NOT NULL,
  "updatedBy" UUID,
  "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "system_config_pkey"    PRIMARY KEY ("id"),
  CONSTRAINT "system_config_key_key" UNIQUE ("key"),
  CONSTRAINT "system_config_type_check"
    CHECK ("type" IN ('string', 'number', 'boolean', 'json'))
);

-- languages
CREATE TABLE "languages" (
  "id"        UUID        NOT NULL DEFAULT gen_random_uuid(),
  "name"      VARCHAR(80) NOT NULL,
  "code"      VARCHAR(5)  NOT NULL,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "languages_pkey"      PRIMARY KEY ("id"),
  CONSTRAINT "languages_name_key"  UNIQUE ("name"),
  CONSTRAINT "languages_code_key"  UNIQUE ("code")
);

-- school_cycles
CREATE TABLE "school_cycles" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "name"      VARCHAR(100) NOT NULL,
  "code"      VARCHAR(20)  NOT NULL,
  "startDate" DATE         NOT NULL,
  "endDate"   DATE         NOT NULL,
  "isActive"  BOOLEAN      NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "school_cycles_pkey"      PRIMARY KEY ("id"),
  CONSTRAINT "school_cycles_name_key"  UNIQUE ("name"),
  CONSTRAINT "school_cycles_code_key"  UNIQUE ("code"),
  CONSTRAINT "school_cycles_dates_check"
    CHECK ("endDate" > "startDate")
);

-- courses
CREATE TABLE "courses" (
  "id"                  UUID             NOT NULL DEFAULT gen_random_uuid(),
  "languageId"          UUID             NOT NULL,
  "level"               "LanguageLevel"  NOT NULL,
  "modality"            "CourseModality" NOT NULL,
  "status"              "CourseStatus"   NOT NULL DEFAULT 'DRAFT',
  "cycleId"             UUID,
  "scheduleDescription" VARCHAR(200)     NOT NULL,
  "startTime"           VARCHAR(5)       NOT NULL,
  "endTime"             VARCHAR(5)       NOT NULL,
  "startDate"           DATE             NOT NULL,
  "endDate"             DATE             NOT NULL,
  "daysOfWeek"          INTEGER[]        NOT NULL DEFAULT '{}',
  "maxStudents"         INTEGER          NOT NULL DEFAULT 35,
  "currentStudents"     INTEGER          NOT NULL DEFAULT 0,
  "enrollmentFee"       DECIMAL(10,2)    NOT NULL DEFAULT 1500.00,
  "monthlyFee"          DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
  "materialFee"         DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
  "teacherId"           UUID,
  "description"         TEXT,
  "notes"               TEXT,
  "createdAt"           TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT "courses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "courses_languageId_fkey"
    FOREIGN KEY ("languageId") REFERENCES "languages"("id"),
  CONSTRAINT "courses_cycleId_fkey"
    FOREIGN KEY ("cycleId")    REFERENCES "school_cycles"("id") ON DELETE SET NULL,
  CONSTRAINT "courses_teacherId_fkey"
    FOREIGN KEY ("teacherId")  REFERENCES "teacher_profiles"("id") ON DELETE SET NULL,
  CONSTRAINT "courses_students_check"
    CHECK ("currentStudents" >= 0 AND "currentStudents" <= "maxStudents"),
  CONSTRAINT "courses_dates_check"
    CHECK ("endDate" > "startDate"),
  CONSTRAINT "courses_fees_check"
    CHECK ("enrollmentFee" >= 0 AND "monthlyFee" >= 0 AND "materialFee" >= 0)
);

CREATE INDEX "courses_lang_level_status_idx" ON "courses" ("languageId", "level", "status");
CREATE INDEX "courses_teacher_status_idx"    ON "courses" ("teacherId", "status");
CREATE INDEX "courses_cycle_idx"             ON "courses" ("cycleId");
CREATE INDEX "courses_dates_idx"             ON "courses" ("startDate", "endDate");

-- evaluation_criteria
CREATE TABLE "evaluation_criteria" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "courseId"    UUID         NOT NULL,
  "name"        VARCHAR(100) NOT NULL,
  "percentage"  INTEGER      NOT NULL,
  "description" VARCHAR(300),
  "order"       INTEGER      NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "evaluation_criteria_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "evaluation_criteria_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE,
  CONSTRAINT "evaluation_criteria_name_course_key"
    UNIQUE ("courseId", "name"),
  CONSTRAINT "evaluation_criteria_percentage_check"
    CHECK ("percentage" BETWEEN 1 AND 100)
);

CREATE INDEX "evaluation_criteria_courseId_idx" ON "evaluation_criteria" ("courseId");

-- enrollments
CREATE TABLE "enrollments" (
  "id"              UUID               NOT NULL DEFAULT gen_random_uuid(),
  "studentId"       UUID               NOT NULL,
  "courseId"        UUID               NOT NULL,
  "status"          "EnrollmentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "isPreEnrollment" BOOLEAN            NOT NULL DEFAULT false,
  "preEnrolledAt"   TIMESTAMPTZ,
  "enrolledAt"      TIMESTAMPTZ,
  "completedAt"     TIMESTAMPTZ,
  "droppedAt"       TIMESTAMPTZ,
  "dropReason"      VARCHAR(500),
  "createdAt"       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

  CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "enrollments_studentId_courseId_key" UNIQUE ("studentId", "courseId"),
  CONSTRAINT "enrollments_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id"),
  CONSTRAINT "enrollments_courseId_fkey"
    FOREIGN KEY ("courseId")  REFERENCES "courses"("id")
);

CREATE INDEX "enrollments_course_status_idx"   ON "enrollments" ("courseId", "status");
CREATE INDEX "enrollments_student_status_idx"  ON "enrollments" ("studentId", "status");
CREATE INDEX "enrollments_status_created_idx"  ON "enrollments" ("status", "createdAt");

-- grades
CREATE TABLE "grades" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "enrollmentId"   UUID        NOT NULL,
  "teacherId"      UUID        NOT NULL,
  "criteriaGrades" JSONB       NOT NULL DEFAULT '[]',
  "finalGrade"     DECIMAL(4,2),
  "passed"         BOOLEAN,
  "observations"   TEXT,
  "gradedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "grades_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "grades_enrollmentId_key" UNIQUE ("enrollmentId"),
  CONSTRAINT "grades_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE,
  CONSTRAINT "grades_teacherId_fkey"
    FOREIGN KEY ("teacherId")    REFERENCES "teacher_profiles"("id"),
  CONSTRAINT "grades_finalGrade_check"
    CHECK ("finalGrade" IS NULL OR ("finalGrade" >= 0 AND "finalGrade" <= 10))
);

CREATE INDEX "grades_teacherId_idx" ON "grades" ("teacherId");
CREATE INDEX "grades_passed_idx"    ON "grades" ("passed");

-- attendances
CREATE TABLE "attendances" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "enrollmentId" UUID        NOT NULL,
  "date"         DATE        NOT NULL,
  "present"      BOOLEAN     NOT NULL,
  "notes"        VARCHAR(300),

  CONSTRAINT "attendances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attendances_enrollment_date_key" UNIQUE ("enrollmentId", "date"),
  CONSTRAINT "attendances_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE
);

CREATE INDEX "attendances_enrollment_date_idx" ON "attendances" ("enrollmentId", "date");

-- teacher_comments
CREATE TABLE "teacher_comments" (
  "id"        UUID        NOT NULL DEFAULT gen_random_uuid(),
  "teacherId" UUID        NOT NULL,
  "message"   TEXT        NOT NULL,
  "isRead"    BOOLEAN     NOT NULL DEFAULT false,
  "readAt"    TIMESTAMPTZ,
  "readById"  UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "teacher_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "teacher_comments_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "teacher_profiles"("id")
);

CREATE INDEX "teacher_comments_teacherId_idx"      ON "teacher_comments" ("teacherId");
CREATE INDEX "teacher_comments_isread_created_idx" ON "teacher_comments" ("isRead", "createdAt");

-- payments
CREATE TABLE "payments" (
  "id"                UUID           NOT NULL DEFAULT gen_random_uuid(),
  "studentId"         UUID           NOT NULL,
  "enrollmentId"      UUID,
  "type"              "PaymentType"  NOT NULL,
  "status"            "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amount"            DECIMAL(10,2)  NOT NULL,
  "currency"          VARCHAR(3)     NOT NULL DEFAULT 'MXN',
  "tax"               DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  "mpPreferenceId"    VARCHAR(100),
  "mpPaymentId"       VARCHAR(50),
  "mpStatus"          VARCHAR(50),
  "mpStatusDetail"    VARCHAR(100),
  "mpPaymentMethod"   VARCHAR(50),
  "mpExternalRef"     VARCHAR(100),
  "description"       VARCHAR(300),
  "metadata"          JSONB,
  "receiptUrl"        VARCHAR(500),
  "refundedAt"        TIMESTAMPTZ,
  "refundReason"      VARCHAR(500),
  "refundAmount"      DECIMAL(10,2),
  "webhookReceivedAt" TIMESTAMPTZ,
  "createdAt"         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT "payments_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "payments_mpPreferenceId_key" UNIQUE ("mpPreferenceId"),
  CONSTRAINT "payments_mpPaymentId_key"    UNIQUE ("mpPaymentId"),
  CONSTRAINT "payments_mpExternalRef_key"  UNIQUE ("mpExternalRef"),
  CONSTRAINT "payments_studentId_fkey"
    FOREIGN KEY ("studentId")    REFERENCES "student_profiles"("id"),
  CONSTRAINT "payments_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id"),
  CONSTRAINT "payments_amount_check"
    CHECK ("amount" > 0),
  CONSTRAINT "payments_tax_check"
    CHECK ("tax" >= 0)
);

CREATE INDEX "payments_student_status_idx"  ON "payments" ("studentId", "status");
CREATE INDEX "payments_enrollmentId_idx"    ON "payments" ("enrollmentId");
CREATE INDEX "payments_mpPaymentId_idx"     ON "payments" ("mpPaymentId");
CREATE INDEX "payments_status_created_idx"  ON "payments" ("status", "createdAt");

-- documents
CREATE TABLE "documents" (
  "id"           UUID             NOT NULL DEFAULT gen_random_uuid(),
  "studentId"    UUID             NOT NULL,
  "enrollmentId" UUID,
  "type"         "DocumentType"   NOT NULL,
  "status"       "DocumentStatus" NOT NULL DEFAULT 'PENDING',
  "fileUrl"      VARCHAR(500),
  "releasedAt"   TIMESTAMPTZ,
  "releasedById" UUID,
  "createdAt"    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT "documents_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "documents_enrollmentId_key" UNIQUE ("enrollmentId"),
  CONSTRAINT "documents_studentId_fkey"
    FOREIGN KEY ("studentId")    REFERENCES "student_profiles"("id"),
  CONSTRAINT "documents_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id")
);

CREATE INDEX "documents_student_status_idx" ON "documents" ("studentId", "status");
CREATE INDEX "documents_status_type_idx"    ON "documents" ("status", "type");

-- notifications
CREATE TABLE "notifications" (
  "id"         UUID                  NOT NULL DEFAULT gen_random_uuid(),
  "userId"     UUID                  NOT NULL,
  "channel"    "NotificationChannel" NOT NULL,
  "subject"    VARCHAR(200)          NOT NULL,
  "body"       TEXT                  NOT NULL,
  "isRead"     BOOLEAN               NOT NULL DEFAULT false,
  "readAt"     TIMESTAMPTZ,
  "sentAt"     TIMESTAMPTZ,
  "entityType" VARCHAR(50),
  "entityId"   UUID,
  "createdAt"  TIMESTAMPTZ           NOT NULL DEFAULT NOW(),

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "notifications_user_isread_idx"   ON "notifications" ("userId", "isRead");
CREATE INDEX "notifications_user_created_idx"  ON "notifications" ("userId", "createdAt");

-- audit_logs
CREATE TABLE "audit_logs" (
  "id"        UUID          NOT NULL DEFAULT gen_random_uuid(),
  "userId"    UUID,
  "action"    "AuditAction" NOT NULL,
  "entity"    VARCHAR(60)   NOT NULL,
  "entityId"  UUID,
  "oldValue"  JSONB,
  "newValue"  JSONB,
  "ipAddress" VARCHAR(45),
  "userAgent" VARCHAR(300),
  "createdAt" TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX "audit_logs_entity_idx"          ON "audit_logs" ("entity", "entityId");
CREATE INDEX "audit_logs_user_created_idx"    ON "audit_logs" ("userId", "createdAt");
CREATE INDEX "audit_logs_action_created_idx"  ON "audit_logs" ("action", "createdAt");

-- refresh_tokens
CREATE TABLE "refresh_tokens" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "userId"    UUID         NOT NULL,
  "token"     VARCHAR(500) NOT NULL,
  "expiresAt" TIMESTAMPTZ  NOT NULL,
  "revokedAt" TIMESTAMPTZ,
  "ipAddress" VARCHAR(45),
  "userAgent" VARCHAR(300),
  "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "refresh_tokens_pkey"      PRIMARY KEY ("id"),
  CONSTRAINT "refresh_tokens_token_key" UNIQUE ("token"),
  CONSTRAINT "refresh_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "refresh_tokens_userId_idx"    ON "refresh_tokens" ("userId");
CREATE INDEX "refresh_tokens_token_idx"     ON "refresh_tokens" ("token");
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens" ("expiresAt");
-- Índice parcial: solo tokens activos (no revocados) → la consulta más frecuente
CREATE INDEX "refresh_tokens_active_idx"
  ON "refresh_tokens" ("userId", "expiresAt")
  WHERE "revokedAt" IS NULL;

-- ── FUNCIONES Y TRIGGERS ──────────────────────────────────────────────────────

-- Trigger: actualiza updatedAt automáticamente en todas las tablas
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'student_profiles', 'teacher_profiles', 'system_config',
    'languages', 'school_cycles', 'courses', 'enrollments',
    'grades', 'payments', 'documents', 'notifications'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON "%s"
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      replace(t, '_', ''), t
    );
  END LOOP;
END;
$$;

-- Trigger: actualiza currentStudents en courses al activar/baja una inscripción
CREATE OR REPLACE FUNCTION sync_course_student_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Activación: incrementar
    IF NEW.status = 'ACTIVE' AND OLD.status != 'ACTIVE' THEN
      UPDATE "courses"
      SET "currentStudents" = "currentStudents" + 1
      WHERE "id" = NEW."courseId";
    END IF;
    -- Baja o expulsión: decrementar
    IF NEW.status IN ('DROPPED', 'EXPELLED') AND OLD.status = 'ACTIVE' THEN
      UPDATE "courses"
      SET "currentStudents" = GREATEST("currentStudents" - 1, 0)
      WHERE "id" = NEW."courseId";
    END IF;
    -- Actualizar status a FULL si llegó al máximo
    UPDATE "courses"
    SET "status" = CASE
      WHEN "currentStudents" >= "maxStudents" THEN 'FULL'::"CourseStatus"
      WHEN "status" = 'FULL' AND "currentStudents" < "maxStudents" THEN 'ACTIVE'::"CourseStatus"
      ELSE "status"
    END
    WHERE "id" = NEW."courseId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enrollments_sync_count
AFTER UPDATE ON "enrollments"
FOR EACH ROW EXECUTE FUNCTION sync_course_student_count();

-- Vista: resumen para el dashboard admin (evita JOIN costoso en cada carga)
CREATE OR REPLACE VIEW vw_dashboard_summary AS
SELECT
  (SELECT COUNT(*) FROM "student_profiles") AS total_students,
  (SELECT COUNT(*) FROM "teacher_profiles") AS total_teachers,
  (SELECT COUNT(*) FROM "enrollments" WHERE "status" = 'ACTIVE') AS active_enrollments,
  (SELECT COUNT(*) FROM "enrollments"
   WHERE "status" = 'DROPPED'
     AND "droppedAt" >= DATE_TRUNC('month', NOW())) AS drops_this_month,
  (SELECT COUNT(*) FROM "documents" WHERE "status" = 'PENDING') AS pending_documents,
  (SELECT COALESCE(SUM("amount"), 0) FROM "payments"
   WHERE "status" = 'APPROVED'
     AND "createdAt" >= DATE_TRUNC('month', NOW())) AS revenue_this_month,
  (SELECT COALESCE(SUM("amount"), 0) FROM "payments"
   WHERE "status" = 'APPROVED'
     AND "createdAt" >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
     AND "createdAt" <  DATE_TRUNC('month', NOW())) AS revenue_last_month;