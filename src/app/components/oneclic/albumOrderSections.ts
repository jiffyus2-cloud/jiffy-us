import type { OneclicPhotoMetadata } from '../../../services/oneclicApi';

/**
 * Reparte la propuesta del agente en las secciones que él mismo sugiere,
 * ordenadas, y ordenadas por dentro.
 *
 * El agente devuelve DOS cosas que no siempre concuerdan: una lista plana
 * (`order`) y unos grupos con título. Midiendo contra los metadatos reales,
 * los grupos son la parte fiable —sus títulos coinciden con las capturas que
 * contienen— mientras que la lista plana llega con inversiones cronológicas.
 * Por eso esta vista sigue las SECCIONES:
 *
 *   - las secciones van por su captura más antigua (las que no tienen fecha,
 *     al final, en el orden en que aparecen en la lista plana);
 *   - dentro de cada sección, las fotos van por hora de captura; las que no
 *     tienen fecha conservan el orden del agente, detrás de las fechadas
 *     (sin esto, una sección titulada "15:01–15:42" enseña sus fotos como
 *     15:18, 15:01, 15:34: el ruido de la lista plana, otra vez);
 *   - una foto pertenece a una sola sección: la primera que la reclama;
 *   - las fotos que ningún grupo reclama caen en una sección final.
 *
 * `disagreements` cuenta en cuántas fotos esta vista difiere de la lista
 * plana del agente, para poder decirlo en pantalla en vez de disimularlo.
 */

export interface ProposalGroup {
  title: string;
  indices: number[];
}

export interface SectionItem {
  photo: OneclicPhotoMetadata;
  /** Posición en el álbum propuesto (1-based), contando todas las secciones. */
  position: number;
}

export interface OrderSection {
  /** Índice del grupo original; null para la sección de las fotos sin grupo. */
  groupIndex: number | null;
  title: string;
  items: SectionItem[];
  firstPosition: number;
  lastPosition: number;
  /** Fotos que cambian de sitio respecto al álbum actual. */
  moved: number;
  /** Captura más antigua y más reciente de la sección, si alguna tiene fecha. */
  from: string | null;
  to: string | null;
}

export interface OrderSectionsResult {
  sections: OrderSection[];
  /** Fotos cuya posición aquí no coincide con la lista plana del agente. */
  disagreements: number;
}

export function buildOrderSections(
  order: number[],
  groups: ProposalGroup[],
  photos: OneclicPhotoMetadata[],
): OrderSectionsResult {
  const byIndex = new Map(photos.map(p => [p.index, p]));

  // Una foto, una sección: gana el primer grupo que la nombra.
  const sectionOf = new Map<number, number>();
  groups.forEach((group, gi) => {
    group.indices.forEach(i => { if (!sectionOf.has(i)) sectionOf.set(i, gi); });
  });

  // Se recorre la lista plana para conservar el orden del agente dentro de
  // cada sección y para saber qué sección apareció antes cuando no hay fechas.
  const buckets = new Map<number | null, OneclicPhotoMetadata[]>();
  const appearance: (number | null)[] = [];
  const flatPosition = new Map<number, number>();

  order.forEach((idx, pos) => {
    const photo = byIndex.get(idx);
    if (!photo) return;
    flatPosition.set(idx, flatPosition.size + 1);
    const key = sectionOf.has(idx) ? sectionOf.get(idx)! : null;
    if (!buckets.has(key)) {
      buckets.set(key, []);
      appearance.push(key);
    }
    buckets.get(key)!.push(photo);
  });

  const earliest = (list: OneclicPhotoMetadata[]): string | null => {
    const dates = list.map(p => p.takenAt).filter((d): d is string => Boolean(d)).sort();
    return dates[0] ?? null;
  };

  // Secciones con fecha primero, por su captura más antigua. Las que no tienen
  // fecha conservan el orden de aparición, y las fotos sueltas van al final:
  // son el resto, no un momento del álbum.
  const withDate = appearance.filter(k => k !== null && earliest(buckets.get(k)!));
  const withoutDate = appearance.filter(k => k !== null && !earliest(buckets.get(k)!));
  withDate.sort((a, b) => (earliest(buckets.get(a)!) ?? '').localeCompare(earliest(buckets.get(b)!) ?? ''));
  const keys: (number | null)[] = [...withDate, ...withoutDate, ...appearance.filter(k => k === null)];

  let position = 0;
  let disagreements = 0;

  const sections = keys.map(key => {
    // Dentro de una sección con título, las fotos van por captura (las que no
    // tienen fecha, detrás, en el orden del agente). En la bolsa de las que
    // ningún grupo reclamó no se toca nada: ahí la lista plana es lo único
    // que dijo el agente sobre ellas, y sin grupos es toda su respuesta.
    const raw = buckets.get(key)!;
    const list = key === null
      ? raw
      : raw
        .map((photo, i) => ({ photo, i }))
        .sort((a, b) => {
          if (a.photo.takenAt && b.photo.takenAt) return a.photo.takenAt.localeCompare(b.photo.takenAt) || a.i - b.i;
          if (a.photo.takenAt) return -1;
          if (b.photo.takenAt) return 1;
          return a.i - b.i;
        })
        .map(entry => entry.photo);

    const items = list.map(photo => {
      position += 1;
      if (flatPosition.get(photo.index) !== position) disagreements += 1;
      return { photo, position };
    });
    const dates = list.map(p => p.takenAt).filter((d): d is string => Boolean(d)).sort();
    return {
      groupIndex: key,
      title: key === null ? 'Sin sección' : (groups[key].title?.trim() || `Sección ${key + 1}`),
      items,
      firstPosition: items[0].position,
      lastPosition: items[items.length - 1].position,
      moved: items.filter(i => i.photo.index !== i.position - 1).length,
      from: dates[0] ?? null,
      to: dates[dates.length - 1] ?? null,
    };
  });

  return { sections, disagreements };
}
