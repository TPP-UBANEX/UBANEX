import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { OrganizacionAsociada, CrearOrganizacionAsociadaDto } from '@/data/types'
import { EstadoEdicion } from '@/data/types'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface OrgFormState {
  nombre: string
  tipo: string
  personeriaJuridica: string
  fechaInicioActividades: string
  responsableNombre: string
  responsableCargo: string
  direccion: string
  localidad: string
  codigoPostal: string
  departamentoPartido: string
  provincia: string
  telefonos: string
  email: string
  web: string
  objetivos: string
  actividades: string
  otraInfo: string
}

const formVacio: OrgFormState = {
  nombre: '', tipo: '', personeriaJuridica: '', fechaInicioActividades: '',
  responsableNombre: '', responsableCargo: '', direccion: '', localidad: '',
  codigoPostal: '', departamentoPartido: '', provincia: '', telefonos: '',
  email: '', web: '', objetivos: '', actividades: '', otraInfo: '',
}

const ESTADOS_EDITABLES = [EstadoEdicion.Borrador, EstadoEdicion.PendienteDeCambios]

export function OrganizacionesTab({
  edicionId,
  estado,
  puedeEditar,
}: {
  edicionId?: string
  estado?: EstadoEdicion
  puedeEditar: boolean
}) {
  const [orgs, setOrgs] = useState<OrganizacionAsociada[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<OrgFormState>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!edicionId) return
    setLoading(true)
    try {
      setOrgs(await api.organizaciones.listar(edicionId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar organizaciones')
    } finally {
      setLoading(false)
    }
  }, [edicionId])

  useEffect(() => { cargar() }, [cargar])

  const editable = !!estado && ESTADOS_EDITABLES.includes(estado)
  const permitidoEditar = editable && puedeEditar

  const abrirNuevo = () => {
    setEditandoId(null)
    setForm(formVacio)
    setModalOpen(true)
  }

  const abrirEditar = (org: OrganizacionAsociada) => {
    setEditandoId(org.id)
    setForm({
      nombre: org.nombre,
      tipo: org.tipo ?? '',
      personeriaJuridica: org.personeriaJuridica ?? '',
      fechaInicioActividades: org.fechaInicioActividades ?? '',
      responsableNombre: org.responsableNombre ?? '',
      responsableCargo: org.responsableCargo ?? '',
      direccion: org.direccion ?? '',
      localidad: org.localidad ?? '',
      codigoPostal: org.codigoPostal ?? '',
      departamentoPartido: org.departamentoPartido ?? '',
      provincia: org.provincia ?? '',
      telefonos: org.telefonos ?? '',
      email: org.email ?? '',
      web: org.web ?? '',
      objetivos: org.objetivos ?? '',
      actividades: org.actividades ?? '',
      otraInfo: org.otraInfo ?? '',
    })
    setModalOpen(true)
  }

  const guardar = async () => {
    if (!form.nombre.trim()) {
      toast.error('El nombre de la organización es obligatorio')
      return
    }
    setGuardando(true)
    try {
      const t = (v: string) => v.trim() || undefined
      const payload: CrearOrganizacionAsociadaDto = {
        nombre: form.nombre.trim(),
        tipo: t(form.tipo),
        personeriaJuridica: t(form.personeriaJuridica),
        fechaInicioActividades: form.fechaInicioActividades || undefined,
        responsableNombre: t(form.responsableNombre),
        responsableCargo: t(form.responsableCargo),
        direccion: t(form.direccion),
        localidad: t(form.localidad),
        codigoPostal: t(form.codigoPostal),
        departamentoPartido: t(form.departamentoPartido),
        provincia: t(form.provincia),
        telefonos: t(form.telefonos),
        email: t(form.email),
        web: t(form.web),
        objetivos: t(form.objetivos),
        actividades: t(form.actividades),
        otraInfo: t(form.otraInfo),
      }
      if (editandoId) {
        await api.organizaciones.actualizar(editandoId, payload)
        toast.success('Organización modificada')
      } else {
        if (!edicionId) return
        await api.organizaciones.crear(edicionId, payload)
        toast.success('Organización agregada')
      }
      setModalOpen(false)
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar la organización')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    setEliminandoId(id)
    try {
      await api.organizaciones.eliminar(id)
      toast.success('Organización eliminada')
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la organización')
    } finally {
      setEliminandoId(null)
    }
  }

  const set = (campo: keyof OrgFormState, valor: string) =>
    setForm(prev => ({ ...prev, [campo]: valor }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-medium">Organizaciones asociadas</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Organizaciones sociales participantes del proyecto (escuelas, asociaciones civiles,
            fundaciones, cooperativas, etc.).
          </p>
        </div>
        {permitidoEditar && (
          <Button size="sm" onClick={abrirNuevo}>
            <Plus className="h-3 w-3 mr-1" />Agregar organización
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : orgs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aún no se cargaron organizaciones asociadas.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organización</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Contacto</TableHead>
                {permitidoEditar && <TableHead className="w-24 text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map(org => (
                <TableRow key={org.id}>
                  <TableCell>
                    <p className="font-medium">{org.nombre}</p>
                    {org.tipo && <p className="text-xs text-muted-foreground">{org.tipo}</p>}
                    {(org.localidad || org.provincia) && (
                      <p className="text-xs text-muted-foreground">
                        {[org.localidad, org.provincia].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {org.responsableNombre || '-'}
                    {org.responsableCargo && (
                      <span className="text-xs text-muted-foreground"> — {org.responsableCargo}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {org.telefonos && <div>{org.telefonos}</div>}
                    {org.email && <div className="break-all">{org.email}</div>}
                    {!org.telefonos && !org.email && '-'}
                  </TableCell>
                  {permitidoEditar && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => abrirEditar(org)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={eliminandoId === org.id}
                          onClick={() => eliminar(org.id)}
                        >
                          {eliminandoId === org.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Trash2 className="h-3 w-3 text-destructive" />}
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {permitidoEditar && (
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editandoId ? 'Editar organización' : 'Nueva organización'}</DialogTitle>
                <DialogDescription>
                  Datos de la organización social participante del proyecto.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium">Nombre y tipo *</label>
                    <Input placeholder="Nombre de la organización" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Tipo</label>
                    <Input placeholder="Asociación civil, fundación, escuela…" value={form.tipo} onChange={e => set('tipo', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Personería jurídica N°</label>
                    <Input value={form.personeriaJuridica} onChange={e => set('personeriaJuridica', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Fecha de inicio de actividades</label>
                    <Input type="date" value={form.fechaInicioActividades} onChange={e => set('fechaInicioActividades', e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Responsable</label>
                    <Input value={form.responsableNombre} onChange={e => set('responsableNombre', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Cargo del responsable</label>
                    <Input value={form.responsableCargo} onChange={e => set('responsableCargo', e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium">Dirección (calle y número)</label>
                    <Input value={form.direccion} onChange={e => set('direccion', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Localidad</label>
                    <Input value={form.localidad} onChange={e => set('localidad', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Código postal</label>
                    <Input value={form.codigoPostal} onChange={e => set('codigoPostal', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Departamento / Partido</label>
                    <Input value={form.departamentoPartido} onChange={e => set('departamentoPartido', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Provincia</label>
                    <Input value={form.provincia} onChange={e => set('provincia', e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Teléfonos</label>
                    <Input value={form.telefonos} onChange={e => set('telefonos', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Correo electrónico</label>
                    <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium">Página o sitio web</label>
                    <Input value={form.web} onChange={e => set('web', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Objetivos de la organización</label>
                  <Textarea className="min-h-[70px]" value={form.objetivos} onChange={e => set('objetivos', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Principales actividades</label>
                  <Textarea className="min-h-[70px]" value={form.actividades} onChange={e => set('actividades', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Otra información importante</label>
                  <Textarea className="min-h-[60px]" value={form.otraInfo} onChange={e => set('otraInfo', e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button onClick={guardar} disabled={guardando}>
                  {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editandoId ? 'Guardar cambios' : 'Agregar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}
