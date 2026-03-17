import '../../index.css'
import { useState } from 'react'

export default function DashboardProfesor() {
  const [horario, setHorario] = useState('')
  const [nivel, setNivel] = useState('Ingles B1')
  const [criterios, setCriterios] = useState([
    { nombre: 'Examen Final (40%)' },
    { nombre: 'Participacion (10%)' },
    { nombre: 'Tareas (30%)' },
    { nombre: 'Exposicion Oral (20%)' },
  ])
  const [nuevoCriterio, setNuevoCriterio] = useState('')
  const [porcentaje, setPorcentaje] = useState('')
  const [comentario, setComentario] = useState('')
  const [alumnos, setAlumnos] = useState([
    { nombre: 'VELASQUEZ TORRES Juan', calificacion: '8.5', asistencias: '95', observaciones: 'Muy participativo' },
    { nombre: 'LOPEZ PEREZ Ana', calificacion: '6.8', asistencias: '70', observaciones: 'Necesita estudiar mas' },
  ])

  const agregarCriterio = () => {
    if (nuevoCriterio.trim() && porcentaje.trim()) {
      setCriterios([...criterios, { nombre: `${nuevoCriterio} (${porcentaje}%)` }])
      setNuevoCriterio('')
      setPorcentaje('')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">

      <nav className="bg-green-800 text-white px-6 py-3 flex justify-between items-center">
        <span className="font-bold text-lg">Dashboard - Profesor</span>
        <a href="/login" className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded transition-colors">
          Cerrar Sesion
        </a>
      </nav>

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        <h2 className="text-xl font-bold text-gray-800">Panel del Profesor</h2>

        {/* Asignacion y Criterios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-blue-600 font-bold text-lg mb-3">Asignacion de Clases</h3>
            <p className="text-gray-500 text-sm mb-3">Maximo 35 alumnos por grupo.</p>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Horario:</p>
                <input
                  type="text"
                  placeholder="Ej: Sabados 7:00-14"
                  value={horario}
                  onChange={e => setHorario(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400"
                />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Idioma / Nivel:</p>
                <select
                  value={nivel}
                  onChange={e => setNivel(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400 bg-white"
                >
                  <option>Ingles A1</option>
                  <option>Ingles A2</option>
                  <option>Ingles B1</option>
                  <option>Ingles B2</option>
                  <option>Frances A1</option>
                  <option>Aleman A1</option>
                </select>
              </div>
              <button className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                Registrar Horario
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-blue-600 font-bold text-lg mb-3">Criterios de Evaluacion (Max. 5)</h3>
            <div className="space-y-2 mb-4">
              {criterios.map((c, i) => (
                <div key={i} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
                  {c.nombre}
                </div>
              ))}
            </div>
            {criterios.length < 5 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nuevo Criterio (Ej: Portafolio)"
                  value={nuevoCriterio}
                  onChange={e => setNuevoCriterio(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
                <input
                  type="number"
                  placeholder="%"
                  value={porcentaje}
                  onChange={e => setPorcentaje(e.target.value)}
                  className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none focus:border-blue-400"
                />
                <button
                  onClick={agregarCriterio}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
                >
                  Anadir
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabla calificaciones */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-blue-600 font-bold text-lg mb-4">Registro de Calificaciones y Asistencias - Grupo B1</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-600 font-semibold">ALUMNO</th>
                  <th className="text-left py-2 px-3 text-gray-600 font-semibold">CALIFICACION</th>
                  <th className="text-left py-2 px-3 text-gray-600 font-semibold">ASISTENCIAS (%)</th>
                  <th className="text-left py-2 px-3 text-gray-600 font-semibold">OBSERVACIONES</th>
                </tr>
              </thead>
              <tbody>
                {alumnos.map((a, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-gray-700">{a.nombre}</td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={a.calificacion}
                        onChange={e => {
                          const nueva = [...alumnos]
                          nueva[i].calificacion = e.target.value
                          setAlumnos(nueva)
                        }}
                        className={`w-16 border border-gray-300 rounded px-2 py-1 text-sm outline-none ${parseFloat(a.calificacion) < 7 ? 'text-red-500' : 'text-gray-800'}`}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={a.asistencias}
                        onChange={e => {
                          const nueva = [...alumnos]
                          nueva[i].asistencias = e.target.value
                          setAlumnos(nueva)
                        }}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-sm outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={a.observaciones}
                        onChange={e => {
                          const nueva = [...alumnos]
                          nueva[i].observaciones = e.target.value
                          setAlumnos(nueva)
                        }}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="mt-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            Guardar Cambios
          </button>
        </div>

        {/* Comentarios */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-blue-600 font-bold text-lg mb-3">Comentarios para el Administrador</h3>
          <textarea
            placeholder="Ej: Se requiere mas material audiovisual para el nivel A1."
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 h-24 resize-none"
          />
          <button className="mt-3 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            Enviar Comentario
          </button>
        </div>

      </div>
    </div>
  )
}
