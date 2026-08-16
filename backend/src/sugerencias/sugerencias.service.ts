import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SugerenciaCambio } from './sugerencia-cambio.entity';
import { Notificacion } from './notificacion.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { Proyecto } from '../proyectos/proyecto.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { CampoFormulario } from '../formularios/campo-formulario.interface';
import { validarValoresFormulario } from '../formularios/campo-formulario.util';
import { Presupuesto } from '../proyectos/presupuesto.interface';
import {
  esRutaComentarioPresupuesto, etiquetaCampoPresupuesto, normalizarPresupuesto,
  parsearRutaPartida, validarPresupuesto,
} from '../proyectos/presupuesto.util';
import { TipoRubro } from '../common/enums/tipo-rubro.enum';
import { Usuario } from '../usuarios/usuario.entity';
import { CrearSugerenciaDto } from './dto/crear-sugerencia.dto';
import { ResponderSugerenciaDto } from './dto/responder-sugerencia.dto';
import { EstadoSugerencia } from '../common/enums/estado-sugerencia.enum';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { TipoNotificacion } from '../common/enums/tipo-notificacion.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';
import { TipoCampo, TIPOS_VALOR_OBJETO } from '../common/enums/tipo-campo.enum';

@Injectable()
export class SugerenciasService {
  constructor(
    @InjectRepository(SugerenciaCambio)
    private readonly sugerenciaRepo: Repository<SugerenciaCambio>,
    @InjectRepository(Notificacion)
    private readonly notificacionRepo: Repository<Notificacion>,
    @InjectRepository(Edicion)
    private readonly edicionRepo: Repository<Edicion>,
    @InjectRepository(Proyecto)
    private readonly proyectoRepo: Repository<Proyecto>,
    @InjectRepository(ParticipacionConvocatoria)
    private readonly participacionRepo: Repository<ParticipacionConvocatoria>,
    @InjectRepository(Convocatoria)
    private readonly convocatoriaRepo: Repository<Convocatoria>,
  ) {}

  async crear(edicionId: string, dto: CrearSugerenciaDto, usuario: Usuario) {
    const edicion = await this.obtenerEdicion(edicionId);
    await this.validarSecretariaMismaUA(edicion, usuario);

    if (edicion.estado !== EstadoEdicion.Presentado) {
      throw new BadRequestException(
        `Solo se pueden sugerir cambios cuando la edición está en estado ${EstadoEdicion.Presentado}`,
      );
    }

    const proyecto = await this.proyectoRepo.findOneBy({ id: edicion.proyectoId });
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

    const valorActual = this.obtenerValorActual(edicion, proyecto, dto.campo);
    const valorSugerido = dto.valorSugerido?.trim() ? dto.valorSugerido.trim() : null;
    await this.validarValorSugerido(edicion, dto.campo, valorSugerido);

    const pendienteExistente = await this.sugerenciaRepo.findOne({
      where: {
        edicionId,
        sugeridoPorId: usuario.id,
        campo: dto.campo,
        estado: EstadoSugerencia.Pendiente,
      },
    });

    if (pendienteExistente) {
      pendienteExistente.valorActual = valorActual;
      pendienteExistente.valorSugerido = valorSugerido;
      pendienteExistente.comentario = dto.comentario;
      pendienteExistente.estado = EstadoSugerencia.Pendiente;
      pendienteExistente.respuestaDirector = null;
      pendienteExistente.respondidoEn = null;
      pendienteExistente.creadoEn = new Date();
      await this.sugerenciaRepo.save(pendienteExistente);

      return this.sugerenciaRepo.findOne({
        where: { id: pendienteExistente.id },
        relations: { sugeridoPor: true },
      });
    }

    const sugerencia = await this.sugerenciaRepo.save(
      this.sugerenciaRepo.create({
        edicionId,
        sugeridoPorId: usuario.id,
        campo: dto.campo,
        valorActual,
        valorSugerido,
        comentario: dto.comentario,
        estado: EstadoSugerencia.Pendiente,
      }),
    );

    await this.notificarDirectores(edicion, proyecto, usuario, sugerencia);

    return this.sugerenciaRepo.findOne({
      where: { id: sugerencia.id },
      relations: { sugeridoPor: true },
    });
  }

  async listar(edicionId: string, usuario: Usuario) {
    const edicion = await this.obtenerEdicion(edicionId);
    await this.validarAccesoALista(edicion, usuario);

    return this.sugerenciaRepo.find({
      where: { edicionId },
      relations: { sugeridoPor: true },
      order: { creadoEn: 'DESC' },
    });
  }

