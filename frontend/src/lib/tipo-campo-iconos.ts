import { AlignLeft, Calendar, CircleDot, Folder, Hash, ListChecks, MapPin, Paperclip, Table2, ToggleLeft, Type, UserSearch } from 'lucide-react'
import type { ComponentType } from 'react'
import { TipoCampo } from '@/data/types'

/** Se tipa con ComponentType y no con el `LucideIcon` de la librería para no atarse
 *  al nombre que exporte cada major de lucide-react. */
type IconoTipoCampo = ComponentType<{ className?: string }>

export const tipoCampoIconos: Record<TipoCampo, IconoTipoCampo> = {
  [TipoCampo.Texto]: Type,
  [TipoCampo.TextoLargo]: AlignLeft,
  [TipoCampo.Numero]: Hash,
  [TipoCampo.Fecha]: Calendar,
  [TipoCampo.Geolocalizacion]: MapPin,
  [TipoCampo.Booleano]: ToggleLeft,
  [TipoCampo.Checkbox]: ListChecks,
  [TipoCampo.Select]: CircleDot,
  [TipoCampo.Seccion]: Folder,
  [TipoCampo.Archivo]: Paperclip,
  [TipoCampo.Tabla]: Table2,
  [TipoCampo.Usuario]: UserSearch,
}
