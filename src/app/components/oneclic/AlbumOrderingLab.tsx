import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Camera, ChevronDown, ChevronUp, Clock, DollarSign, Eye, Image as ImageIcon, Images, Loader2,
  RefreshCw, Sparkles,
} from 'lucide-react';
import {
  ONECLIC_TEST_AGENT_ID,
  OneclicAlbumOrderProposal,
  OneclicAlbumSummary,
  OneclicPhotoMetadata,
  OneclicStatus,
  describeOneclicError,
  getOneclicStatus,
  listOneclicAlbums,
  organizeOneclicAlbum,
} from '../../../services/oneclicApi';

/**
 * Laboratorio: orden de las fotos de un álbum propuesto por un agente de 1clic.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ SOLO LECTURA. El backend lee el álbum y las cabeceras de las fotos,   │
 * │ el agente propone un orden y aquí se PINTA. No hay ningún botón que   │
 * │ guarde: el orden real de los álbumes no se toca.                      │
 * └──────────────────────────────────────────────────────────────────────┘
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', withTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'medium' }).format(d);
}

function formatUsd(value: number): string {
  return `$${(Number(value) || 0).toFixed(4)} USD`;
}

function formatMs(value: number | null): string {
  if (value == null) return '—';
  return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${value} ms`;
}

const ORIENTATION_LABEL: Record<string, string> = { H: 'horizontal', V: 'vertical', S: 'cuadrada' };

const ErrorBox: React.FC<{ error: unknown }> = ({ error }) => {
  const info = describeOneclicError(error);
  const tone = info.isExpected ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-700';
  return (
    <div className={`flex gap-3 p-4 border rounded-xl text-sm ${tone}`}>
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">{info.title}</p>
        <p className="mt-0.5 opacity-90">{info.detail}</p>
      </div>
    </div>
  );
};

// ── Lista de álbumes ──────────────────────────────────────────────────────────

const AlbumList: React.FC<{
  albums: OneclicAlbumSummary[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onReload: () => void;
}> = ({ albums, selectedId, loading, onSelect, onReload }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
        <Images className="w-4 h-4" /> Álbumes con fotos
        <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{albums.length}</span>
      </h3>
      <button onClick={onReload} title="Recargar" className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
        <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>

    {loading && albums.length === 0 ? (
      <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" /> <span className="text-sm">Cargando álbumes…</span>
      </div>
    ) : albums.length === 0 ? (
      <p className="text-sm text-gray-400 text-center py-10">No hay álbumes con fotos.</p>
    ) : (
      <ul className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto -mx-2">
        {albums.map(album => {
          const selected = album.id === selectedId;
          return (
            <li key={album.id}>
              <button
                onClick={() => onSelect(album.id)}
                className={`w-full flex items-center gap-3 px-2 py-2.5 text-left rounded-xl transition-colors ${selected ? 'bg-purple-50 ring-2 ring-purple-300' : 'hover:bg-gray-50'}`}
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-400">
                  <Images className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {album.productName ?? album.productType ?? 'Álbum'}{album.size ? ` · ${album.size}` : ''}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {album.customerName ?? 'Sin nombre'} · {formatDate(album.createdAt)} · {album.status ?? '—'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{album.photoCount}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">fotos · {album.pageCount} pág.</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);

// ── Resultado ─────────────────────────────────────────────────────────────────

/**
 * Ficha de una foto. Sin imagen por defecto: en Storage solo están los
 * originales (2–18 MB cada uno), y un álbum de 200 fotos serían cientos de
 * MB solo para ver el orden. Con `showImages` se cargan los originales bajo
 * demanda, y el usuario ya sabe lo que pide.
 */
