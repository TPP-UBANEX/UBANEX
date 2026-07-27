import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { UnidadAcademica } from '@/data/types'
import { GraduationCap, ArrowLeft, BookOpen } from 'lucide-react'

export function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [step, setStep] = useState<'tipo' | 'form'>('tipo')
  const [tipo, setTipo] = useState<'estudiante' | 'docente'>('estudiante')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [unidadAcademicaId, setUnidadAcademicaId] = useState('')
  const [uaList, setUaList] = useState<UnidadAcademica[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.unidadesAcademicas.list().then(setUaList).catch(() => {})
  }, [])

  const seleccionarTipo = (t: 'estudiante' | 'docente') => {
    setTipo(t)
    setStep('form')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      await register(nombreCompleto, email, password, tipo, unidadAcademicaId || undefined)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'tipo') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/20">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">UBANEX</CardTitle>
            <CardDescription>Crear cuenta nueva</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">¿Sos estudiante o docente?</p>
            <Button
              variant="outline"
              className="w-full h-20 text-base flex items-center gap-3"
              onClick={() => seleccionarTipo('estudiante')}
            >
              <GraduationCap className="h-6 w-6" />
              Estudiante
            </Button>
            <Button
              variant="outline"
              className="w-full h-20 text-base flex items-center gap-3"
              onClick={() => seleccionarTipo('docente')}
            >
              <BookOpen className="h-6 w-6" />
              Docente
            </Button>
            <div className="pt-2 text-center text-sm text-muted-foreground">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Iniciar sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/20">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 absolute left-4" onClick={() => setStep('tipo')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <CardTitle className="text-2xl">UBANEX</CardTitle>
          <CardDescription>
            {tipo === 'estudiante' ? 'Crear cuenta de Estudiante' : 'Crear cuenta de Docente'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tipo === 'docente' && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md mb-4">
              Todo docente debe ser validado por la Secretaría de Extensión de su unidad académica
               para poder participar en la dirección y/o evaluación de proyectos.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre completo</label>
              <Input
                placeholder="Juan Pérez"
                value={nombreCompleto}
                onChange={e => setNombreCompleto(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="email@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contraseña</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar contraseña</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unidad Académica</label>
              <Select value={unidadAcademicaId} onValueChange={setUnidadAcademicaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná tu facultad" />
                </SelectTrigger>
                <SelectContent>
                  {uaList.map(ua => (
                    <SelectItem key={ua.id} value={ua.id}>{ua.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Iniciar sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
