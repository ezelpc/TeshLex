-- CreateEnum
CREATE TYPE "StudentCategory" AS ENUM ('INTERNAL', 'EXTERNAL', 'PAE', 'TEACHER');

-- DropView: must drop before altering columns it depends on
DROP VIEW IF EXISTS vw_dashboard_summary;

-- DropForeignKey
ALTER TABLE "attendances" DROP CONSTRAINT "attendances_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_cycleId_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_languageId_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_studentId_fkey";

-- DropForeignKey
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_courseId_fkey";

-- DropForeignKey
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_studentId_fkey";

-- DropForeignKey
ALTER TABLE "evaluation_criteria" DROP CONSTRAINT "evaluation_criteria_courseId_fkey";

-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_studentId_fkey";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_userId_fkey";

-- DropForeignKey
ALTER TABLE "student_profiles" DROP CONSTRAINT "student_profiles_userId_fkey";

-- DropForeignKey
ALTER TABLE "teacher_comments" DROP CONSTRAINT "teacher_comments_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "teacher_profiles" DROP CONSTRAINT "teacher_profiles_userId_fkey";

-- DropIndex
DROP INDEX "courses_dates_idx";

-- AlterTable
ALTER TABLE "attendances" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "classroom" VARCHAR(100),
ADD COLUMN     "meetingLink" VARCHAR(500),
ADD COLUMN     "price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "pricingConfig" JSONB,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "daysOfWeek" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "documents" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "releasedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "enrollments" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "preEnrolledAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "enrolledAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "droppedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "evaluation_criteria" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "grades" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "criteriaGrades" DROP DEFAULT,
ALTER COLUMN "gradedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "jti_blacklist" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "languages" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "readAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "sentAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "mpPreferenceId" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "mpPaymentId" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "mpStatusDetail" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "mpExternalRef" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "refundedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "webhookReceivedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "revokedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "school_cycles" ADD COLUMN     "enrollmentEnd" TIMESTAMP(3),
ADD COLUMN     "enrollmentStart" TIMESTAMP(3),
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "category" "StudentCategory" NOT NULL DEFAULT 'INTERNAL',
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "system_config" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "teacher_comments" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "readAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "teacher_profiles" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "specialties" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "lastLoginAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_profiles" ADD CONSTRAINT "teacher_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "school_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_criteria" ADD CONSTRAINT "evaluation_criteria_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_comments" ADD CONSTRAINT "teacher_comments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "attendances_enrollment_date_idx" RENAME TO "attendances_enrollmentId_date_idx";

-- RenameIndex
ALTER INDEX "attendances_enrollment_date_key" RENAME TO "attendances_enrollmentId_date_key";

-- RenameIndex
ALTER INDEX "audit_logs_action_created_idx" RENAME TO "audit_logs_action_createdAt_idx";

-- RenameIndex
ALTER INDEX "audit_logs_entity_idx" RENAME TO "audit_logs_entity_entityId_idx";

-- RenameIndex
ALTER INDEX "audit_logs_user_created_idx" RENAME TO "audit_logs_userId_createdAt_idx";

-- RenameIndex
ALTER INDEX "courses_cycle_idx" RENAME TO "courses_cycleId_idx";

-- RenameIndex
ALTER INDEX "courses_lang_level_status_idx" RENAME TO "courses_languageId_level_status_idx";

-- RenameIndex
ALTER INDEX "courses_teacher_status_idx" RENAME TO "courses_teacherId_status_idx";

-- RenameIndex
ALTER INDEX "documents_student_status_idx" RENAME TO "documents_studentId_status_idx";

-- RenameIndex
ALTER INDEX "enrollments_course_status_idx" RENAME TO "enrollments_courseId_status_idx";

-- RenameIndex
ALTER INDEX "enrollments_status_created_idx" RENAME TO "enrollments_status_createdAt_idx";

-- RenameIndex
ALTER INDEX "enrollments_student_status_idx" RENAME TO "enrollments_studentId_status_idx";

-- RenameIndex
ALTER INDEX "evaluation_criteria_name_course_key" RENAME TO "evaluation_criteria_courseId_name_key";

-- RenameIndex
ALTER INDEX "notifications_user_created_idx" RENAME TO "notifications_userId_createdAt_idx";

-- RenameIndex
ALTER INDEX "notifications_user_isread_idx" RENAME TO "notifications_userId_isRead_idx";

-- RenameIndex
ALTER INDEX "payments_status_created_idx" RENAME TO "payments_status_createdAt_idx";

-- RenameIndex
ALTER INDEX "payments_student_status_idx" RENAME TO "payments_studentId_status_idx";

-- RenameIndex
ALTER INDEX "teacher_comments_isread_created_idx" RENAME TO "teacher_comments_isRead_createdAt_idx";

-- RenameIndex
ALTER INDEX "users_name_idx" RENAME TO "users_firstName_lastName_idx";

-- RenameIndex
ALTER INDEX "users_role_isactive_idx" RENAME TO "users_role_isActive_idx";

-- RecreateView: restore vw_dashboard_summary after all column type changes
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
