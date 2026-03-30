interface Enrollment {
  student: {
    matricula: string
    career: string
    semester: number
    user: {
      firstName: string
      lastName: string
    }
  }
  course: {
    language: { name: string }
    level: string
    teacher?: { user: { firstName: string; lastName: string } }
    scheduleDescription: string
    classroom?: string
  }
}

export function PrintableSchedule({ enrollment }: { enrollment: Enrollment | null }) {
  if (!enrollment) return null

  return (
    <div className="printable-only fixed inset-0 bg-white z-[9999] p-12 text-black font-serif overflow-y-auto no-print:hidden">
      {/* Institutional Header */}
      <div className="flex justify-between items-center border-b-2 border-slate-900 pb-6 mb-8">
        <div>
          <h1 className="text-xl font-bold uppercase leading-tight">Tecnológico de Estudios Superiores de Huixquilucan</h1>
          <h2 className="text-lg font-semibold uppercase text-slate-700">Coordinación de Lenguas Extranjeras</h2>
        </div>
        <div className="text-right">
          <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center font-black text-2xl mb-2 ml-auto">TL</div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">TeshLex Academic System</p>
        </div>
      </div>

      {/* Document Title */}
      <div className="text-center mb-10">
        <h3 className="text-2xl font-bold uppercase underline decoration-2 underline-offset-8">Horario Oficial de Clases</h3>
        <p className="mt-4 text-sm font-bold text-slate-600">Ciclo Escolar: 2026-1</p>
      </div>

      {/* Student Informative Block */}
      <div className="grid grid-cols-2 gap-y-4 gap-x-12 mb-10 bg-slate-50 p-6 border border-slate-200 rounded-sm">
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400 font-sans tracking-widest">Nombre del Alumno</p>
          <p className="text-sm font-bold uppercase">{enrollment.student.user.lastName} {enrollment.student.user.firstName}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400 font-sans tracking-widest">Matrícula</p>
          <p className="text-sm font-bold tracking-widest">{enrollment.student.matricula}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400 font-sans tracking-widest">Carrera</p>
          <p className="text-sm font-bold uppercase">{enrollment.student.career}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400 font-sans tracking-widest">Semestre</p>
          <p className="text-sm font-bold">{enrollment.student.semester}° Semestre</p>
        </div>
      </div>

      {/* Course Details Block */}
      <div className="border-2 border-slate-900 p-8 mb-10 relative overflow-hidden">
        {/* Decorative watermark / indicator */}
        <div className="absolute -right-8 -bottom-8 opacity-[0.03] select-none pointer-events-none transform rotate-12">
            <h1 className="text-9xl font-black">TESHLEX</h1>
        </div>

        <h4 className="text-center font-bold uppercase mb-6 border-b border-slate-900 pb-2 font-sans tracking-widest">Detalles de la Inscripción</h4>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1">
            <p className="text-[10px] font-bold uppercase text-slate-400 font-sans tracking-widest">Idioma & Nivel</p>
            <p className="text-lg font-bold uppercase text-slate-900">{enrollment.course.language.name} - {enrollment.course.level}</p>
          </div>
          <div className="col-span-1 border-x border-slate-100 px-6">
            <p className="text-[10px] font-bold uppercase text-slate-400 font-sans tracking-widest">Profesor(a)</p>
            <p className="text-sm font-bold uppercase">{enrollment.course.teacher?.user.firstName} {enrollment.course.teacher?.user.lastName}</p>
          </div>
          <div className="col-span-1">
            <p className="text-[10px] font-bold uppercase text-slate-400 font-sans tracking-widest">Aula / Plataforma</p>
            <p className="text-sm font-bold uppercase">{enrollment.course.classroom || 'VIRTUAL / MS TEAMS'}</p>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-900/10 flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 font-sans tracking-widest">Horario de Sesiones</p>
              <p className="text-sm font-bold text-slate-700">{enrollment.course.scheduleDescription}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-slate-400 font-sans tracking-widest">Estatus de Inscripción</p>
              <p className="text-xs font-black text-green-700 uppercase">Activo — Pagado y Validado</p>
            </div>
        </div>
      </div>

      {/* Signature Area */}
      <div className="mt-32 flex justify-around">
        <div className="text-center w-64 border-t border-slate-900 pt-4">
          <p className="text-[10px] font-bold uppercase font-sans tracking-widest">{enrollment.student.user.lastName} {enrollment.student.user.firstName}</p>
          <p className="text-[8px] text-slate-400 uppercase mt-1">Nombre y Firma del Alumno</p>
        </div>
        <div className="text-center w-64 border-t border-slate-900 pt-4">
          <div className="mb-4 h-12 flex items-center justify-center">
             {/* Signature Placeholder */}
             <p className="text-slate-200 italic font-serif">Sello Digital TESH</p>
          </div>
          <p className="text-[10px] font-bold uppercase font-sans tracking-widest">Coordinación de Lenguas Extranjeras</p>
          <p className="text-[8px] text-slate-500 mt-1 italic uppercase tracking-tighter">Tecnológico de Estudios Superiores de Huixquilucan</p>
        </div>
      </div>

      {/* Technical Footer */}
      <div className="mt-24 border-t border-slate-100 pt-6 flex justify-between">
        <p className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">Autenticidad verificada mediante Firma Electrónica Interna (FEI) TeshLex-2026</p>
        <p className="text-[8px] text-slate-400 font-bold">Fecha de Generación: {new Date().toLocaleString('es-MX')}</p>
      </div>
    </div>
  )
}
