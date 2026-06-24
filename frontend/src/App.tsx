import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { Dashboard } from '@/pages/Dashboard'
import { Convocatorias } from '@/pages/Convocatorias'
import { ConvocatoriaDetail } from '@/pages/ConvocatoriaDetail'
import { Proyectos } from '@/pages/Proyectos'
import { ProyectoDetail } from '@/pages/ProyectoDetail'
import { Evaluacion } from '@/pages/Evaluacion'
import { Usuarios } from '@/pages/Usuarios'

function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/20">
          {children}
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/convocatorias" element={<Convocatorias />} />
          <Route path="/convocatorias/:id" element={<ConvocatoriaDetail />} />
          <Route path="/proyectos" element={<Proyectos />} />
          <Route path="/proyectos/:id" element={<ProyectoDetail />} />
          <Route path="/evaluacion" element={<Evaluacion />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
