import { Injectable, Logger } from '@nestjs/common';
import { Localidad } from './localidad.interface';

const GEOREF_URL = process.env.GEOREF_URL || 'https://apis.datos.gob.ar/georef/api/localidades';
const TIMEOUT_MS = 5000;
const MIN_CARACTERES = 3;
const MAX_RESULTADOS = 10;
const CACHE_MAX_ENTRADAS = 500;
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');

interface LocalidadGeoref {
  id: string;
  nombre: string;
  provincia: { nombre: string };
  centroide?: { lat: number; lon: number };
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly cache = new Map<string, Localidad[]>();

  async buscarLocalidades(query: string): Promise<Localidad[]> {
    const q = query.trim();
    if (q.length < MIN_CARACTERES) return [];

    const clave = this.normalizar(q);
    const cacheado = this.cache.get(clave);
    if (cacheado) return cacheado;

    const resultados = await this.consultarGeoref(q);
    this.guardarEnCache(clave, resultados);
    return resultados;
  }

  private async consultarGeoref(query: string): Promise<Localidad[]> {
    const url = `${GEOREF_URL}?nombre=${encodeURIComponent(query)}&max=${MAX_RESULTADOS}&campos=id,nombre,provincia,centroide`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        this.logger.warn(`Georef respondió ${res.status} para "${query}"`);
        return [];
      }
      const data = (await res.json()) as { localidades: LocalidadGeoref[] };
      return this.aplanarYDeduplicar(data.localidades ?? []);
    } catch (err) {
      this.logger.warn(`Error consultando Georef para "${query}": ${err instanceof Error ? err.message : err}`);
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }

  private aplanarYDeduplicar(localidades: LocalidadGeoref[]): Localidad[] {
    const vistos = new Set<string>();
    const resultado: Localidad[] = [];

    for (const l of localidades) {
      const clave = `${l.nombre}|${l.provincia.nombre}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);

      resultado.push({
        id: l.id,
        nombre: l.nombre,
        provincia: l.provincia.nombre,
        lat: l.centroide?.lat,
        lon: l.centroide?.lon,
      });
    }

    return resultado;
  }

  private normalizar(texto: string): string {
    return texto.toLowerCase().normalize('NFD').replace(DIACRITICOS, '');
  }

  private guardarEnCache(clave: string, resultados: Localidad[]): void {
    if (this.cache.size >= CACHE_MAX_ENTRADAS) {
      const primeraClave = this.cache.keys().next().value;
      if (primeraClave !== undefined) this.cache.delete(primeraClave);
    }
    this.cache.set(clave, resultados);
  }
}