  async responder(id: string, dto: ResponderSugerenciaDto, usuario: Usuario) {
    const sugerencia = await this.sugerenciaRepo.findOne({
      where: { id },
      relations: { edicion: { proyecto: true }, sugeridoPor: true },
    });
    if (!sugerencia) throw new NotFoundException('Sugerencia no encontrada');

    await this.validarDirectorOCreador(sugerencia.edicion, usuario);

    if (sugerencia.estado !== EstadoSugerencia.Pendiente) {
      throw new BadRequestException('La sugerencia ya fue respondida');
    }

    sugerencia.estado = dto.estado;
    sugerencia.respuestaDirector = dto.respuestaDirector ?? null;
    sugerencia.respondidoEn = new Date();

    if (dto.estado === EstadoSugerencia.Aceptada) {
      await this.aplicarCambio(sugerencia.edicion, sugerencia.campo, sugerencia.valorSugerido);
    }

    await this.sugerenciaRepo.save(sugerencia);

    await this.notificarRespuesta(sugerencia, usuario);

    return this.sugerenciaRepo.findOne({
      where: { id: sugerencia.id },
      relations: { sugeridoPor: true },
    });
  }

  async listarNotificaciones(usuario: Usuario) {
    return this.notificacionRepo.find({
      where: { usuarioId: usuario.id },
      relations: {
        sugerencia: { edicion: { proyecto: true }, sugeridoPor: true },
        participacion: { convocatoria: true, usuario: true },
      },
      order: { creadoEn: 'DESC' },
      take: 50,
    });
  }

  async marcarLeida(id: string, usuario: Usuario) {
    const notif = await this.notificacionRepo.findOneBy({ id, usuarioId: usuario.id });
    if (!notif) throw new NotFoundException('Notificación no encontrada');
    notif.leida = true;
    await this.notificacionRepo.save(notif);
    return { message: 'Notificación marcada como leída' };
  }

  async marcarTodasLeidas(usuario: Usuario) {
    await this.notificacionRepo.update(
      { usuarioId: usuario.id, leida: false },
      { leida: true },
    );
    return { message: 'Todas las notificaciones marcadas como leídas' };
  }

  async eliminar(id: string, usuario: Usuario) {
    const notif = await this.notificacionRepo.findOneBy({ id, usuarioId: usuario.id });
    if (!notif) throw new NotFoundException('Notificación no encontrada');
    await this.notificacionRepo.delete(id);
    return { message: 'Notificación eliminada' };
  }

  private async obtenerEdicion(id: string): Promise<Edicion> {
    const edicion = await this.edicionRepo.findOne({
      where: { id },
      relations: { proyecto: true, creadoPor: true, unidadAcademica: true },
    });
    if (!edicion) throw new NotFoundException('Edición no encontrada');
    return edicion;
  }

  private esSecretaria(usuario: Usuario): boolean {
    return usuario.roles.some(r =>
      r === RolUsuario.AutoridadDeSecretaria || r === RolUsuario.AsistenteDeSecretaria,
    );
  }

  private esRectorado(usuario: Usuario): boolean {
    return usuario.roles.some(r =>
      r === RolUsuario.AutoridadDeRectorado || r === RolUsuario.AsistenteDeRectorado,
    );
  }

  private async validarSecretariaMismaUA(edicion: Edicion, usuario: Usuario) {
    if (this.esRectorado(usuario)) return;
    if (!this.esSecretaria(usuario)) {
      throw new ForbiddenException('Solo Secretaría puede sugerir cambios');
    }
    if (usuario.unidadAcademicaId !== edicion.unidadAcademicaId) {
      throw new ForbiddenException('Solo la Secretaría de la misma UA puede sugerir cambios');
    }
  }

  private async validarAccesoALista(edicion: Edicion, usuario: Usuario) {
    if (this.esRectorado(usuario)) return;
    if (this.esSecretaria(usuario) && usuario.unidadAcademicaId === edicion.unidadAcademicaId) return;
    if (edicion.creadoPorId === usuario.id) return;
    const esDirector = await this.participacionRepo.findOneBy({
      edicionId: edicion.id,
      usuarioId: usuario.id,
      rol: RolEjecucion.DirectorDeProyecto,
    });
    if (esDirector) return;
    throw new ForbiddenException('No tenés acceso a las sugerencias de esta edición');
  }

