import React from 'react'
import { Sidebar } from './Sidebar'

interface DashboardLayoutProps {
  user: any
  activeTab: string
  setActiveTab: (tab: string) => void
  tabs: { id: string; label: string; icon: string }[]
  children: React.ReactNode
  title: string
}

export function DashboardLayout({ user, activeTab, setActiveTab, tabs, children, title }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        tabs={tabs} 
      />
      
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="h-16 bg-green-800 border-b border-green-900/10 flex items-center justify-between px-8 sticky top-0 z-10 text-white shadow-sm">
          <h2 className="text-lg font-bold">{title}</h2>
          <div className="flex items-center gap-4">
             <span className="text-sm font-bold text-green-100 hidden md:block">{user.firstName} {user.lastName}</span>
             <div className="h-8 w-8 rounded-full bg-green-700 text-white flex items-center justify-center font-bold text-xs border border-green-600 uppercase">
                {user.firstName[0]}{user.lastName[0]}
             </div>
          </div>
        </header>

        <div className="p-8 max-w-6xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
