import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthProvider } from '@/lib/auth-context'
import { Login } from '@/pages/Login'
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
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/convocatorias" element={<Convocatorias />} />
                  <Route path="/convocatorias/:id" element={<ConvocatoriaDetail />} />
                  <Route path="/proyectos" element={<Proyectos />} />
                  <Route path="/proyectos/:id" element={<ProyectoDetail />} />
                  <Route path="/evaluacion" element={<Evaluacion />} />
                  <Route path="/usuarios" element={<Usuarios />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
