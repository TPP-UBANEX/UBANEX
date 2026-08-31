import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type {
  Convocatoria,
  Edicion,
  ParticipacionConvocatoria,
  PaginatedResponse,
} from '@/data/types';
import {
  estadoBadge,
  estadoConvocatoriaLabel,
  estadoEdicionLabel,
  EstadoEdicion,
  EstadoConvocatoria,
  RolUsuario,
  RolEjecucion,
} from '@/data/types';
import { NuevoProyectoDialog } from '@/components/NuevoProyectoDialog';
import { ResubirProyectoDialog } from '@/components/ResubirProyectoDialog';
import { EmparejamientoTab } from '@/components/EmparejamientoTab';
import { AsignacionEvaluadores } from '@/components/AsignacionEvaluadores';
import { FormularioBuilderTab } from '@/components/FormularioBuilderTab';
import { EvaluacionConfigTab } from '@/components/EvaluacionConfigTab';
import { AdjudicacionResolucionTab } from '@/components/AdjudicacionResolucionTab';
import { calcularPresupuestoAAdjudicar, formatearMoneda } from '@/lib/presupuesto';
import {
  ArrowLeft,
  Pencil,
  Plus,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

function erroresFechas(f: {
  fechaInicioPresentacion: string;
  fechaFinPresentacion: string;
  fechaInicioEvaluacion: string;
  fechaFinEvaluacion: string;
  fechaInicioEjecucion: string;
  fechaFinEjecucion: string;
}): Record<string, string> {
  const e: Record<string, string> = {};
  const p = (s: string) => (s ? new Date(s) : null);
  const ip = p(f.fechaInicioPresentacion),
    fp = p(f.fechaFinPresentacion);
  const ie = p(f.fechaInicioEvaluacion),
    fe = p(f.fechaFinEvaluacion);
  const iej = p(f.fechaInicioEjecucion),
    fej = p(f.fechaFinEjecucion);

  if (fp && ip && fp < ip) e.fechaFinPresentacion = 'Debe ser igual o posterior al inicio';
  if (ie && fp && ie < fp)
    e.fechaInicioEvaluacion = 'Debe ser posterior o igual a Fin Presentación';
  if (fe && ie && fe < ie) e.fechaFinEvaluacion = 'Debe ser igual o posterior al inicio';
  if (iej && fe && iej < fe) e.fechaInicioEjecucion = 'Debe ser posterior o igual a Fin Evaluación';
  if (fej && iej && fej < iej) e.fechaFinEjecucion = 'Debe ser igual o posterior al inicio';
  return e;
}

function validarFechas(f: Parameters<typeof erroresFechas>[0]): string | null {
  const errs = erroresFechas(f);
  return errs[Object.keys(errs)[0]] ?? null;
}

export function ConvocatoriaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conv, setConv] = useState<Convocatoria | null>(null);
  const [ediciones, setEdiciones] = useState<Edicion[]>([]);
  const [todasEdiciones, setTodasEdiciones] = useState<Edicion[]>([]);
  const [meta, setMeta] = useState<PaginatedResponse<Edicion>['meta'] | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState('todas');
  const [filtroAnio, setFiltroAnio] = useState('todas');
  const [filtroUA, setFiltroUA] = useState('todas');
  const [invitacionEvaluador, setInvitacionEvaluador] = useState<ParticipacionConvocatoria | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadingTabla, setLoadingTabla] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: '',
    descripcion: '',
    anio: new Date().getFullYear(),
    estado: '',
    fechaInicioPresentacion: '',
    fechaFinPresentacion: '',
    fechaInicioEvaluacion: '',
    fechaFinEvaluacion: '',
    fechaInicioEjecucion: '',
    fechaFinEjecucion: '',
    cuotaFederativa: 0,
    presupuestoTotal: 0,
    topePresupuestoNoConsolidado: 0,
    topePresupuestoConsolidado: 0,
    porcentajeExtraInsumos: 35,
    umbralInsumos: 40,
    porcentajeExtraPse: 15,
    umbralInconsistenciaCruzada: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmarMeritoOpen, setConfirmarMeritoOpen] = useState(false);
  const [ordenMeritoSort, setOrdenMeritoSort] = useState('puntaje-desc');
  const [tab, setTab] = useState('proyectos');

  const esUsuarioEjecucion = user?.roles.some(
    (r) => r === RolUsuario.Estudiante || r === RolUsuario.Docente,
  );
  const esRectorado = user?.roles.some(
    (r) => r === RolUsuario.AutoridadDeRectorado || r === RolUsuario.AsistenteDeRectorado,
  );
  const esAutoridadRectorado = user?.roles.includes(RolUsuario.AutoridadDeRectorado);
  const errores = erroresFechas(editForm);

  const [pasandoEvaluacionId, setPasandoEvaluacionId] = useState<string | null>(null);

  const pasarAEvaluacion = async (e: Edicion) => {
    setPasandoEvaluacionId(e.id);
    try {
      await api.proyectos.iniciarEvaluacion(e.proyectoId, e.id);
      toast.success('Edición pasada a evaluación');
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error('No se pudo pasar la edición a evaluación');
    } finally {
      setPasandoEvaluacionId(null);
    }
  };

  const esEvaluadorActivo = invitacionEvaluador !== null;

  const cargarDatos = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.convocatorias.get(id),
      api.proyectos.todas({ convocatoriaId: id }),
      api.participaciones.listarMias().catch(() => []),
    ])
      .then(([c, e, p]) => {
        setConv(c);
        setTodasEdiciones(e);
        const evaluador =
          (p as ParticipacionConvocatoria[]).find(
            (pc) => pc.convocatoriaId === id && pc.rol === RolEjecucion.Evaluador,
          ) ?? null;
        setInvitacionEvaluador(evaluador);
        setRefreshKey((k) => k + 1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarDatos();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoadingTabla(true);
    api.proyectos
      .list({
        convocatoriaId: id,
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        estado: filtroEtapa !== 'todas' ? filtroEtapa : undefined,
        anio: filtroAnio !== 'todas' ? Number(filtroAnio) : undefined,
      })
      .then((res) => {
        setEdiciones(res.data);
        setMeta(res.meta);
      })
      .catch(() => {})
      .finally(() => setLoadingTabla(false));
  }, [id, page, debouncedSearch, filtroEtapa, filtroAnio, refreshKey]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const cambiarEtapa = (v: string) => {
    setFiltroEtapa(v);
    setPage(1);
  };
  const cambiarAnio = (v: string) => {
    setFiltroAnio(v);
    setPage(1);
  };
  const cambiarUA = (v: string) => {
    setFiltroUA(v);
  };

  const edicionesOrdenadas = [...ediciones].sort((a, b) => {
    const oa = a.ordenMerito ?? null;
    const ob = b.ordenMerito ?? null;
    if (oa === null && ob === null) return 0;
    if (oa === null) return 1;
    if (ob === null) return -1;
    return oa - ob;
  });

  const unidadesAcademicas = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of todasEdiciones) {
      if (e.unidadAcademica?.id && e.unidadAcademica?.nombre) {
        map.set(e.unidadAcademica.id, e.unidadAcademica.nombre);
      }
    }
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [todasEdiciones]);

  const edicionesMeritoFuente = todasEdiciones;

  const edicionesMeritoFiltradas = useMemo(() => {
    const base = [...edicionesMeritoFuente]
      .filter((e) => e.ordenMerito != null)
      .filter((e) => filtroUA === 'todas' || e.unidadAcademicaId === filtroUA);
    switch (ordenMeritoSort) {
      case 'puntaje-desc':
        base.sort(
          (a, b) =>
            (b.puntajeMerito ?? 0) - (a.puntajeMerito ?? 0) ||
            (a.ordenMerito ?? 0) - (b.ordenMerito ?? 0) ||
            (a.id < b.id ? -1 : 1),
        );
        break;
      case 'puntaje-asc':
        base.sort(
          (a, b) =>
            (a.puntajeMerito ?? 0) - (b.puntajeMerito ?? 0) ||
            (a.ordenMerito ?? 0) - (b.ordenMerito ?? 0) ||
            (a.id < b.id ? -1 : 1),
        );
        break;
      case 'presupuesto-desc':
        base.sort(
          (a, b) =>
            calcularPresupuestoAAdjudicar(b.presupuestoSolicitado, conv, b.esPse).total -
              calcularPresupuestoAAdjudicar(a.presupuestoSolicitado, conv, a.esPse).total ||
            (a.ordenMerito ?? 0) - (b.ordenMerito ?? 0) ||
            (a.id < b.id ? -1 : 1),
        );
        break;
      case 'presupuesto-asc':
        base.sort(
          (a, b) =>
            calcularPresupuestoAAdjudicar(a.presupuestoSolicitado, conv, a.esPse).total -
              calcularPresupuestoAAdjudicar(b.presupuestoSolicitado, conv, b.esPse).total ||
            (a.ordenMerito ?? 0) - (b.ordenMerito ?? 0) ||
            (a.id < b.id ? -1 : 1),
        );
        break;
      default:
        base.sort((a, b) => (a.ordenMerito ?? 0) - (b.ordenMerito ?? 0));
    }
    return base;
  }, [edicionesMeritoFuente, filtroUA, ordenMeritoSort, conv]);

  const resumenPresupuesto = useMemo(() => {
    const total = Number(conv?.presupuestoTotal ?? 0);
    const adjudicados = todasEdiciones.filter((e) => e.adjudicacionPropuesta);
    const adjudicado = adjudicados.reduce(
      (s, e) => s + calcularPresupuestoAAdjudicar(e.presupuestoSolicitado, conv, e.esPse).total,
      0,
    );
    return {
      total,
      adjudicado,
      restante: Math.max(0, total - adjudicado),
      cantidad: adjudicados.length,
    };
  }, [conv, todasEdiciones]);


  const aplicarOrdenMerito = (actualizadas: Edicion[]) => {
    const map = new Map(actualizadas.map((e) => [e.id, e]));
    const fusionar = (prev: Edicion[]): Edicion[] =>
      prev.map((e) => {
        const u = map.get(e.id);
        return u
          ? {
              ...e,
              ordenMerito: u.ordenMerito,
              puntajeMerito: u.puntajeMerito,
              adjudicacionPropuesta: u.adjudicacionPropuesta,
              mecanismoAdjudicacion: u.mecanismoAdjudicacion,
            }
          : e;
      });
    setEdiciones(fusionar);
    setTodasEdiciones(fusionar);
  };

  const generarOrdenMerito = async () => {
    if (!conv?.id) return;
    try {
      setGenerando(true);
      const actualizadas = await api.evaluaciones.generarOrdenMerito(conv.id);
      aplicarOrdenMerito(actualizadas);
      toast.success('Orden de mérito generado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar el orden de mérito');
    } finally {
      setGenerando(false);
    }
  };

  const confirmarOrdenMerito = async () => {
    if (!conv?.id) return;
    try {
      setConfirmando(true);
      const actualizada = await api.evaluaciones.confirmarOrdenMerito(conv.id);
      setConv(actualizada);
      setConfirmarMeritoOpen(false);
      toast.success('Orden de mérito confirmado y fijado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al confirmar el orden de mérito');
    } finally {
      setConfirmando(false);
    }
  };

  const descargarMeritoCsv = () => {
    const filas = todasEdiciones
      .filter((e) => e.ordenMerito != null)
      .sort((a, b) => (a.ordenMerito ?? 0) - (b.ordenMerito ?? 0))
      .map((e) => {
        const aAdjudicar = calcularPresupuestoAAdjudicar(e.presupuestoSolicitado, conv, e.esPse);
        return [
          String(e.ordenMerito ?? ''),
          e.proyecto?.nombre || 'Sin nombre',
          e.unidadAcademica?.nombre || '-',
          e.puntajeMerito != null ? Number(e.puntajeMerito).toFixed(1).replace('.', ',') : '-',
          aAdjudicar.solicitado.toFixed(2).replace('.', ','),
          aAdjudicar.porcentajeInsumos.toFixed(1).replace('.', ','),
          aAdjudicar.extraInsumos.toFixed(2).replace('.', ','),
          aAdjudicar.extraPse.toFixed(2).replace('.', ','),
          aAdjudicar.total.toFixed(2).replace('.', ','),
          e.adjudicacionPropuesta === true
            ? 'Adjudicado'
            : e.adjudicacionPropuesta === false
              ? 'No adjudicado'
              : 'Sin evaluación',
          e.mecanismoAdjudicacion === 'MERITO'
            ? 'Mérito'
            : e.mecanismoAdjudicacion === 'CUOTA_FEDERATIVA'
              ? 'Cuota federativa'
              : '—',
        ];
      });
    const cabecera = [
      'Orden',
      'Proyecto',
      'Unidad Académica',
      'Puntaje',
      'Presupuesto solicitado',
      '% insumos',
      'Extra insumos',
      'Extra PSE',
      'Presupuesto a adjudicar',
      'Adjudicación',
      'Mecanismo',
    ];
    const contenido = [cabecera, ...filas]
      .map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orden-de-merito-${conv?.id ?? 'convocatoria'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const setAdjudicacion = async (
    e: Edicion,
    adjudicado: boolean,
    mecanismo?: 'MERITO' | 'CUOTA_FEDERATIVA',
  ) => {
    if (!esRectorado) return;
    if (adjudicado) {
      const costo = calcularPresupuestoAAdjudicar(e.presupuestoSolicitado, conv, e.esPse).total;
      // Si el proyecto ya está adjudicado, su costo ya está contado en el total
      // adjudicado: al cambiar solo el método no se suma presupuesto nuevo, así
      // que se descuenta del total para chequear solo el presupuesto adicional.
      const yaAdjudicado = e.adjudicacionPropuesta === true;
      const baseAdjudicado = resumenPresupuesto.adjudicado - (yaAdjudicado ? costo : 0);
      const restanteReal = resumenPresupuesto.total - baseAdjudicado;
      if (restanteReal < costo) {
        toast.error(
          `No hay presupuesto disponible para adjudicar este proyecto (restante ${formatearMoneda(restanteReal)}, costo ${formatearMoneda(costo)})`,
        );
        return;
      }
    }
    try {
      const actualizada = await api.evaluaciones.actualizarPropuestaAdjudicacion(
        e.id,
        adjudicado,
        mecanismo,
      );
      aplicarOrdenMerito([actualizada]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Error al actualizar la propuesta de adjudicación',
      );
    }
  };

  const abrirEdicion = () => {
    if (!conv) return;
    setEditForm({
      nombre: conv.nombre,
      descripcion: conv.descripcion || '',
      anio: conv.anio,
      estado: conv.estado,
      fechaInicioPresentacion: conv.fechaInicioPresentacion || '',
      fechaFinPresentacion: conv.fechaFinPresentacion || '',
      fechaInicioEvaluacion: conv.fechaInicioEvaluacion || '',
      fechaFinEvaluacion: conv.fechaFinEvaluacion || '',
      fechaInicioEjecucion: conv.fechaInicioEjecucion || '',
      fechaFinEjecucion: conv.fechaFinEjecucion || '',
      cuotaFederativa: conv.cuotaFederativa ?? 0,
      presupuestoTotal: conv.presupuestoTotal ?? 0,
      topePresupuestoNoConsolidado: conv.topePresupuestoNoConsolidado ?? 0,
      topePresupuestoConsolidado: conv.topePresupuestoConsolidado ?? 0,
      porcentajeExtraInsumos: conv.porcentajeExtraInsumos ?? 35,
      umbralInsumos: conv.umbralInsumos ?? 40,
      porcentajeExtraPse: conv.porcentajeExtraPse ?? 15,
      umbralInconsistenciaCruzada:
        conv.umbralInconsistenciaCruzada != null ? String(conv.umbralInconsistenciaCruzada) : '',
    });
    setEditOpen(true);
  };

  const handleGuardar = () => {
    if (!id || !conv) return;

    const errorFechas = validarFechas(editForm);
    if (errorFechas) {
      toast.error(errorFechas);
      return;
    }

    setConfirmEditOpen(true);
  };

  const ejecutarGuardar = async () => {
    setConfirmEditOpen(false);
    setGuardando(true);
    try {
      const umbral = editForm.umbralInconsistenciaCruzada.trim();
      const actualizada = await api.convocatorias.actualizar(id!, {
        ...editForm,
        umbralInconsistenciaCruzada: umbral === '' ? null : parseInt(umbral, 10),
        presupuestoTotal: editForm.presupuestoTotal > 0 ? editForm.presupuestoTotal : null,
        topePresupuestoNoConsolidado:
          editForm.topePresupuestoNoConsolidado > 0 ? editForm.topePresupuestoNoConsolidado : null,
        topePresupuestoConsolidado:
          editForm.topePresupuestoConsolidado > 0 ? editForm.topePresupuestoConsolidado : null,
      });
      setConv(actualizada);
      toast.success('Convocatoria actualizada correctamente');
      setEditOpen(false);
    } catch {
      toast.error('Error al actualizar la convocatoria');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = () => {
    if (!id || !conv) return;
    setConfirmDeleteOpen(true);
  };

  const ejecutarEliminar = async () => {
    setConfirmDeleteOpen(false);
    try {
      await api.convocatorias.eliminar(id!);
      toast.success('Convocatoria eliminada correctamente');
      navigate('/convocatorias');
    } catch {
      toast.error('Error al eliminar la convocatoria');
    }
  };

  if (loading) return <DetailSkeleton />;

  if (!conv)
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Convocatoria no encontrada</p>
      </div>
    );

  const conteo: Record<string, number> = {};
  Object.values(EstadoEdicion).forEach((estado) => {
    conteo[estado] = todasEdiciones.filter((e) => e.estado === estado).length;
  });

  const anios = [
    ...new Set(todasEdiciones.map((e) => e.anioEdicion).filter((a): a is number => a != null)),
  ].sort((a, b) => b - a);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/convocatorias')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground truncate" title={conv.nombre}>
              {conv.nombre}
            </h2>
            <Badge variant={estadoBadge[conv.estado]} className="shrink-0">
              {estadoConvocatoriaLabel[conv.estado] || conv.estado}
            </Badge>
          </div>
          {conv.descripcion && (
            <p className="text-sm text-muted-foreground truncate">{conv.descripcion}</p>
          )}
        </div>
        {user?.roles.includes(RolUsuario.AutoridadDeRectorado) && (
          <div className="flex gap-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={abrirEdicion}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar Convocatoria
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Editar Convocatoria</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4 min-w-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Nombre</p>
                    <Input
                      value={editForm.nombre}
                      onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Descripción</p>
                    <Input
                      value={editForm.descripcion}
                      onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Año</p>
                    <Input
                      type="number"
                      value={editForm.anio}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, anio: parseInt(e.target.value) || 0 }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Cuota federativa</p>
                    <Input
                      type="number"
                      min={0}
                      value={editForm.cuotaFederativa}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          cuotaFederativa: Math.max(0, parseInt(e.target.value) || 0),
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Cantidad mínima de proyectos adjudicados que debe tener cada unidad académica.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Presupuesto total máximo</p>
                    <Input
                      type="number"
                      min={0}
                      value={editForm.presupuestoTotal}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          presupuestoTotal: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Tope global de presupuesto. Limita la cantidad de proyectos que se pueden
                      adjudicar (en orden de mérito). Dejar en 0 para no acotar.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Tope de presupuesto solicitado — proyectos no consolidados
                    </p>
                    <Input
                      type="number"
                      min={0}
                      value={editForm.topePresupuestoNoConsolidado}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          topePresupuestoNoConsolidado: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Monto máximo del presupuesto solicitado por proyecto no consolidado. Dejar en
                      0 para no acotar.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Tope de presupuesto solicitado — proyectos consolidados
                    </p>
                    <Input
                      type="number"
                      min={0}
                      value={editForm.topePresupuestoConsolidado}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          topePresupuestoConsolidado: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Monto máximo del presupuesto solicitado por proyecto consolidado (aplica
                      también si el proyecto fue consolidado alguna vez, aunque esta edición le
                      toque evaluación). Dejar en 0 para no acotar.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Extra por insumos (%)</p>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editForm.porcentajeExtraInsumos}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          porcentajeExtraInsumos: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Porcentaje del presupuesto solicitado que se suma al presupuesto a adjudicar
                      cuando se supera el umbral de insumos. 0 desactiva el extra.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Umbral de insumos (%)</p>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editForm.umbralInsumos}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          umbralInsumos: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Porcentaje mínimo del presupuesto solicitado que debe corresponder a partidas
                      de bienes marcadas como insumo para que aplique el extra por insumos.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Extra por PSE (%)</p>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editForm.porcentajeExtraPse}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          porcentajeExtraPse: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Porcentaje del presupuesto solicitado que se suma al presupuesto a adjudicar
                      si el proyecto es una Práctica Social Educativa. 0 desactiva el extra.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Estado</p>
                    <Select
                      value={editForm.estado}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, estado: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="configuracion">Configuración</SelectItem>
                        <SelectItem value="presentacion">Presentación</SelectItem>
                        <SelectItem value="evaluacion">Evaluación</SelectItem>
                        <SelectItem value="ejecucion">Ejecución</SelectItem>
                        <SelectItem value="cierre">Cierre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="border rounded-lg p-3 space-y-3">
                    <p className="text-sm font-semibold">Presentación</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative min-h-[4.5rem]">
                        <p className="text-xs text-muted-foreground mt-1">Inicio</p>
                        <Input
                          type="date"
                          className="mt-1"
                          value={editForm.fechaInicioPresentacion}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, fechaInicioPresentacion: e.target.value }))
                          }
                        />
                        {errores.fechaInicioPresentacion && (
                          <p className="text-xs text-destructive mt-2">
                            {errores.fechaInicioPresentacion}
                          </p>
                        )}
                      </div>
                      <div className="relative min-h-[4.5rem]">
                        <p className="text-xs text-muted-foreground mt-1">Fin</p>
                        <Input
                          type="date"
                          className="mt-1"
                          value={editForm.fechaFinPresentacion}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, fechaFinPresentacion: e.target.value }))
                          }
                        />
                        {errores.fechaFinPresentacion && (
                          <p className="text-xs text-destructive mt-2">
                            {errores.fechaFinPresentacion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-3 space-y-3">
                    <p className="text-sm font-semibold">Evaluación</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative min-h-[4.5rem]">
                        <p className="text-xs text-muted-foreground mt-1">Inicio</p>
                        <Input
                          type="date"
                          className="mt-1"
                          value={editForm.fechaInicioEvaluacion}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, fechaInicioEvaluacion: e.target.value }))
                          }
                        />
                        {errores.fechaInicioEvaluacion && (
                          <p className="text-xs text-destructive mt-2">
                            {errores.fechaInicioEvaluacion}
                          </p>
                        )}
                      </div>
                      <div className="relative min-h-[4.5rem]">
                        <p className="text-xs text-muted-foreground mt-1">Fin</p>
                        <Input
                          type="date"
                          className="mt-1"
                          value={editForm.fechaFinEvaluacion}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, fechaFinEvaluacion: e.target.value }))
                          }
                        />
                        {errores.fechaFinEvaluacion && (
                          <p className="text-xs text-destructive mt-2">
                            {errores.fechaFinEvaluacion}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Umbral de inconsistencia (3ra UA) · vacío = default 20 pts
                      </p>
                      <Input
                        type="number"
                        min={0}
                        className="mt-1"
                        placeholder="20"
                        value={editForm.umbralInconsistenciaCruzada}
                        onChange={e => setEditForm(f => ({ ...f, umbralInconsistenciaCruzada: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="border rounded-lg p-3 space-y-3">
                    <p className="text-sm font-semibold">Ejecución</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative min-h-[4.5rem]">
                        <p className="text-xs text-muted-foreground mt-1">Inicio</p>
                        <Input
                          type="date"
                          className="mt-1"
                          value={editForm.fechaInicioEjecucion}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, fechaInicioEjecucion: e.target.value }))
                          }
                        />
                        {errores.fechaInicioEjecucion && (
                          <p className="text-xs text-destructive mt-2">
                            {errores.fechaInicioEjecucion}
                          </p>
                        )}
                      </div>
                      <div className="relative min-h-[4.5rem]">
                        <p className="text-xs text-muted-foreground mt-1">Fin</p>
                        <Input
                          type="date"
                          className="mt-1"
                          value={editForm.fechaFinEjecucion}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, fechaFinEjecucion: e.target.value }))
                          }
                        />
                        {errores.fechaFinEjecucion && (
                          <p className="text-xs text-destructive mt-2">
                            {errores.fechaFinEjecucion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleGuardar} disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="destructive" onClick={handleEliminar}>
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar Convocatoria
            </Button>

            <Dialog open={confirmEditOpen} onOpenChange={setConfirmEditOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Confirmar cambios</DialogTitle>
                  <DialogDescription>
                    ¿Estás seguro de que querés guardar los cambios en esta convocatoria?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmEditOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={ejecutarGuardar}>Confirmar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Eliminar convocatoria</DialogTitle>
                  <DialogDescription>
                    ¿Estás seguro de eliminar esta convocatoria? Esta acción no se puede deshacer.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={ejecutarEliminar}>
                    Eliminar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={confirmarMeritoOpen} onOpenChange={setConfirmarMeritoOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Confirmar orden de mérito</DialogTitle>
                  <DialogDescription>
                    Al confirmar, el orden de mérito y la adjudicación propuesta de todos los
                    proyectos de esta convocatoria quedarán fijos y no podrán volver a modificarse.
                    Esta acción no se puede deshacer.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmarMeritoOpen(false)}>
                    Cancelar
                  </Button>
                  <Button variant="default" onClick={confirmarOrdenMerito} disabled={confirmando}>
                    {confirmando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Confirmar y fijar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(conteo).map(([etapa, count]) => (
          <Card key={etapa}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium">
                {estadoEdicionLabel[etapa] || etapa}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="proyectos">Proyectos ({todasEdiciones.length})</TabsTrigger>
          {esRectorado && <TabsTrigger value="merito">Orden de Mérito</TabsTrigger>}
          {!esUsuarioEjecucion && <TabsTrigger value="evaluadores">Evaluadores</TabsTrigger>}
          <TabsTrigger value="detalle">Detalle</TabsTrigger>
          <TabsTrigger value="emparejamiento">Emparejamiento</TabsTrigger>
          {esRectorado && <TabsTrigger value="formulario">Formulario</TabsTrigger>}
          {esRectorado && <TabsTrigger value="evaluacion">Evaluación</TabsTrigger>}
        </TabsList>
        <TabsContent value="proyectos" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Proyectos Presentados</CardTitle>
              <div className="flex gap-2">
                {esUsuarioEjecucion && !esEvaluadorActivo && (
                  <>
                    <NuevoProyectoDialog
                      onCreated={cargarDatos}
                      convocatoriaId={conv?.id}
                      convocatoriaNombre={conv?.nombre}
                      trigger={
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Nuevo Proyecto
                        </Button>
                      }
                    />
                    <ResubirProyectoDialog
                      onResubido={cargarDatos}
                      convocatoriaId={conv?.id}
                      convocatoriaNombre={conv?.nombre}
                      trigger={<Button variant="outline">Resubir Proyecto</Button>}
                    />
                  </>
                )}
              </div>
            </CardHeader>
            {esUsuarioEjecucion && esEvaluadorActivo && (
              <div className="px-6 pb-4">
                <p className="text-sm bg-muted text-muted-foreground rounded-md px-3 py-2">
                  Sos evaluador de esta convocatoria. No podés presentar proyectos.
                </p>
              </div>
            )}
            <div className="px-6 pb-4 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filtroEtapa} onValueChange={cambiarEtapa}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las etapas</SelectItem>
                  {Object.values(EstadoEdicion).map((s) => (
                    <SelectItem key={s} value={s}>
                      {estadoEdicionLabel[s] || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroAnio} onValueChange={cambiarAnio}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Edición" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las ediciones</SelectItem>
                  {anios.map((a) => (
                    <SelectItem key={a} value={String(a)}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CardContent>
              {loadingTabla ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                      {[...Array(5)].map((_, j) => (
                        <Skeleton key={j} className="h-4 flex-1" />
                      ))}
                    </div>
                  ))}
                </div>
              ) : ediciones.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No hay proyectos que coincidan con la búsqueda
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Orden</TableHead>
                        <TableHead>Proyecto</TableHead>
                        <TableHead>Creado por</TableHead>
                        <TableHead>Facultad</TableHead>
                        <TableHead>Estado</TableHead>
                        {conv?.ordenMeritoConfirmado && <TableHead>Adjudicación</TableHead>}
                        <TableHead>Presupuesto solicitado</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {edicionesOrdenadas.map((e) => (
                        <TableRow
                          key={e.id}
                          className="cursor-pointer"
                          onClick={() =>
                            navigate(`/proyectos/${e.proyectoId}?convocatoria=${e.convocatoriaId}`)
                          }
                        >
                          <TableCell className="font-medium text-muted-foreground">
                            {e.ordenMerito ?? '—'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {e.proyecto?.nombre || 'Sin nombre'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {e.creadoPor?.nombreCompleto || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {e.unidadAcademica?.nombre || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={estadoBadge[e.estado]}>
                              {estadoEdicionLabel[e.estado] || e.estado}
                            </Badge>
                          </TableCell>
                          {conv?.ordenMeritoConfirmado && (
                            <TableCell>
                              {e.adjudicacionPropuesta === null ? (
                                <span className="text-xs text-muted-foreground">Sin evaluación</span>
                              ) : (
                                <Badge variant={e.adjudicacionPropuesta ? 'default' : 'outline'}>
                                  {e.adjudicacionPropuesta ? 'Adjudicado' : 'No adjudicado'}
                                </Badge>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="text-sm">
                            {formatearMoneda(e.presupuestoSolicitado?.montoTotal)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-end">
                              {esRectorado &&
                                conv?.estado === EstadoConvocatoria.Evaluacion &&
                                e.estado === EstadoEdicion.Presentado && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pasandoEvaluacionId === e.id}
                                    onClick={(e2) => {
                                      e2.stopPropagation();
                                      pasarAEvaluacion(e);
                                    }}
                                  >
                                    Pasar a evaluación
                                  </Button>
                                )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e2) => {
                                  e2.stopPropagation();
                                  navigate(
                                    `/proyectos/${e.proyectoId}?convocatoria=${e.convocatoriaId}`,
                                  );
                                }}
                              >
                                Ver
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {meta && meta.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 2)
                        .map((p, idx, arr) => (
                          <span key={p} className="flex items-center gap-1">
                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                              <span className="text-muted-foreground px-1">...</span>
                            )}
                            <Button
                              variant={p === page ? 'default' : 'outline'}
                              size="sm"
                              className="min-w-[2rem]"
                              onClick={() => setPage(p)}
                            >
                              {p}
                            </Button>
                          </span>
                        ))}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= meta.totalPages}
                        onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {esRectorado && (
          <TabsContent value="merito" className="mt-4">
            <Card>
              <CardHeader className="flex flex-col gap-3 space-y-0">
                <CardTitle className="text-sm font-medium">Orden de Mérito</CardTitle>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Select value={filtroUA} onValueChange={cambiarUA}>
                      <SelectTrigger className="w-72">
                        <SelectValue placeholder="Unidad académica" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas las unidades académicas</SelectItem>
                        {unidadesAcademicas.map((ua) => (
                          <SelectItem key={ua.id} value={ua.id}>
                            {ua.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  <Select value={ordenMeritoSort} onValueChange={setOrdenMeritoSort}>
                    <SelectTrigger className="w-60">
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="puntaje-desc">Puntaje (mayor a menor)</SelectItem>
                      <SelectItem value="puntaje-asc">Puntaje (menor a mayor)</SelectItem>
                      <SelectItem value="presupuesto-desc">A adjudicar (mayor a menor)</SelectItem>
                      <SelectItem value="presupuesto-asc">A adjudicar (menor a mayor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {esRectorado && (
                    <Button
                      variant="secondary"
                      onClick={generarOrdenMerito}
                      disabled={generando || !!conv?.ordenMeritoConfirmado}
                    >
                      {generando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Generar orden de mérito automático
                    </Button>
                  )}
                  {esAutoridadRectorado &&
                    (conv?.ordenMeritoConfirmado ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                        Orden de mérito confirmado
                      </Badge>
                    ) : todasEdiciones.some((e) => e.ordenMerito != null) ? (
                      <Button variant="default" onClick={() => setConfirmarMeritoOpen(true)}>
                        Confirmar orden de mérito
                      </Button>
                    ) : null)}
                  {esRectorado && conv?.ordenMeritoConfirmado && (
                    <Button variant="outline" onClick={descargarMeritoCsv}>
                      <Download className="h-4 w-4 mr-2" />
                      Descargar Excel
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {esRectorado && conv?.presupuestoTotal != null && conv.presupuestoTotal > 0 && (
                <div className="pb-4 mb-2 text-xs text-muted-foreground space-y-1 border-b">
                  <div>
                    Presupuesto total:{' '}
                    <span className="font-medium text-foreground">
                      {formatearMoneda(resumenPresupuesto.total)}
                    </span>
                    {' · '}Adjudicado (a adjudicar):{' '}
                    <span className="font-medium text-foreground">
                      {formatearMoneda(resumenPresupuesto.adjudicado)}
                    </span>
                    {' · '}Restante:{' '}
                    <span className="font-medium text-foreground">
                      {formatearMoneda(resumenPresupuesto.restante)}
                    </span>
                  </div>
                  <div>
                    Proyectos adjudicados:{' '}
                    <span className="font-medium text-foreground">
                      {resumenPresupuesto.cantidad}
                    </span>
                    {' · '}Cuota federativa mínima por unidad académica:{' '}
                    <span className="font-medium text-foreground">
                      {conv?.cuotaFederativa ?? 0}
                    </span>
                  </div>
                </div>
              )}
              {edicionesMeritoFiltradas.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {edicionesMeritoFuente.some((e) => e.ordenMerito != null)
                    ? 'No hay proyectos para la unidad académica seleccionada.'
                    : 'Generá el orden de mérito automático para ver el puntaje de cada proyecto.'}
                </div>
              ) : (
                    <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Orden</TableHead>
                      <TableHead>Proyecto</TableHead>
                      <TableHead>Unidad académica</TableHead>
                      <TableHead className="text-right">Puntaje</TableHead>
                      <TableHead className="text-right">Solicitado</TableHead>
                      <TableHead className="text-right">A adjudicar</TableHead>
                        <TableHead>Adjudicación propuesta</TableHead>
                        <TableHead>Mecanismo</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                    {edicionesMeritoFiltradas.map((e) => {
                      const aAdjudicar = calcularPresupuestoAAdjudicar(e.presupuestoSolicitado, conv, e.esPse);
                      return (
                      <TableRow
                        key={e.id}
                        className="cursor-pointer"
                        onClick={() =>
                          navigate(`/proyectos/${e.proyectoId}?convocatoria=${e.convocatoriaId}`)
                        }
                      >
                        <TableCell className="font-medium text-muted-foreground">
                          {e.ordenMerito}
                        </TableCell>
                        <TableCell className="font-medium">
                          {e.proyecto?.nombre || 'Sin nombre'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {e.unidadAcademica?.nombre || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {e.puntajeMerito != null ? Number(e.puntajeMerito).toFixed(1) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatearMoneda(aAdjudicar.solicitado)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatearMoneda(aAdjudicar.total)}
                          {(aAdjudicar.extraInsumos > 0 || aAdjudicar.extraPse > 0) && (
                            <div className="text-xs text-muted-foreground font-normal">
                              {aAdjudicar.extraInsumos > 0 && (
                                <>+{formatearMoneda(aAdjudicar.extraInsumos)} insumos</>
                              )}
                              {aAdjudicar.extraInsumos > 0 && aAdjudicar.extraPse > 0 && ' · '}
                              {aAdjudicar.extraPse > 0 && <>+{formatearMoneda(aAdjudicar.extraPse)} PSE</>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {e.adjudicacionPropuesta === null ? (
                            <span className="text-xs text-muted-foreground">Sin evaluación</span>
                          ) : esRectorado && !conv?.ordenMeritoConfirmado ? (
                            <Button
                              type="button"
                              variant={e.adjudicacionPropuesta ? 'default' : 'outline'}
                              size="sm"
                              disabled={
                                !e.adjudicacionPropuesta &&
                                resumenPresupuesto.total - resumenPresupuesto.adjudicado <
                                  aAdjudicar.total
                              }
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setAdjudicacion(e, !e.adjudicacionPropuesta);
                              }}
                            >
                              {e.adjudicacionPropuesta ? 'Desadjudicar' : 'Adjudicar'}
                            </Button>
                          ) : (
                            <Badge variant={e.adjudicacionPropuesta ? 'default' : 'outline'}>
                              {e.adjudicacionPropuesta ? 'Adjudicado' : 'No adjudicado'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {esRectorado && !conv?.ordenMeritoConfirmado && e.adjudicacionPropuesta ? (
                            <span onClick={(ev) => ev.stopPropagation()}>
                              <Select
                                value={e.mecanismoAdjudicacion ?? 'MERITO'}
                                onValueChange={(v) =>
                                  setAdjudicacion(e, true, v as 'MERITO' | 'CUOTA_FEDERATIVA')
                                }
                              >
                                <SelectTrigger className="h-8 w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MERITO">Mérito</SelectItem>
                                  <SelectItem value="CUOTA_FEDERATIVA">Cuota federativa</SelectItem>
                                </SelectContent>
                              </Select>
                            </span>
                          ) : e.mecanismoAdjudicacion === 'MERITO' ? (
                            'Mérito'
                          ) : e.mecanismoAdjudicacion === 'CUOTA_FEDERATIVA' ? (
                            'Cuota federativa'
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                  )}
            </CardContent>
          </Card>
          {id && conv?.ordenMeritoConfirmado && esAutoridadRectorado && (
            <div className="mt-4">
              <AdjudicacionResolucionTab
                convocatoriaId={id}
                onEmitida={() => {
                  cargarDatos();
                  setRefreshKey((k) => k + 1);
                }}
              />
            </div>
          )}
        </TabsContent>
        )}
        <TabsContent value="emparejamiento" className="mt-4">
          {id && conv && <EmparejamientoTab convocatoriaId={id} estadoConvocatoria={conv.estado} />}
        </TabsContent>
        {esRectorado && (
          <TabsContent value="formulario" className="mt-4">
            {id && conv && (
              <FormularioBuilderTab convocatoriaId={id} estadoConvocatoria={conv.estado} />
            )}
          </TabsContent>
        )}
        {esRectorado && (
          <TabsContent value="evaluacion" className="mt-4">
            {id && conv && (
              <EvaluacionConfigTab convocatoriaId={id} estadoConvocatoria={conv.estado} />
            )}
          </TabsContent>
        )}
        <TabsContent value="evaluadores" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {id && <AsignacionEvaluadores convocatoriaId={id} />}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="detalle" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">Año:</span> {conv.anio}
                </div>
                <div>
                  <span className="text-muted-foreground">Estado:</span>{' '}
                  {estadoConvocatoriaLabel[conv.estado] || conv.estado}
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Presentación</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Inicio:</span>{' '}
                    {conv.fechaInicioPresentacion || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fin:</span>{' '}
                    {conv.fechaFinPresentacion || '-'}
                  </div>
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Evaluación</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Inicio:</span>{' '}
                    {conv.fechaInicioEvaluacion || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fin:</span>{' '}
                    {conv.fechaFinEvaluacion || '-'}
                  </div>
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Ejecución</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Inicio:</span>{' '}
                    {conv.fechaInicioEjecucion || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fin:</span>{' '}
                    {conv.fechaFinEjecucion || '-'}
                  </div>
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Formulario</p>
                <p>
                  {conv.formulario?.campos?.length
                    ? `${conv.formulario.campos.length} campos definidos`
                    : 'Sin campos definidos'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-4 items-center">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-2">
          <div className="flex gap-3 items-center">
            <Skeleton className="h-7 w-72" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
