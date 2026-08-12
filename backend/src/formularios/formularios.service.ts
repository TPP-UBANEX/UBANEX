import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Formulario } from './formulario.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { CrearPlantillaDto } from './dto/crear-plantilla.dto';
import { ActualizarPlantillaDto } from './dto/actualizar-plantilla.dto';
import { validarCamposFormulario } from '../common/dto/validador-campos-formulario';
import { normalizarCamposFormulario } from '../common/dto/normalizar-campos-formulario';

@Injectable()
export class FormulariosService {
  constructor(
    @InjectRepository(Formulario)
    private readonly repo: Repository<Formulario>,
    @InjectRepository(Convocatoria)
    private readonly convocatoriaRepo: Repository<Convocatoria>,
  ) {}

  listar() {
    return this.repo.find({ where: { esPlantilla: true }, order: { nombre: 'ASC' } });
  }

  async obtener(id: string) {
    const plantilla = await this.repo.findOne({ where: { id, esPlantilla: true } });
    if (!plantilla) throw new NotFoundException('Plantilla no encontrada');
    return plantilla;
  }

  async crear(dto: CrearPlantillaDto) {
    if (dto.campos) validarCamposFormulario(dto.campos);
    if (dto.esDefault) await this.desmarcarDefault();

    const plantilla = this.repo.create({
      nombre: dto.nombre.trim(),
      esDefault: dto.esDefault ?? false,
      esPlantilla: true,
      campos: dto.campos ? normalizarCamposFormulario(dto.campos) : null,
    });
    return this.repo.save(plantilla);
  }

  async actualizar(id: string, dto: ActualizarPlantillaDto) {
    const plantilla = await this.obtener(id);

    if (dto.campos) validarCamposFormulario(dto.campos);
    if (dto.esDefault) await this.desmarcarDefault(id);

    if (dto.nombre !== undefined) plantilla.nombre = dto.nombre.trim();
    if (dto.esDefault !== undefined) plantilla.esDefault = dto.esDefault;
    if (dto.campos !== undefined) plantilla.campos = normalizarCamposFormulario(dto.campos);

    return this.repo.save(plantilla);
  }

  async eliminar(id: string) {
    const plantilla = await this.obtener(id);

    const enUso = await this.convocatoriaRepo.count({ where: { formularioId: id } });
    if (enUso > 0) {
      throw new BadRequestException(
        'La plantilla está en uso por una convocatoria y no puede eliminarse',
      );
    }

    return this.repo.remove(plantilla);
  }

  /** Solo puede haber una plantilla marcada como default a la vez. */
  private async desmarcarDefault(exceptoId?: string) {
    const actuales = await this.repo.find({
      where: exceptoId
        ? { esDefault: true, esPlantilla: true, id: Not(exceptoId) }
        : { esDefault: true, esPlantilla: true },
    });
    if (actuales.length === 0) return;
    await this.repo.save(actuales.map((f) => ({ ...f, esDefault: false })));
  }
}