const PhotoTile: React.FC<{ photo: OneclicPhotoMetadata; position: number; groupColor?: string; showOriginal: boolean; showImages: boolean }> = ({ photo, position, groupColor, showOriginal, showImages }) => {
  const moved = showOriginal && photo.index !== position - 1;
  const title = [
    `Posición actual: ${photo.index + 1} (página ${photo.page + 1}, hueco ${photo.slot + 1})`,
    photo.takenAt ? `Captura: ${formatDate(photo.takenAt, true)}` : (photo.note ?? 'sin fecha'),
    photo.width && photo.height ? `${photo.width}×${photo.height}${photo.orientation ? ` (${ORIENTATION_LABEL[photo.orientation]})` : ''}` : null,
    photo.camera,
  ].filter(Boolean).join('\n');

  if (showImages) {
    return (
      <figure title={title} className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square">
        <img src={photo.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">{position}</span>
        {moved && <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-white/85 text-gray-700 text-[10px] font-semibold">era {photo.index + 1}</span>}
        {groupColor && <span className={`absolute inset-x-0 bottom-0 h-1 ${groupColor}`} />}
        <figcaption className="absolute inset-x-0 bottom-1 px-1 text-[9px] leading-tight text-white drop-shadow-[0_1px_1px_rgba(0,0,0,.9)] truncate">
          {photo.takenAt ? formatDate(photo.takenAt, true) : '—'}{photo.orientation ? ` · ${photo.orientation}` : ''}
        </figcaption>
      </figure>
    );
  }

  return (
    <figure title={title} className={`relative rounded-lg border bg-white aspect-square p-1.5 flex flex-col justify-between text-[10px] leading-tight ${moved ? 'border-purple-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-1">
        <span className="px-1.5 py-0.5 rounded-md bg-black text-white font-bold">{position}</span>
        {moved && <span className="px-1 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold">era {photo.index + 1}</span>}
      </div>
      <div className="text-gray-700">
        <p className="font-semibold truncate">{photo.takenAt ? formatDate(photo.takenAt, true) : <span className="text-gray-400">sin fecha</span>}</p>
        <p className="text-gray-500 truncate">
          {photo.orientation ? ORIENTATION_LABEL[photo.orientation] : '—'}{photo.camera ? ` · ${photo.camera}` : ''}
        </p>
      </div>
      {groupColor && <span className={`absolute inset-x-0 bottom-0 h-1 rounded-b-lg ${groupColor}`} />}
    </figure>
  );
};

const GROUP_COLORS = ['bg-purple-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500'];

const ProposalView: React.FC<{ result: OneclicAlbumOrderProposal }> = ({ result }) => {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const totalMb = result.photos.reduce((n, p) => n + (p.bytes ?? 0), 0) / 1e6;
  const byIndex = useMemo(() => new Map(result.photos.map(p => [p.index, p])), [result.photos]);
  const groupOf = useMemo(() => {
    const map = new Map<number, number>();
    result.proposal.groups.forEach((g, gi) => g.indices.forEach(i => { if (!map.has(i)) map.set(i, gi); }));
    return map;
  }, [result.proposal.groups]);
  const moved = result.proposal.order.filter((idx, pos) => idx !== pos).length;

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Fotos</p>
          <p className="mt-1 font-semibold text-gray-900">{result.photos.length} · {result.withDate} con fecha</p>
        </div>
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cambian de sitio</p>
          <p className="mt-1 font-semibold text-gray-900">{moved} de {result.photos.length}</p>
        </div>
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Metadatos · agente</p>
          <p className="mt-1 font-semibold text-gray-900">{formatMs(result.timings_ms.metadata)} · {formatMs(result.timings_ms.agent)}</p>
        </div>
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Coste del run</p>
          <p className="mt-1 font-semibold text-gray-900 flex items-center gap-2">
            <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{formatUsd(result.cost_usd)}</span>
            <span className="flex items-center gap-1 text-gray-500"><Clock className="w-3.5 h-3.5" />{formatMs(result.duration_ms)}</span>
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        {result.agent.name}{result.dry_run ? ' · en seco' : ''}{result.deduplicated ? ' · respuesta repetida (misma clave de idempotencia)' : ''}
        {result.typed_valid === false && ' · la respuesta no cumplió el esquema'}
        {result.context.omitted > 0 && ` · ${result.context.omitted} fotos no cupieron en el contexto y se dejan al final`}
      </p>

      {result.proposal.issues.length > 0 && (
        <div className="flex gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <ul className="list-disc list-inside">{result.proposal.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>
        </div>
      )}

      {result.proposal.rationale && (
        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 text-sm text-gray-800">
          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700 mb-1">Criterio del agente</p>
          <p className="whitespace-pre-wrap">{result.proposal.rationale}</p>
        </div>
      )}

      {result.proposal.groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.proposal.groups.map((g, gi) => (
            <span key={gi} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700">
              <span className={`w-2 h-2 rounded-full ${GROUP_COLORS[gi % GROUP_COLORS.length]}`} />
              {g.title || `Grupo ${gi + 1}`} <span className="text-gray-400">({g.indices.length})</span>
            </span>
          ))}
        </div>
      )}

      {/* Orden propuesto */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Orden propuesto
            <span className="text-[10px] normal-case font-medium text-gray-400">(número = nueva posición; «era N» = posición actual)</span>
          </h4>
          <label className="flex items-center gap-2 text-xs text-gray-600" title="No hay miniaturas: se descargan los originales">
            <input type="checkbox" checked={showImages} onChange={e => setShowImages(e.target.checked)} />
            <ImageIcon className="w-3.5 h-3.5" /> Mostrar fotos{totalMb > 0 ? ` (${totalMb.toFixed(0)} MB, son los originales)` : ' (son los originales, pesan)'}
          </label>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
          {result.proposal.order.map((idx, pos) => {
            const photo = byIndex.get(idx);
            if (!photo) return null;
            const gi = groupOf.get(idx);
            return <PhotoTile key={idx} photo={photo} position={pos + 1} showOriginal showImages={showImages} groupColor={gi != null ? GROUP_COLORS[gi % GROUP_COLORS.length] : undefined} />;
          })}
        </div>
      </div>

      {/* Orden actual, plegado */}
      <div>
        <button onClick={() => setShowCurrent(v => !v)} className="w-full flex items-center justify-between text-sm font-bold text-gray-400 uppercase tracking-widest">
          <span className="flex items-center gap-2"><Eye className="w-4 h-4" /> Orden actual del álbum (sin cambios)</span>
          {showCurrent ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showCurrent && (
          <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
            {result.photos.map(photo => <PhotoTile key={photo.index} photo={photo} position={photo.index + 1} showOriginal={false} showImages={showImages} />)}
          </div>
        )}
      </div>

      {/* Metadatos, plegados */}
      <details className="text-xs text-gray-600">
        <summary className="cursor-pointer font-semibold flex items-center gap-2"><Camera className="w-3.5 h-3.5" /> Metadatos extraídos ({result.photos.length})</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="text-[10px] uppercase tracking-wider text-gray-400">
              <tr><th className="pr-3 py-1">#</th><th className="pr-3">Pág/hueco</th><th className="pr-3">Captura</th><th className="pr-3">Tamaño</th><th className="pr-3">Orient.</th><th className="pr-3">Cámara</th><th>Nota</th></tr>
            </thead>
            <tbody>
              {result.photos.map(p => (
                <tr key={p.index} className="border-t border-gray-100">
                  <td className="pr-3 py-1 font-mono">{p.index + 1}</td>
                  <td className="pr-3">{p.page + 1}/{p.slot + 1}</td>
                  <td className="pr-3">{p.takenAt ? formatDate(p.takenAt, true) : '—'}</td>
                  <td className="pr-3">{p.width && p.height ? `${p.width}×${p.height}` : '—'}{p.bytes ? ` · ${(p.bytes / 1e6).toFixed(1)} MB` : ''}</td>
                  <td className="pr-3">{p.orientation ? ORIENTATION_LABEL[p.orientation] : '—'}</td>
                  <td className="pr-3">{p.camera ?? '—'}</td>
                  <td className="text-gray-400">{p.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};

// ── Pestaña ───────────────────────────────────────────────────────────────────

const AlbumOrderingLab: React.FC = () => {
  const [status, setStatus] = useState<OneclicStatus | null>(null);
  const [albums, setAlbums] = useState<OneclicAlbumSummary[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [listError, setListError] = useState<unknown>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState(ONECLIC_TEST_AGENT_ID);
  const [dryRun, setDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<unknown>(null);
  const [result, setResult] = useState<OneclicAlbumOrderProposal | null>(null);

  const loadAlbums = useCallback(async () => {
    setLoadingAlbums(true);
    setListError(null);
    try {
      const [list, st] = await Promise.all([listOneclicAlbums(), getOneclicStatus().catch(() => null)]);
      setAlbums(list);
      setStatus(st);
    } catch (e) {
      setListError(e);
    } finally {
      setLoadingAlbums(false);
    }
  }, []);

  useEffect(() => { loadAlbums(); }, [loadAlbums]);

  const agentOptions = useMemo(() => {
    const assigned = (status?.agents ?? []).filter(a => a.id).map(a => ({ id: a.id as string, name: a.name, runnable: a.runnable }));
    return [{ id: ONECLIC_TEST_AGENT_ID, name: 'Agente de prueba de 1clic (en seco, $0)', runnable: true }, ...assigned];
  }, [status]);

  useEffect(() => {
    if (!agentOptions.some(a => a.id === agentId)) setAgentId(ONECLIC_TEST_AGENT_ID);
  }, [agentOptions, agentId]);

  const isTestAgent = agentId === ONECLIC_TEST_AGENT_ID;
  const selected = albums.find(a => a.id === selectedId) ?? null;
  const canRun = Boolean(selected) && !running && Boolean(status?.configured.api_key);

  const run = async () => {
    if (!selected) return;
    setRunning(true);
    setRunError(null);
    setResult(null);
    try {
      setResult(await organizeOneclicAlbum(selected.id, { agentId, mode: isTestAgent || dryRun ? 'dry_run' : 'default' }));
    } catch (e) {
      setRunError(e);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
        <Eye className="w-5 h-5 shrink-0 mt-0.5" />
        <p>
          <span className="font-bold">Laboratorio de solo lectura.</span> El servidor lee el álbum y la cabecera de cada foto (fecha de captura, cámara, orientación),
          se lo pasa al agente y aquí se muestra el orden que propone. <span className="font-semibold">No se guarda nada: el orden real de las fotos de los álbumes no cambia.</span>
        </p>
      </div>

      {listError ? <ErrorBox error={listError} /> : null}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 items-start">
        <AlbumList albums={albums} selectedId={selectedId} loading={loadingAlbums} onSelect={id => { setSelectedId(id); setResult(null); setRunError(null); }} onReload={loadAlbums} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Pedir un orden al agente
          </h3>

          {selected ? (
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{selected.productName ?? 'Álbum'}</span> de {selected.customerName ?? 'sin nombre'} · {selected.photoCount} fotos en {selected.pageCount} páginas · {formatDate(selected.createdAt)}
            </p>
          ) : (
            <p className="text-sm text-gray-400">Elige un álbum de la lista.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Agente</label>
              <select value={agentId} onChange={e => setAgentId(e.target.value)} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-black outline-none">
                {agentOptions.map(a => <option key={a.id} value={a.id} disabled={!a.runnable}>{a.name}</option>)}
              </select>
            </div>
            <label className={`flex items-center gap-2 text-sm pb-2.5 ${isTestAgent ? 'text-gray-400' : 'text-gray-700'}`}>
              <input type="checkbox" checked={isTestAgent || dryRun} disabled={isTestAgent} onChange={e => setDryRun(e.target.checked)} />
              En seco (no cobra)
            </label>
          </div>

          <button
            onClick={run}
            disabled={!canRun}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {running ? 'Leyendo metadatos y esperando al agente… (puede tardar un minuto)' : 'Extraer metadatos y pedir orden'}
          </button>

          {!status?.configured.api_key && status && (
            <p className="text-xs text-amber-700">Falta la clave de 1clic en el servidor: mira la pestaña Conexión.</p>
          )}

          {runError ? <ErrorBox error={runError} /> : null}
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <ProposalView result={result} />
        </div>
      )}
    </div>
  );
};

export default AlbumOrderingLab;