  private async validarDirectorOCreador(edicion: Edicion, usuario: Usuario) {
    if (this.esRectorado(usuario)) return;
    if (edicion.creadoPorId === usuario.id) return;
    const esDirector = await this.participacionRepo.findOneBy({
      edicionId: edicion.id,
      usuarioId: usuario.id,
      rol: RolEjecucion.DirectorDeProyecto,
    });
    if (!esDirector) {
      throw new ForbiddenException('Solo el creador o director del proyecto puede responder sugerencias');
    }
  }

  private obtenerValorActual(edicion: Edicion, proyecto: Proyecto, campo: string): string | null {
    switch (campo) {
      case 'nombre': return proyecto.nombre;
      case 'esConsolidado': return String(proyecto.esConsolidado);
      case 'esInterfacultad': return String(proyecto.esInterfacultad);
      case 'anioEdicion': return edicion.anioEdicion != null ? String(edicion.anioEdicion) : null;
      default:
        if (campo.startsWith('presupuesto.')) {
          const path = campo.replace('presupuesto.', '');
          if (!parsearRutaPartida(path)) return null;
          return this.obtenerValorJson(edicion.presupuesto, path);
        }
        if (campo.startsWith('datosFormulario.')) {
          return this.obtenerValorJson(edicion.datosFormulario, campo.replace('datosFormulario.', ''));
        }
        return null;
    }
  }

  private obtenerValorJson(obj: unknown, path: string): string | null {
    try {
      const partes = path.match(/[^.[\]]+/g);
      if (!partes) return null;
      let valor: unknown = obj;
      for (const parte of partes) {
        if (valor == null || typeof valor !== 'object') return null;
        valor = (valor as Record<string, unknown>)[parte];
      }
      if (valor == null) return null;
      // Un campo de geolocalizacion guarda un objeto: se serializa para viajar por la columna text.
      return typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
    } catch {
      return null;
    }
  }

  /** Intenta interpretar el valor sugerido como el objeto { nombre, ... } de un campo de geolocalizacion o usuario.
   *  Si no es JSON valido (se sugirio como texto libre), lo trata como el nombre. */
  private parsearValorObjeto(valor: string): unknown {
    try {
      const parsed: unknown = JSON.parse(valor);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      // no era JSON: se interpreta como texto libre
    }
    return { nombre: valor };
  }

  /** Los campos cuyo valor es un objeto viajan serializados por la columna text de la sugerencia. */
  private valorParaCampo(tipo: TipoCampo | undefined, valorSugerido: string): unknown {
    return tipo && TIPOS_VALOR_OBJETO.includes(tipo) ? this.parsearValorObjeto(valorSugerido) : valorSugerido;
  }

  private async aplicarCambio(edicion: Edicion, campo: string, valorSugerido: string | null) {
    if (valorSugerido == null) return;
    const proyecto = await this.proyectoRepo.findOneBy({ id: edicion.proyectoId });
    if (!proyecto) return;

    switch (campo) {
      case 'nombre':
        proyecto.nombre = valorSugerido;
        await this.proyectoRepo.save(proyecto);
        break;
      case 'esConsolidado':
        proyecto.esConsolidado = valorSugerido === 'true';
        await this.proyectoRepo.save(proyecto);
        break;
      case 'esInterfacultad':
        proyecto.esInterfacultad = valorSugerido === 'true';
        await this.proyectoRepo.save(proyecto);
        break;
      case 'anioEdicion':
        edicion.anioEdicion = parseInt(valorSugerido, 10) || null;
        await this.edicionRepo.save(edicion);
        break;
      default:
        if (campo.startsWith('presupuesto.')) {
          this.aplicarCambioPresupuesto(edicion, campo.replace('presupuesto.', ''), valorSugerido);
          await this.edicionRepo.save(edicion);
        } else if (campo.startsWith('datosFormulario.')) {
          const campoId = campo.replace('datosFormulario.', '');
          const campoFormulario = (await this.obtenerCamposFormulario(edicion.convocatoriaId))
            .find(c => c.id === campoId);
          const valor = this.valorParaCampo(campoFormulario?.tipo, valorSugerido);
          this.aplicarCambioJson(edicion, campoId, valor);
          await this.edicionRepo.save(edicion);
        }
    }
  }

