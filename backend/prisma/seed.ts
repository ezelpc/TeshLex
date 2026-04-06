import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { Role, LanguageLevel, CourseModality, CourseStatus, EnrollmentStatus, PaymentStatus, PaymentType, DocumentStatus, DocumentType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter, log: ['warn', 'error'] })

const hash = (p: string) => bcrypt.hash(p, 12)
const dateOffset = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d }

async function findOrCreateCourse(data: any, criterios: any[], cycleId: string) {
  const existing = await prisma.course.findFirst({
    where: { languageId: data.languageId, level: data.level, scheduleDescription: data.scheduleDescription }
  })
  if (existing) return existing
  return prisma.course.create({
    data: {
      languageId: data.languageId, level: data.level, modality: data.modality,
      status: data.status ?? CourseStatus.ACTIVE, cycleId,
      scheduleDescription: data.scheduleDescription, startTime: data.startTime, endTime: data.endTime,
      startDate: new Date('2025-08-04'), endDate: new Date('2025-11-28'),
      daysOfWeek: data.daysOfWeek, maxStudents: data.maxStudents, currentStudents: 0,
      enrollmentFee: data.enrollmentFee, materialFee: data.materialFee,
      teacherId: data.teacherId, description: data.description,
      evaluationCriteria: { create: criterios }
    }
  })
}

