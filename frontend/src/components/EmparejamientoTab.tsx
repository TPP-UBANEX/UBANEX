import { useEffect, useState, useMemo, useCallback } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { EMPAREJAMIENTO_DEFAULT } from '@/data/emparejamiento-default'
import type { UnidadAcademica } from '@/data/types'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Props {
  convocatoriaId: string
}

export function EmparejamientoTab({ convocatoriaId }: Props) {
  const [uas, setUas] = useState<UnidadAcademica[]>([])
  const [pares, setPares] = useState<Map<string, string>>(new Map())
  const [usarDefault, setUsarDefault] = useState(false)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const uasSorted = useMemo(() => [...uas].sort((a, b) => a.nombre.localeCompare(b.nombre)), [uas])

  const cargarDatos = useCallback(async () => {
    const [uasData, empData] = await Promise.all([
      api.unidadesAcademicas.list(),
      api.convocatorias.emparejamientos.list(convocatoriaId),
    ])
    setUas(uasData)
    const m = new Map<string, string>()
    for (const e of empData) {
      m.set(e.unidadAId, e.unidadBId)
      m.set(e.unidadBId, e.unidadAId)
    }
    setPares(m)
    if (empData.length > 0) setUsarDefault(false)
  }, [convocatoriaId])

  useEffect(() => {
    cargarDatos().finally(() => setLoading(false))
  }, [cargarDatos])

  const uaPorNombre = useMemo(() => {
    const m = new Map<string, UnidadAcademica>()
    for (const ua of uas) m.set(ua.nombre, ua)
    return m
  }, [uas])

  const parejaDe = (uaId: string): string | undefined => pares.get(uaId)

  const opcionesDisponibles = (uaId: string): UnidadAcademica[] => {
    const parejaActual = pares.get(uaId)
    return uas.filter(ua => {
      if (ua.id === uaId) return false
      if (parejaActual && ua.id === parejaActual) return true
      return !pares.has(ua.id)
    })
  }

  const handleSeleccionar = (uaId: string, otroId: string) => {
    const m = new Map(pares)
    const viejoA = m.get(uaId)
    const viejoB = m.get(otroId)

    if (viejoA) m.delete(viejoA)
    if (viejoB) m.delete(viejoB)
    m.delete(uaId)
    m.delete(otroId)

    if (otroId) {
      m.set(uaId, otroId)
      m.set(otroId, uaId)
    }

    setPares(m)
    setUsarDefault(false)
  }

  const aplicarDefault = (checked: boolean) => {
    setUsarDefault(checked)
    if (!checked) {
      setPares(new Map())
      return
    }
    const m = new Map<string, string>()
    for (const [nombreA, nombreB] of EMPAREJAMIENTO_DEFAULT) {
      const a = uaPorNombre.get(nombreA)
      const b = uaPorNombre.get(nombreB)
      if (a && b) {
        m.set(a.id, b.id)
        m.set(b.id, a.id)
      }
    }
    setPares(m)
  }

  const validar = (): boolean => {
    const uasEmparejadas = new Set(pares.keys())
    if (uasEmparejadas.size === 0) {
      toast.error('No hay ningún emparejamiento definido')
      return false
    }
    if (uasEmparejadas.size !== uas.length) {
      const sinEmparejar = uas.filter(ua => !uasEmparejadas.has(ua.id))
      toast.error(`Faltan UA(s) por emparejar: ${sinEmparejar.map(u => u.nombre).join(', ')}`)
      return false
    }
    return true
  }

  const handleConfirmar = async () => {
    if (!validar()) return
    setGuardando(true)
    try {
      const visitados = new Set<string>()
      const paresLista: { unidadAId: string; unidadBId: string }[] = []
      for (const [uaId, otroId] of pares) {
        if (!visitados.has(uaId) && !visitados.has(otroId)) {
          paresLista.push({ unidadAId: uaId, unidadBId: otroId })
          visitados.add(uaId)
          visitados.add(otroId)
        }
      }
      await api.convocatorias.emparejamientos.guardar(convocatoriaId, { pares: paresLista })
      toast.success('Emparejamiento guardado correctamente')
      await cargarDatos()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar emparejamiento')
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Emparejamiento de UAs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={usarDefault}
            onChange={e => aplicarDefault(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          Usar emparejamiento default
        </label>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidad Académica</TableHead>
              <TableHead>Emparejada con</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uasSorted.map(ua => {
              const parejaId = parejaDe(ua.id)
              return (
                <TableRow key={ua.id}>
                  <TableCell className="font-medium">{ua.nombre}</TableCell>
                  <TableCell>
                    <Select
                      value={parejaId ?? ''}
                      onValueChange={v => handleSeleccionar(ua.id, v)}
                    >
                      <SelectTrigger className="w-[420px]">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">—</SelectItem>
                        {opcionesDisponibles(ua.id).map(o => (
                          <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        <div className="flex justify-end">
          <Button onClick={handleConfirmar} disabled={guardando}>
            {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {guardando ? 'Guardando...' : 'Confirmar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
