import { useAuth } from '../context/AuthContext'

interface SidebarProps {
  user: any
  activeTab: string
  setActiveTab: (tab: string) => void
  tabs: { id: string; label: string; icon: string }[]
}

export function Sidebar({ user, activeTab, setActiveTab, tabs }: SidebarProps) {
  const { logout } = useAuth()

  return (
    <aside className="w-64 bg-green-900 text-green-100 flex flex-col h-screen sticky top-0 border-r border-green-800 shrink-0">
      {/* Brand */}
      <div className="p-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="bg-green-600 p-1.5 rounded-lg text-white font-black leading-none">TL</span>
          TeshLex
        </h1>
        <p className="text-[10px] uppercase tracking-widest text-green-400 font-bold mt-1">
          {user.role} Dashboard
        </p>
      </div>

      {/* Profile Simple */}
      <div className="px-6 mb-8 mt-2">
        <div className="bg-green-800/50 rounded-xl p-3 border border-green-700/50">
          <p className="text-sm font-semibold text-white truncate">{user.firstName} {user.lastName}</p>
          <p className="text-[10px] text-green-400 truncate uppercase mt-0.5">{user.email}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-start px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-green-600 text-white shadow-md'
                : 'hover:bg-green-800 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-green-800">
        <button
          onClick={() => {
            if (confirm('¿Cerrar sesión?')) {
              logout()
            }
          }}
          className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold text-red-200 hover:bg-red-900/40 transition-colors uppercase tracking-tight"
        >
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}
