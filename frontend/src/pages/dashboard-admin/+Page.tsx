import '../../index.css'
import { useState } from 'react'

export default function DashboardAdmin() {
  const [idiomas, setIdiomas] = useState(['Ingles', 'Frances', 'Aleman'])
  const [nuevoIdioma, setNuevoIdioma] = useState('')
  const [profesor, setProfesor] = useState({ nombre: '', email: '', password: '' })

  const agregarIdioma = () => {
    if (nuevoIdioma.trim()) {
      setIdiomas([...idiomas, nuevoIdioma.trim()])
      setNuevoIdioma('')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">

      <nav className="bg-green-800 text-white px-6 py-3 flex justify-between items-center">
        <span className="font-bold text-lg">Dashboard - Administrador</span>
        <a href="/login" className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded transition-colors">
          Cerrar Sesion
        </a>
      </nav>

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">

        <h2 className="text-xl font-bold text-gray-800">Panel del Administrador</h2>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-l-green-500">
            <p className="text-sm text-gray-500">Alumnos Activos</p>
            <p className="text-3xl font-bold text-gray-800">1250</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-l-blue-500">
            <p className="text-sm text-gray-500">Profesores Registrados</p>
            <p className="text-3xl font-bold text-gray-800">30</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-l-red-500">
            <p className="text-sm text-gray-500">Bajas este Mes</p>
            <p className="text-3xl font-bold text-red-600">5</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-l-gray-400">
            <p className="text-sm text-gray-500">Boletas Pendientes</p>
            <p className="text-3xl font-bold text-gray-800">45</p>
          </div>
        </div>

        {/* Gestion y Registro */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-green-700 font-bold text-lg mb-3">Gestion de Idiomas</h3>
            <ul className="list-disc list-inside text-gray-700 text-sm mb-4 space-y-1">
              {idiomas.map(i => <li key={i}>{i}</li>)}
            </ul>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nuevo Idioma (Ej: Japones)"
                value={nuevoIdioma}
                onChange={e => setNuevoIdioma(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400"
              />
              <button
                onClick={agregarIdioma}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Anadir
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-green-700 font-bold text-lg mb-3">Registro de Profesores</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nombre Completo"
                value={profesor.nombre}
                onChange={e => setProfesor({ ...profesor, nombre: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
              <input
                type="email"
                placeholder="Email (Usuario)"
                value={profesor.email}
                onChange={e => setProfesor({ ...profesor, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
              <input
                type="password"
                placeholder="Contrasena Inicial"
                value={profesor.password}
                onChange={e => setProfesor({ ...profesor, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors text-sm">
                Registrar Profesor
              </button>
            </div>
          </div>
        </div>

        {/* Reportes */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-green-700 font-bold text-lg mb-1">Reportes de Rendimiento (Graficos Simulados)</h3>
          <p className="text-blue-600 text-sm mb-4">Aqui se mostrarian graficos de comparativos (aprobados, reprobados, bajas) mes a mes y por grupo.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-center text-sm text-gray-600 mb-2">Aprobados vs Reprobados (Mensual)</p>
              <div className="bg-green-700 rounded-lg h-32 flex items-center justify-center text-white font-semibold">
                Grafico Mensual
              </div>
            </div>
            <div>
              <p className="text-center text-sm text-gray-600 mb-2">Bajas de Alumnos (General)</p>
              <div className="bg-blue-800 rounded-lg h-32 flex items-center justify-center text-white font-semibold">
                Grafico Bajas Generales
              </div>
            </div>
          </div>
        </div>

        {/* Liberacion de documentos */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-green-700 font-bold text-lg mb-4">Liberacion de Documentos y Bajas</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-sm text-gray-700">Boletas Pendientes: LOPEZ PEREZ Ana (A2)</p>
              <div className="flex gap-2">
                <button className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors">
                  Liberar Boleta
                </button>
                <button className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors">
                  Dar de Baja
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-sm text-gray-700">Certificado Pendiente: PEREZ HERNANDEZ Luis (4/4 Cursos)</p>
              <button className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors">
                Generar Certificado
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
