import '../../index.css'

export default function CostosPage() {
  const categories = [
    { name: 'Externos', price: '$1,800.00', desc: 'Público en general sin relación laboral o académica con TESH.' },
    { name: 'Internos (Alumnos TESH)', price: '$1,200.00', desc: 'Estudiantes inscritos en una carrera del Tecnológico.' },
    { name: 'PAE (Personal)', price: '$900.00', desc: 'Personal de Apoyo y Asistencia a la Educación.' },
    { name: 'Profesores TESH', price: '$0.00', desc: 'Docentes del Tecnológico (Becas 100%).' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-green-800 text-white px-6 py-4 shadow-lg">
        <a href="/" className="font-bold text-xl flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          TeshLex — Precios y Cuotas
        </a>
      </nav>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Cuotas de Recuperación</h1>
          <p className="text-gray-600">Ciclo Escolar 2026 — Inscripción General</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {categories.map((cat) => (
            <div key={cat.name} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-green-700">{cat.name}</h3>
                <span className="text-2xl font-black text-gray-900">{cat.price}</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{cat.desc}</p>
              <div className="text-[10px] text-gray-400 border-t pt-3 flex justify-between uppercase font-semibold">
                <span>Pago Único por Nivel</span>
                <span>Válido para 2026</span>
              </div>
            </div>
          ))}
        </div>

        <section className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="text-blue-800 font-bold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Notas Importantes
          </h3>
          <ul className="text-sm text-blue-700 space-y-2 list-disc pl-5">
            <li>Los pagos se realizan exclusivamente a través de la plataforma integrada con Mercado Pago.</li>
            <li>No se aceptan pagos en efectivo ni transferencias fuera del sistema.</li>
            <li>La cuota incluye: Examen de nivelación (si aplica), material digital y constancia de acreditación.</li>
            <li>Para aplicar a la tarifa de <strong>Interno</strong> o <strong>PAE</strong>, debes tener tus datos actualizados en el perfil.</li>
          </ul>
        </section>

        <footer className="mt-12 text-center text-gray-400 text-xs">
          Copyright © 2026 TeshLex. Tecnológico de Estudios Superiores de Huixquilucan.
        </footer>
      </main>
    </div>
  )
}
