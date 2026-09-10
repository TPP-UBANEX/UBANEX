import { useState } from 'react'
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
import type { OrganizacionAsociada, CrearOrganizacionAsociadaDto } from '@/data/types'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

/** Ítem de organización en edición (campos como texto; `id` sólo si ya existe en el backend). */
export interface OrganizacionEdit {
  _key: string
  id?: string
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

let contadorKey = 0
const nuevaKey = () => `org-${Date.now()}-${contadorKey++}`

export function organizacionVacia(): OrganizacionEdit {
  return {
    _key: nuevaKey(), nombre: '', tipo: '', personeriaJuridica: '', fechaInicioActividades: '',
    responsableNombre: '', responsableCargo: '', direccion: '', localidad: '', codigoPostal: '',
    departamentoPartido: '', provincia: '', telefonos: '', email: '', web: '', objetivos: '',
    actividades: '', otraInfo: '',
  }
}

export function organizacionAEdit(org: OrganizacionAsociada): OrganizacionEdit {
  return {
    _key: nuevaKey(),
    id: org.id,
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
  }
}

export function editAPayload(e: OrganizacionEdit): CrearOrganizacionAsociadaDto {
  const t = (v: string) => v.trim() || undefined
  return {
    nombre: e.nombre.trim(),
    tipo: t(e.tipo),
    personeriaJuridica: t(e.personeriaJuridica),
    fechaInicioActividades: e.fechaInicioActividades || undefined,
    responsableNombre: t(e.responsableNombre),
    responsableCargo: t(e.responsableCargo),
    direccion: t(e.direccion),
    localidad: t(e.localidad),
    codigoPostal: t(e.codigoPostal),
    departamentoPartido: t(e.departamentoPartido),
    provincia: t(e.provincia),
    telefonos: t(e.telefonos),
    email: t(e.email),
    web: t(e.web),
    objetivos: t(e.objetivos),
    actividades: t(e.actividades),
    otraInfo: t(e.otraInfo),
  }
}

interface OrganizacionesTabProps {
  /** Lista persistida (para la vista de solo lectura). */
  organizaciones: OrganizacionAsociada[]
  /** Si el proyecto está en modo edición ("Editar proyecto"). */
  editando: boolean
  /** Lista en edición (staged); se persiste con el "Guardar" global del proyecto. */
  value: OrganizacionEdit[]
  onChange: (next: OrganizacionEdit[]) => void
}

/**
 * Pestaña de organizaciones asociadas. En solo lectura muestra la lista persistida; en modo
 * edición (dentro de "Editar proyecto") permite agregar/editar/quitar, y los cambios se
 * guardan junto con el resto del proyecto al tocar "Guardar".
 */
export function OrganizacionesTab({ organizaciones, editando, value, onChange }: OrganizacionesTabProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<OrganizacionEdit>(organizacionVacia())
  const esNuevo = !value.some(o => o._key === form._key)

  const set = (campo: keyof OrganizacionEdit, valor: string) =>
    setForm(prev => ({ ...prev, [campo]: valor }))

  const abrirNuevo = () => {
    setForm(organizacionVacia())
    setModalOpen(true)
  }

  const abrirEditar = (org: OrganizacionEdit) => {
    setForm({ ...org })
    setModalOpen(true)
  }

  const confirmar = () => {
    if (!form.nombre.trim()) {
      toast.error('El nombre de la organización es obligatorio')
      return
    }
    onChange(esNuevo ? [...value, form] : value.map(o => (o._key === form._key ? form : o)))
    setModalOpen(false)
  }

  const quitar = (key: string) => onChange(value.filter(o => o._key !== key))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Organizaciones asociadas</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Organizaciones sociales participantes del proyecto (escuelas, asociaciones civiles,
          fundaciones, cooperativas, etc.).
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {editando ? (
          <OrganizacionesEditor value={value} onAgregar={abrirNuevo} onEditar={abrirEditar} onQuitar={quitar} />
        ) : (
          <OrganizacionesLectura organizaciones={organizaciones} />
        )}

        {editando && (
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{esNuevo ? 'Nueva organización' : 'Editar organización'}</DialogTitle>
                <DialogDescription>
                  Datos de la organización social participante del proyecto.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium">Nombre de la organización *</label>
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
                <Button onClick={confirmar}>{esNuevo ? 'Agregar' : 'Guardar cambios'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}

function OrganizacionesLectura({ organizaciones }: { organizaciones: OrganizacionAsociada[] }) {
  if (organizaciones.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Aún no se cargaron organizaciones asociadas.
      </p>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Organización</TableHead>
          <TableHead>Responsable</TableHead>
          <TableHead>Contacto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {organizaciones.map(org => (
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function OrganizacionesEditor({
  value, onAgregar, onEditar, onQuitar,
}: {
  value: OrganizacionEdit[]
  onAgregar: () => void
  onEditar: (org: OrganizacionEdit) => void
  onQuitar: (key: string) => void
}) {
  return (
    <div className="space-y-3">
      {value.length === 0 ? (
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
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {value.map(org => (
              <TableRow key={org._key}>
                <TableCell>
                  <p className="font-medium">{org.nombre || '(sin nombre)'}</p>
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
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onEditar(org)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onQuitar(org._key)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Button size="sm" onClick={onAgregar}>
        <Plus className="h-3 w-3 mr-1" />Agregar organización
      </Button>
    </div>
  )
}
