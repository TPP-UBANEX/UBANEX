import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { ROLES_USUARIO_BUSCABLES } from '@/data/types'
import type { RolUsuario, UsuarioSugerido, ValorUsuario } from '@/data/types'
import { Loader2, UserSearch } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: ValorUsuario | null
  onChange: (valor: ValorUsuario | null) => void
  /** Roles configurados en la definición del campo. Por defecto, docentes y estudiantes. */
  roles?: RolUsuario[]
  disabled?: boolean
}

/** Input de texto con búsqueda de docentes/estudiantes contra nuestra propia API.
 *  Si no se elige ninguna sugerencia, lo tipeado se guarda como texto libre (sin id ni email). */
export function UsuarioAutocomplete({ value, onChange, roles, disabled }: Props) {
  const [texto, setTexto] = useState(value?.nombre ?? '')
  const [opciones, setOpciones] = useState<UsuarioSugerido[]>([])
  const [buscando, setBuscando] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const [resaltado, setResaltado] = useState(-1)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const secuenciaRef = useRef(0)

  const claveRoles = (roles ?? ROLES_USUARIO_BUSCABLES).join(',')

  useEffect(() => {
    setTexto(value?.nombre ?? '')
  }, [value?.nombre])

  useEffect(() => {
    if (texto.trim().length < 3) {
      setOpciones([])
      setBuscando(false)
      return
    }
    setBuscando(true)
    const idSecuencia = ++secuenciaRef.current
    const timeout = setTimeout(async () => {
      try {
        const resultados = await api.usuarios.buscar(texto.trim(), roles)
        if (secuenciaRef.current !== idSecuencia) return // respuesta obsoleta, se descarta
        setOpciones(resultados)
      } catch {
        if (secuenciaRef.current === idSecuencia) setOpciones([])
      } finally {
        if (secuenciaRef.current === idSecuencia) setBuscando(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, claveRoles])

  useEffect(() => {
    const handleClickAfuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickAfuera)
    return () => document.removeEventListener('mousedown', handleClickAfuera)
  }, [])

  const elegir = (usuario: UsuarioSugerido) => {
    onChange({ id: usuario.id, nombre: usuario.nombre, email: usuario.email })
    setTexto(usuario.nombre)
    setAbierto(false)
    setResaltado(-1)
  }

  const handleChangeTexto = (nuevoTexto: string) => {
    setTexto(nuevoTexto)
    setAbierto(true)
    setResaltado(-1)
    // Texto libre: se guarda sin id ni email hasta que se elija una sugerencia.
    onChange(nuevoTexto.trim() ? { nombre: nuevoTexto } : null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!abierto || opciones.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setResaltado(prev => (prev + 1) % opciones.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setResaltado(prev => (prev - 1 + opciones.length) % opciones.length)
    } else if (e.key === 'Enter' && resaltado >= 0) {
      e.preventDefault()
      elegir(opciones[resaltado])
    } else if (e.key === 'Escape') {
      setAbierto(false)
    }
  }

  return (
    <div ref={contenedorRef} className="relative">
      <div className="relative">
        <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={texto}
          disabled={disabled}
          onChange={e => handleChangeTexto(e.target.value)}
          onFocus={() => setAbierto(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar docente o estudiante..."
          className="pl-9"
        />
        {buscando && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {abierto && texto.trim().length >= 3 && !buscando && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
          {opciones.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Sin resultados. Se guardará el texto escrito.
            </p>
          ) : (
            opciones.map((usuario, idx) => (
              <button
                type="button"
                key={usuario.id}
                className={cn(
                  'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-sm text-left hover:bg-accent',
                  idx === resaltado && 'bg-accent',
                )}
                onMouseEnter={() => setResaltado(idx)}
                onClick={() => elegir(usuario)}
              >
                <span className="font-medium">{usuario.nombre}</span>
                <span className="text-xs text-muted-foreground">{usuario.email}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