  /**
   * Escribe el valor sugerido en la partida existente, casteando al tipo correcto (los campos
   * numéricos no viajan como string), y revalida + recalcula todo el presupuesto antes de guardar.
   * A diferencia de aplicarCambioJson, nunca crea nodos intermedios: si la partida ya no existe
   * (se borró desde que se sugirió el cambio), se rechaza en vez de reconstruirla a ciegas.
   */
  private aplicarCambioPresupuesto(edicion: Edicion, path: string, valorSugerido: string): void {
    const ruta = parsearRutaPartida(path);
    if (!ruta || !edicion.presupuesto) {
      throw new BadRequestException('No se puede aplicar ese cambio de presupuesto');
    }
    const rubro = edicion.presupuesto.rubros[ruta.rubroIndice];
    const partidaExistente = rubro?.partidas?.[ruta.partidaIndice];
    if (!rubro || !partidaExistente) {
      throw new BadRequestException('No se puede aplicar ese cambio: la partida ya no existe');
    }

    const valor = ['monto', 'cantidad', 'precioUnitario'].includes(ruta.campo)
      ? Number(valorSugerido)
      : valorSugerido;
    if (typeof valor === 'number' && !Number.isFinite(valor)) {
      throw new BadRequestException('El valor sugerido debe ser un número válido');
    }

    const nuevoPresupuesto: Presupuesto = JSON.parse(JSON.stringify(edicion.presupuesto));
    const partida = nuevoPresupuesto.rubros[ruta.rubroIndice].partidas[ruta.partidaIndice] as unknown as
      Record<string, unknown>;
    partida[ruta.campo] = valor;

    validarPresupuesto(nuevoPresupuesto);
    edicion.presupuesto = normalizarPresupuesto(nuevoPresupuesto);
  }

  private aplicarCambioJson(edicion: Edicion, path: string, valor: unknown) {
    const obj = edicion.datosFormulario ? JSON.parse(JSON.stringify(edicion.datosFormulario)) : {};
    const partes = path.match(/[^.[\]]+/g);
    if (!partes || partes.length === 0) return;

    let actual = obj;
    for (let i = 0; i < partes.length - 1; i++) {
      if (actual[partes[i]] == null) actual[partes[i]] = {};
      actual = actual[partes[i]];
    }
    actual[partes[partes.length - 1]] = valor;
    edicion.datosFormulario = obj;
  }

  private async notificarDirectores(edicion: Edicion, proyecto: Proyecto, sugeridoPor: Usuario, sugerencia: SugerenciaCambio) {
    const destinatarios = new Set<string>();

    destinatarios.add(edicion.creadoPorId);

    const directores = await this.participacionRepo.find({
      where: { edicionId: edicion.id, rol: RolEjecucion.DirectorDeProyecto },
    });
    directores.forEach(d => destinatarios.add(d.usuarioId));

    const campos = await this.obtenerCamposFormulario(edicion.convocatoriaId);
    const nombreCampo = this.nombreLegible(sugerencia.campo, campos, edicion.presupuesto);
    const mensaje = `${sugeridoPor.nombreCompleto} sugirió un cambio en "${nombreCampo}" del proyecto "${proyecto.nombre}"`;

    for (const usuarioId of destinatarios) {
      if (usuarioId === sugeridoPor.id) continue;
      await this.notificacionRepo.save(
        this.notificacionRepo.create({
          usuarioId,
          tipo: TipoNotificacion.NUEVA_SUGERENCIA,
          sugerenciaId: sugerencia.id,
          mensaje,
        }),
      );
    }
  }

  private async notificarRespuesta(sugerencia: SugerenciaCambio, respondidoPor: Usuario) {
    const accionTexto: Record<string, string> = {
      [EstadoSugerencia.Aceptada]: 'aceptó',
      [EstadoSugerencia.Rechazada]: 'rechazó',
      [EstadoSugerencia.MasInformacion]: 'pidió más información sobre',
    };
    const accion = accionTexto[sugerencia.estado] || 'respondió a';
    const campos = await this.obtenerCamposFormulario(sugerencia.edicion.convocatoriaId);
    const nombreCampo = this.nombreLegible(sugerencia.campo, campos, sugerencia.edicion.presupuesto);
    const mensaje = `${respondidoPor.nombreCompleto} ${accion} la sugerencia en "${nombreCampo}"`;

    await this.notificacionRepo.save(
      this.notificacionRepo.create({
        usuarioId: sugerencia.sugeridoPorId,
        tipo: TipoNotificacion.RESPUESTA_SUGERENCIA,
        sugerenciaId: sugerencia.id,
        mensaje,
      }),
    );
  }