async function main() {
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (isProduction) {
    console.error('❌ El seed no puede ejecutarse en NODE_ENV=production')
    process.exit(1)
  }

  console.log('\n🌱 TeshLex — Iniciando seed...\n')

  // Config
  const configs = [
    { key: 'enrollment_fee_default', value: '1500', type: 'number', label: 'Precio inscripción (MXN)' },
    { key: 'material_fee_default', value: '350', type: 'number', label: 'Precio material (MXN)' },
    { key: 'max_students_per_group', value: '35', type: 'number', label: 'Máximo alumnos por grupo' },
    { key: 'passing_grade', value: '7', type: 'number', label: 'Calificación mínima (0-10)' },
    { key: 'min_attendance_percent', value: '80', type: 'number', label: 'Asistencia mínima (%)' },
    { key: 'levels_for_certificate', value: '4', type: 'number', label: 'Niveles para certificado' },
    { 
      key:   'school_name', 
      value: process.env.SEED_SCHOOL_NAME ?? 'TESH — Cursos de Idiomas', 
      type:  'string', 
      label: 'Nombre del centro' 
    },
    { 
      key:   'contact_email', 
      value: process.env.SEED_CONTACT_EMAIL ?? 'dev-test@localhost.invalid', 
      type:  'string', 
      label: 'Email de contacto' 
    },
    { key: 'mp_webhook_enabled', value: 'true', type: 'boolean', label: 'Webhooks Mercado Pago' },
  ]
  for (const c of configs) {
    await prisma.systemConfig.upsert({ where: { key: c.key }, update: { value: c.value }, create: c })
  }
  console.log('   ✅ Configuración del sistema')

  // Ciclo
  const cycle = await prisma.schoolCycle.upsert({
    where: { code: '2025-2' }, update: { isActive: true },
    create: { name: 'Agosto — Diciembre 2025', code: '2025-2', startDate: new Date('2025-08-04'), endDate: new Date('2025-11-29'), isActive: true }
  })
  console.log(`   ✅ Ciclo: ${cycle.name}`)

  // Idiomas
  const [ingles, frances, aleman] = await Promise.all([
    prisma.language.upsert({ where: { code: 'en' }, update: {}, create: { name: 'Inglés', code: 'en' } }),
    prisma.language.upsert({ where: { code: 'fr' }, update: {}, create: { name: 'Francés', code: 'fr' } }),
    prisma.language.upsert({ where: { code: 'de' }, update: {}, create: { name: 'Alemán', code: 'de' } }),
  ])
  console.log(`   ✅ Idiomas: ${ingles.name}, ${frances.name}, ${aleman.name}`)

  // Admins
  await prisma.user.upsert({ where: { email: 'superadmin@tesh.edu.mx' }, update: {}, create: { email: 'superadmin@tesh.edu.mx', password: await hash('SuperAdmin2025!'), role: Role.SUPERADMIN, firstName: 'Sistema', lastName: 'TESH', emailVerified: true } })
  await prisma.user.upsert({ where: { email: 'admin@tesh.edu.mx' }, update: {}, create: { email: 'admin@tesh.edu.mx', password: await hash('Admin2025!'), role: Role.ADMIN, firstName: 'Coordinación', lastName: 'Lenguas TESH', emailVerified: true } })
  console.log('   ✅ Superadmin y Admin')

  // Profesores
  const prof1 = await prisma.user.upsert({
    where: { email: 'ana.garcia@tesh.edu.mx' }, update: {},
    create: { email: 'ana.garcia@tesh.edu.mx', password: await hash('Profesor2025!'), role: Role.TEACHER, firstName: 'Ana', lastName: 'García López', phone: '5512340001', emailVerified: true, teacherProfile: { create: { specialties: ['Inglés', 'Francés'], bio: 'Licenciada en Lenguas con 8 años de experiencia.', maxStudents: 35 } } },
    include: { teacherProfile: true }
  })
  const prof2 = await prisma.user.upsert({
    where: { email: 'carlos.ruiz@tesh.edu.mx' }, update: {},
    create: { email: 'carlos.ruiz@tesh.edu.mx', password: await hash('Profesor2025!'), role: Role.TEACHER, firstName: 'Carlos', lastName: 'Ruiz Mendoza', phone: '5512340002', emailVerified: true, teacherProfile: { create: { specialties: ['Inglés', 'Alemán'], bio: 'Maestro en Lingüística Aplicada.', maxStudents: 30 } } },
    include: { teacherProfile: true }
  })
  const t1 = prof1.teacherProfile!
  const t2 = prof2.teacherProfile!
  console.log(`   ✅ Profesores: ${prof1.firstName}, ${prof2.firstName}`)

  // Cursos
  const criterios = [
    { name: 'Examen Final', percentage: 40, order: 1 },
    { name: 'Participación', percentage: 10, order: 2 },
    { name: 'Tareas', percentage: 30, order: 3 },
    { name: 'Exposición Oral', percentage: 20, order: 4 },
  ]
  const cEnA1 = await findOrCreateCourse({ languageId: ingles.id, level: LanguageLevel.A1, modality: CourseModality.WEEKDAY, scheduleDescription: 'Lunes, Miércoles, Viernes — 9:00 a 11:00', startTime: '09:00', endTime: '11:00', daysOfWeek: [1,3,5], maxStudents: 35, enrollmentFee: 1500, materialFee: 350, teacherId: t1.id, description: 'Nivel introductorio.' }, criterios, cycle.id)
  const cEnA2 = await findOrCreateCourse({ languageId: ingles.id, level: LanguageLevel.A2, modality: CourseModality.WEEKDAY, scheduleDescription: 'Lunes, Miércoles, Viernes — 11:00 a 13:00', startTime: '11:00', endTime: '13:00', daysOfWeek: [1,3,5], maxStudents: 35, enrollmentFee: 1500, materialFee: 350, teacherId: t1.id, description: 'Nivel elemental.' }, criterios, cycle.id)
  const cEnB1 = await findOrCreateCourse({ languageId: ingles.id, level: LanguageLevel.B1, modality: CourseModality.SATURDAY, scheduleDescription: 'Sábados — 7:00 a 14:00', startTime: '07:00', endTime: '14:00', daysOfWeek: [6], maxStudents: 30, enrollmentFee: 1500, materialFee: 400, teacherId: t2.id, description: 'Nivel intermedio sabatino.' }, criterios, cycle.id)
  const cFrA1 = await findOrCreateCourse({ languageId: frances.id, level: LanguageLevel.A1, modality: CourseModality.WEEKDAY, scheduleDescription: 'Martes y Jueves — 9:00 a 11:00', startTime: '09:00', endTime: '11:00', daysOfWeek: [2,4], maxStudents: 25, enrollmentFee: 1500, materialFee: 350, teacherId: t1.id, description: 'Introducción al francés.' }, criterios, cycle.id)
  const cDeA1 = await findOrCreateCourse({ languageId: aleman.id, level: LanguageLevel.A1, modality: CourseModality.WEEKDAY, scheduleDescription: 'Martes y Jueves — 11:00 a 13:00', startTime: '11:00', endTime: '13:00', daysOfWeek: [2,4], maxStudents: 25, enrollmentFee: 1500, materialFee: 350, teacherId: t2.id, description: 'Introducción al alemán.' }, criterios, cycle.id)
  console.log('   ✅ 5 cursos creados')

  // Alumnos
  const alumnosData = [
    { email: 'alumno@tesh.edu.mx', firstName: 'Juan', lastName: 'Velásquez Torres', matricula: 'TESH2024001', career: 'Ing. en Sistemas', semester: 4 },
    { email: 'ana.lopez@tesh.edu.mx', firstName: 'Ana', lastName: 'López Pérez', matricula: 'TESH2024002', career: 'Administración', semester: 3 },
    { email: 'luis.perez@tesh.edu.mx', firstName: 'Luis', lastName: 'Pérez Hernández', matricula: 'TESH2024003', career: 'Contaduría', semester: 6 },
    { email: 'maria.garcia@tesh.edu.mx', firstName: 'María', lastName: 'García Sánchez', matricula: 'TESH2024004', career: 'Enfermería', semester: 2 },
    { email: 'roberto.martinez@tesh.edu.mx', firstName: 'Roberto', lastName: 'Martínez Cruz', matricula: 'TESH2024005', career: 'Ing. Industrial', semester: 5 },
    { email: 'sofia.torres@tesh.edu.mx', firstName: 'Sofía', lastName: 'Torres Villanueva', matricula: 'TESH2024006', career: 'Diseño Gráfico', semester: 1 },
    { email: 'diego.ramirez@tesh.edu.mx', firstName: 'Diego', lastName: 'Ramírez Orozco', matricula: 'TESH2024007', career: 'Ing. en Sistemas', semester: 7 },
    { email: 'valeria.moreno@tesh.edu.mx', firstName: 'Valeria', lastName: 'Moreno Fuentes', matricula: 'TESH2024008', career: 'Psicología', semester: 4 },
    { email: 'alejandro.nunez@tesh.edu.mx', firstName: 'Alejandro', lastName: 'Núñez Castillo', matricula: 'TESH2024009', career: 'Derecho', semester: 3 },
    { email: 'isabela.contreras@tesh.edu.mx', firstName: 'Isabela', lastName: 'Contreras Medina', matricula: 'TESH2024010', career: 'Medicina', semester: 2 },
  ]
  const alumnos: { profileId: string }[] = []
  for (const a of alumnosData) {
    const u = await prisma.user.upsert({
      where: { email: a.email }, update: {},
      create: { email: a.email, password: await hash('Alumno2025!'), role: Role.STUDENT, firstName: a.firstName, lastName: a.lastName, emailVerified: true, studentProfile: { create: { matricula: a.matricula, career: a.career, semester: a.semester } } },
      include: { studentProfile: true }
    })
    alumnos.push({ profileId: u.studentProfile!.id })
  }
  console.log(`   ✅ ${alumnos.length} alumnos`)

  // Inscripciones
  const inscripciones = [
    { idx: 0, curso: cEnA1, status: EnrollmentStatus.ACTIVE, cal: 8.5, asis: 95, obs: 'Muy participativo.', pago: PaymentStatus.APPROVED },
    { idx: 1, curso: cEnA1, status: EnrollmentStatus.ACTIVE, cal: 6.8, asis: 70, obs: 'Reforzar gramática.', pago: PaymentStatus.APPROVED },
    { idx: 2, curso: cEnB1, status: EnrollmentStatus.COMPLETED, cal: 9.2, asis: 98, obs: 'Excelente.', pago: PaymentStatus.APPROVED, boleta: true },
    { idx: 3, curso: cFrA1, status: EnrollmentStatus.PENDING_PAYMENT, pago: PaymentStatus.PENDING },
    { idx: 4, curso: cEnA2, status: EnrollmentStatus.ACTIVE, cal: 7.5, asis: 85, obs: 'Buen avance.', pago: PaymentStatus.APPROVED },
    { idx: 5, curso: cEnA1, status: EnrollmentStatus.DROPPED, pago: PaymentStatus.REFUNDED, dropReason: 'Cambio de horario.' },
    { idx: 6, curso: cDeA1, status: EnrollmentStatus.ACTIVE, cal: 8.0, asis: 90, obs: 'Muy puntual.', pago: PaymentStatus.APPROVED },
    { idx: 7, curso: cFrA1, status: EnrollmentStatus.ACTIVE, cal: 7.9, asis: 88, pago: PaymentStatus.APPROVED },
    { idx: 8, curso: cEnB1, status: EnrollmentStatus.ACTIVE, cal: 6.5, asis: 75, obs: 'Mejorar expresión oral.', pago: PaymentStatus.APPROVED },
    { idx: 9, curso: cEnA2, status: EnrollmentStatus.PENDING_PAYMENT, pago: PaymentStatus.IN_PROCESS },
  ]

  for (const ins of inscripciones) {
    const alumno = alumnos[ins.idx]
    const exists = await prisma.enrollment.findFirst({ where: { studentId: alumno.profileId, courseId: ins.curso.id } })
    if (exists) continue

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: alumno.profileId, courseId: ins.curso.id, status: ins.status,
        enrolledAt: ins.status !== EnrollmentStatus.PENDING_PAYMENT ? dateOffset(-60) : null,
        completedAt: ins.status === EnrollmentStatus.COMPLETED ? dateOffset(-5) : null,
        droppedAt: ins.status === EnrollmentStatus.DROPPED ? dateOffset(-30) : null,
        dropReason: (ins as any).dropReason ?? null,
      }
    })

    await prisma.payment.create({
      data: {
        studentId: alumno.profileId, enrollmentId: enrollment.id,
        type: PaymentType.ENROLLMENT_FEE, status: ins.pago, amount: 1500.00, currency: 'MXN',
        description: `Inscripción — ${ins.curso.level}`,
        mpExternalRef: `tesh-${alumno.profileId.slice(0,8)}-${ins.curso.id.slice(0,4)}`,
        mpPaymentId: ins.pago === PaymentStatus.APPROVED ? `mp-${Math.floor(Math.random()*9000000)+1000000}` : null,
        mpStatus: ins.pago === PaymentStatus.APPROVED ? 'approved' : ins.pago.toLowerCase(),
        webhookReceivedAt: ins.pago === PaymentStatus.APPROVED ? dateOffset(-60) : null,
      }
    })

    if ((ins as any).cal !== undefined) {
      const cursoData = await prisma.course.findUnique({ where: { id: ins.curso.id }, include: { evaluationCriteria: { orderBy: { order: 'asc' } } } })
      const t = [cEnB1, cDeA1].some(c => c.id === ins.curso.id) ? t2 : t1
      await prisma.grade.create({
        data: {
          enrollmentId: enrollment.id, teacherId: t.id,
          criteriaGrades: cursoData!.evaluationCriteria.map(c => ({ criteriaId: c.id, criteriaName: c.name, score: Math.min(10, (ins as any).cal * (0.9 + Math.random() * 0.2)), weight: c.percentage })),
          finalGrade: (ins as any).cal, passed: (ins as any).cal >= 7, observations: (ins as any).obs ?? null,
        }
      })
      for (let d = 1; d <= 10; d++) {
        await prisma.attendance.create({ data: { enrollmentId: enrollment.id, date: dateOffset(-d * 2), present: Math.random() * 100 < (ins as any).asis } })
      }
    }

    if ((ins as any).boleta || ins.status === EnrollmentStatus.COMPLETED) {
      await prisma.document.create({
        data: { studentId: alumno.profileId, enrollmentId: enrollment.id, type: DocumentType.BOLETA, status: (ins as any).boleta ? DocumentStatus.RELEASED : DocumentStatus.PENDING, releasedAt: (ins as any).boleta ? dateOffset(-3) : null }
      })
    }

    if (ins.status === EnrollmentStatus.ACTIVE || ins.status === EnrollmentStatus.COMPLETED) {
      await prisma.course.update({ where: { id: ins.curso.id }, data: { currentStudents: { increment: 1 } } })
    }
  }
  console.log(`   ✅ ${inscripciones.length} inscripciones`)

  const commentExists = await prisma.teacherComment.findFirst({ where: { teacherId: t2.id } })
  if (!commentExists) {
    await prisma.teacherComment.create({ data: { teacherId: t2.id, message: 'Se requiere más material audiovisual para el nivel B1.' } })
  }

  console.log('\n' + '─'.repeat(50))
  console.log('🎉 Seed completado!\n')
  console.log('   superadmin@tesh.edu.mx / SuperAdmin2025!')
  console.log('   admin@tesh.edu.mx      / Admin2025!')
  console.log('   ana.garcia@tesh.edu.mx / Profesor2025!')
  console.log('   alumno@tesh.edu.mx     / Alumno2025!')
  console.log('─'.repeat(50) + '\n')
}

main()
  .catch(e => { console.error('\n❌ Seed falló:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
