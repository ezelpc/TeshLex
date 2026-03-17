import '../../index.css'

export default function DashboardAlumno() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">

      <nav className="bg-green-800 text-white px-6 py-3 flex justify-between items-center">
        <span className="font-bold text-lg">Dashboard - Alumno</span>
        <a href="/login" className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded transition-colors">
          Cerrar Sesion
        </a>
      </nav>

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        <h2 className="text-xl font-bold text-gray-800">Bienvenido, Alumno</h2>

        {/* Info general y horario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-green-700 font-bold text-lg mb-3">Informacion General</h3>
            <div className="space-y-1 text-sm text-gray-700">
              <p><span className="font-bold">Nombre:</span> VELASQUEZ TORRES Juan</p>
              <p><span className="font-bold">Matricula:</span> MATRICULA001</p>
              <p><span className="font-bold">Idioma:</span> Ingles</p>
              <p><span className="font-bold">Nivel Actual:</span> <span className="text-blue-600 font-bold">B1</span></p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-green-700 font-bold text-lg mb-3">Horario y Adeudos</h3>
            <p className="text-sm text-gray-700 mb-3">
              <span className="font-bold">Horario:</span> Lunes, Miercoles, Viernes - 9:00 a 11:00 AM
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-600">
                <span className="font-bold">Adeudos:</span> Si! Tienes un adeudo pendiente.
              </p>
            </div>
          </div>
        </div>

        {/* Historial academico */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-green-700 font-bold text-lg mb-4">Historial Academico</h3>
          <div className="space-y-3">
            {[
              { nivel: 'A1 (Prof. Ana Garcia)', calificacion: '8.5' },
              { nivel: 'A2 (Prof. Carlos Ruiz)', calificacion: '7.9' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center border-b border-gray-100 pb-3">
                <p className="text-sm text-gray-700">{item.nivel}</p>
                <p className="text-sm font-bold text-green-600">{item.calificacion}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Boletas y observaciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-green-700 font-bold text-lg mb-3">Boletas y Certificado</h3>
            <ul className="space-y-2 mb-4">
              <li>
                <a href="#" className="text-blue-600 text-sm hover:underline">Boleta A1.pdf</a>
              </li>
              <li>
                <a href="#" className="text-blue-600 text-sm hover:underline">Boleta A2.pdf</a>
              </li>
            </ul>
            <button className="w-full bg-gray-400 text-white text-sm font-semibold py-2 px-4 rounded-lg cursor-not-allowed">
              Generar Certificado (4/4 Boletas Aprobadas)
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-green-700 font-bold text-lg mb-3">Observaciones del Profesor</h3>
            <p className="text-sm text-gray-600 italic">
              Pendiente de pago de libro del nivel B1.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