  private async obtenerCamposFormulario(convocatoriaId: string): Promise<CampoFormulario[]> {
    const convocatoria = await this.convocatoriaRepo.findOne({
      where: { id: convocatoriaId },
      relations: { formulario: true },
    });
    return convocatoria?.formulario?.campos ?? [];
  }

  /**
   * Sobre el presupuesto se puede sugerir un valor nuevo en un campo de una partida existente
   * (se aplica solo al aceptar), o dejar un comentario sobre un rubro completo, para pedir agregar
   * o quitar partidas (eso no se automatiza). El monto de un bien es derivado
   * (cantidad * precioUnitario, ver normalizarPresupuesto), así que no es sugerible: aceptar esa
   * sugerencia lo descartaría en silencio y el director creería que se aplicó.
   */
  private validarCampoPresupuesto(edicion: Edicion, path: string, valorSugerido: string | null): void {
    const ruta = parsearRutaPartida(path);
    if (ruta) {
      const rubro = edicion.presupuesto?.rubros?.[ruta.rubroIndice];
      const partida = rubro?.partidas?.[ruta.partidaIndice];
      if (!rubro || !partida) {
        throw new BadRequestException('No se puede sugerir un cambio sobre una partida que no existe');
      }
      if (ruta.campo === 'monto' && rubro.tipo !== TipoRubro.ViaticosYSeguros) {
        throw new BadRequestException(
          'El monto de un bien se calcula solo: sugerí un cambio en la cantidad o el precio unitario',
        );
      }
      if (valorSugerido == null) return;
      if (
        ['monto', 'cantidad', 'precioUnitario'].includes(ruta.campo)
        && (valorSugerido.trim() === '' || !Number.isFinite(Number(valorSugerido)))
      ) {
        throw new BadRequestException('El valor sugerido debe ser un número válido');
      }
      return;
    }

    if (esRutaComentarioPresupuesto(edicion.presupuesto, path)) {
      if (valorSugerido != null) {
        throw new BadRequestException('Sobre un rubro solo se puede dejar un comentario, no un valor sugerido');
      }
      return;
    }

    throw new BadRequestException('No se puede sugerir un cambio sobre esa ruta del presupuesto');
  }

  /** Un valor sugerido sobre un campo del formulario debe cumplir las mismas reglas que la carga directa. */
  private async validarValorSugerido(
    edicion: Edicion,
    campo: string,
    valorSugerido: string | null,
  ): Promise<void> {
    if (campo.startsWith('presupuesto.')) {
      this.validarCampoPresupuesto(edicion, campo.replace('presupuesto.', ''), valorSugerido);
      return;
    }

    if (valorSugerido == null) return;

    if (!campo.startsWith('datosFormulario.')) return;

    const campoId = campo.replace('datosFormulario.', '');
    const campos = await this.obtenerCamposFormulario(edicion.convocatoriaId);
    const campoFormulario = campos.find(c => c.id === campoId);
    if (!campoFormulario) return;

    if (campoFormulario.tipo === TipoCampo.Seccion) {
      throw new BadRequestException('No se puede sugerir un cambio sobre una sección');
    }
    if (campoFormulario.tipo === TipoCampo.Tabla) {
      throw new BadRequestException('Sobre una tabla solo se puede dejar un comentario, no un valor sugerido');
    }

    const valor = this.valorParaCampo(campoFormulario.tipo, valorSugerido);
    validarValoresFormulario([campoFormulario], { [campoId]: valor });
  }

  private nombreLegible(campo: string, campos: CampoFormulario[] = [], presupuesto: Presupuesto | null = null): string {
    const mapa: Record<string, string> = {
      nombre: 'Nombre',
      anioEdicion: 'Año de edición',
      esConsolidado: 'Es consolidado',
      esInterfacultad: 'Es interfacultad',
    };
    if (mapa[campo]) return mapa[campo];
    if (campo.startsWith('presupuesto.')) {
      return etiquetaCampoPresupuesto(presupuesto, campo.replace('presupuesto.', ''));
    }
    if (campo.startsWith('datosFormulario.')) {
      const campoId = campo.replace('datosFormulario.', '');
      const campoFormulario = campos.find(c => c.id === campoId);
      return `Formulario > ${campoFormulario?.nombre ?? campoId}`;
    }
    return campo;
  }
}
