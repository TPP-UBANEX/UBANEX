import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EjecucionService } from './ejecucion.service';
import { Hito } from './hito.entity';
import { AutoevaluacionImpacto } from './autoevaluacion-impacto.entity';
import { InformeFinal } from './informe-final.entity';
import { TemplateAutoevaluacionImpacto } from './template-autoevaluacion.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { CategoriaHito } from '../common/enums/categoria-hito.enum';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { EstadoConvocatoria } from '../common/enums/estado-convocatoria.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { AuditoriaService } from '../auditoria/auditoria.service';

describe('EjecucionService — validación de fechas de hitos', () => {
  const findOneEdicion = jest.fn<() => Promise<Edicion | null>>();
  const createHito = jest.fn<(data: unknown) => Hito>();
  const saveHito = jest.fn<(hito: unknown) => Promise<Hito>>();

  const hitoRepo = {
    create: createHito,
    save: saveHito,
  } as unknown as Repository<Hito>;

  const edicionRepo = { findOne: findOneEdicion } as unknown as Repository<Edicion>;

  const auditoria = { registrar: jest.fn() } as unknown as AuditoriaService;

  const service = new EjecucionService(
    hitoRepo,
    {} as unknown as Repository<AutoevaluacionImpacto>,
    {} as unknown as Repository<InformeFinal>,
    {} as unknown as Repository<TemplateAutoevaluacionImpacto>,
    edicionRepo,
    {} as unknown as Repository<Convocatoria>,
    {} as unknown as Repository<ParticipacionConvocatoria>,
    auditoria,
  );

  function edicionEnEjecucion(
    convocatoria: Partial<Convocatoria> = {},
  ): Edicion {
    return {
      id: 'edicion-1',
      creadoPorId: 'u-creador',
      estado: EstadoEdicion.EnEjecucion,
      convocatoria: {
        estado: EstadoConvocatoria.Ejecucion,
        fechaInicioEjecucion: '2027-08-01',
        fechaFinEjecucion: '2028-02-28',
        ...convocatoria,
      } as unknown as Convocatoria,
    } as unknown as Edicion;
  }

  const director = {
    id: 'u-creador',
    roles: [RolUsuario.Docente],
  } as unknown as Usuario;

  function crearHito(extra: Partial<{ fechaInicio: string; fechaFin: string }> = {}) {
    return service.crearHito(
      'edicion-1',
      {
        titulo: 'Hito 1',
        categoria: CategoriaHito.Organizacion,
        ...extra,
      } as Parameters<typeof service.crearHito>[1],
      director,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('permite crear un hito sin fechas', async () => {
    findOneEdicion.mockResolvedValue(edicionEnEjecucion());
    createHito.mockReturnValue({ id: 'hito-1' } as unknown as Hito);
    saveHito.mockResolvedValue({ id: 'hito-1' } as unknown as Hito);

    await expect(crearHito()).resolves.toBeDefined();
  });

  it('rechaza un hito cuya fecha de inicio es posterior a la de fin', async () => {
    findOneEdicion.mockResolvedValue(edicionEnEjecucion());

    await expect(
      crearHito({ fechaInicio: '2027-09-10', fechaFin: '2027-09-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(saveHito).not.toHaveBeenCalled();
  });

  it('rechaza un hito con fecha de inicio anterior al inicio de ejecución', async () => {
    findOneEdicion.mockResolvedValue(edicionEnEjecucion());

    await expect(crearHito({ fechaInicio: '2027-07-31' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(saveHito).not.toHaveBeenCalled();
  });

  it('rechaza un hito con fecha de fin posterior al fin de ejecución', async () => {
    findOneEdicion.mockResolvedValue(edicionEnEjecucion());

    await expect(crearHito({ fechaFin: '2028-03-01' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(saveHito).not.toHaveBeenCalled();
  });

  it('permite un hito con fechas dentro del período de ejecución', async () => {
    findOneEdicion.mockResolvedValue(edicionEnEjecucion());
    createHito.mockReturnValue({ id: 'hito-1' } as unknown as Hito);
    saveHito.mockResolvedValue({ id: 'hito-1' } as unknown as Hito);

    await expect(
      crearHito({ fechaInicio: '2027-08-01', fechaFin: '2028-02-28' }),
    ).resolves.toBeDefined();
    expect(saveHito).toHaveBeenCalledTimes(1);
  });

  it('ignora el período de ejecución si la convocatoria no lo define', async () => {
    findOneEdicion.mockResolvedValue(
      edicionEnEjecucion({ fechaInicioEjecucion: null, fechaFinEjecucion: null }),
    );
    createHito.mockReturnValue({ id: 'hito-1' } as unknown as Hito);
    saveHito.mockResolvedValue({ id: 'hito-1' } as unknown as Hito);

    await expect(
      crearHito({ fechaInicio: '2030-01-01', fechaFin: '2030-12-31' }),
    ).resolves.toBeDefined();
  });
});