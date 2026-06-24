import { useState } from 'react'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { Dashboard } from '@/pages/Dashboard'
import { Convocatorias } from '@/pages/Convocatorias'
import { Evaluacion } from '@/pages/Evaluacion'
import { Rendicion } from '@/pages/Rendicion'
import { Cierre } from '@/pages/Cierre'
import { Proyectos } from '@/pages/Proyectos'

const pages: Record<string, React.ReactNode> = {
  dashboard: <Dashboard />,
  convocatorias: <Convocatorias />,
  evaluacion: <Evaluacion />,
  rendicion: <Rendicion />,
  cierre: <Cierre />,
  proyectos: <Proyectos />,
}

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/20">
          {pages[currentPage] || <Dashboard />}
        </main>
      </div>
    </div>
  )
}

export default App
