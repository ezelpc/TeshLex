import '../../index.css'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">

      <nav className="bg-green-800 text-white px-6 py-3 flex justify-between items-center">
        <span className="font-bold text-lg">Curso de Lenguas Extranjeras TESH</span>
        <a href="/login" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded transition-colors">
          Iniciar Sesion
        </a>
      </nav>

      <section className="bg-white px-6 py-12 text-center">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-10">
          <h1 className="text-3xl font-bold text-green-700 mb-3">Abre tu mundo con el TESH!</h1>
          <p className="text-gray-600 text-base">Inscribete a nuestros cursos de ingles, frances y mas, disenados para el exito academico y profesional.</p>
        </div>
      </section>

      <section className="px-6 py-8 max-w-4xl mx-auto w-full">
        <h2 className="text-xl font-bold text-gray-800 text-center mb-6">Nuestras Ofertas Educativas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-xl p-6 border-l-4 border-l-blue-500">
            <h3 className="text-blue-600 font-bold text-lg mb-1">Cursos entre Semana</h3>
            <p className="text-gray-500 text-sm mb-4">Disenados para un avance constante y profundo.</p>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-sm font-bold text-gray-700">Horario:</p>
              <p className="text-sm text-gray-600">Lunes a Viernes</p>
              <p className="text-sm text-green-600 font-medium">9:00 AM a 4:00 PM</p>
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl p-6 border-l-4 border-l-green-500">
            <h3 className="text-green-600 font-bold text-lg mb-1">Cursos Sabatinos</h3>
            <p className="text-gray-500 text-sm mb-4">Perfectos para quienes trabajan o tienen otras actividades durante la semana.</p>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-sm font-bold text-gray-700">Horario:</p>
              <p className="text-sm text-gray-600">Sabados</p>
              <p className="text-sm text-green-600 font-medium">7:00 AM a 2:00 PM</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 max-w-4xl mx-auto w-full">
        <div className="bg-blue-50 rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Estas listo para iniciar?</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/register" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-full transition-colors">
              Inscripcion por Primera Vez
            </a>
            <a href="/login" className="bg-gray-700 hover:bg-gray-800 text-white font-semibold px-8 py-3 rounded-full transition-colors">
              Reinscripcion
            </a>
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-gray-200 px-6 py-8 text-center text-sm text-gray-600">
        <p className="font-bold text-gray-800 mb-2">Contacto TESH - Curso de Lenguas</p>
        <p>Direccion: Av. Tecnologico #20, Ex Rancho El Tejocote, Huixquilucan, Edo. de Mexico.</p>
        <p>Telefono: (55) 5811-1234</p>
        <p>Email: lenguas@tesh.edu.mx</p>
        <p className="mt-4 text-gray-400">2025 Tecnologico de Estudios Superiores de Huixquilucan. Todos los derechos reservados @ONERSTUDIOS.</p>
      </footer>

    </div>
  )
}
