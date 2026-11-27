import React, { useMemo, useState } from 'react';
import { ref as storageRef, getMetadata, listAll } from 'firebase/storage';
import { ChevronRight, Copy, Check, ExternalLink, Database, Loader2, AlertTriangle } from 'lucide-react';
import { storage } from '../../lib/firebase';
import { collectOrderPhotos, getOrderPhotoKind, isLocalPhotoUrl, type PhotoRef } from '../utils/photoHealth';

// ============================================================================
// PANEL "INFORMACIÓN DE FIREBASE" DEL PEDIDO (solo panel del dueño)
// ============================================================================
// Para revisar cómo llegaron las fotos de un pedido sin abrir la consola a
// ciegas: dónde vive el documento, en qué carpeta de Storage deberían estar las
// fotos, la ruta real de cada una (portada incluida) y, a petición, sus
// metadatos (peso, tipo, fecha de subida, tamaño en píxeles) y el contenido de
// la carpeta (archivos que no usa el documento).

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'jiffy-photos-app';
const BUCKET = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${PROJECT_ID}.firebasestorage.app`;

/** La consola de Firebase codifica las rutas con `~2F` en lugar de `/`. */
const consolePath = (path: string) => path.split('/').filter(Boolean).map(encodeURIComponent).map(s => `~2F${s}`).join('');
const firestoreConsoleUrl = (docPath: string) =>
  `https://console.firebase.google.com/project/${PROJECT_ID}/firestore/databases/-default-/data/${consolePath(docPath)}`;
const storageConsoleUrl = (folderPath: string) =>
  `https://console.firebase.google.com/project/${PROJECT_ID}/storage/${BUCKET}/files/${consolePath(folderPath)}`;

/** Ruta del objeto dentro del bucket a partir de una URL de descarga, o null si no es de Storage. */
export function storagePathFromUrl(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'firebasestorage.googleapis.com') {
      const m = u.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
      if (m) return { bucket: m[1], path: decodeURIComponent(m[2]) };
    }
    if (u.hostname === 'storage.googleapis.com') {
      const [, bucket, ...rest] = u.pathname.split('/');
      if (bucket && rest.length) return { bucket, path: decodeURIComponent(rest.join('/')) };
    }
  } catch { /* no es una URL */ }
  return null;
}

const describeRef = (r: PhotoRef, kind: 'album' | 'calendar') =>
  r.pageIndex < 0 ? 'Portada'
    : kind === 'calendar' ? `Foto ${r.pageIndex + 1}`
    : `Pág. ${r.pageIndex + 1} · foto ${r.slotIndex + 1}`;

const formatBytes = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${Math.round(n / 1024)} KB`;

const formatDateTime = (v: any) => {
  if (!v) return '—';
  const d = typeof v?.toDate === 'function' ? v.toDate() : new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'medium' });
};

const CopyButton: React.FC<{ value: string }> = ({ value }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      title="Copiar"
      onClick={async (e) => {
        e.stopPropagation();
        try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1200); } catch { /* sin permiso de portapapeles */ }
      }}
      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 shrink-0"
    >
      {done ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

const Row: React.FC<{ label: string; value: React.ReactNode; copy?: string; href?: string }> = ({ label, value, copy, href }) => (
  <div className="flex items-start gap-3 py-1.5 border-b border-gray-50 last:border-0">
    <span className="w-40 shrink-0 text-[11px] uppercase tracking-wide text-gray-400 font-bold pt-0.5">{label}</span>
    <span className="flex-1 min-w-0 font-mono text-xs text-gray-800 break-all">{value}</span>
    {copy && <CopyButton value={copy} />}
    {href && (
      <a href={href} target="_blank" rel="noopener noreferrer" title="Abrir en la consola de Firebase" className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 shrink-0">
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    )}
  </div>
);

interface FileInfo {
  size?: number;
  contentType?: string;
  timeCreated?: string;
  width?: number;
  height?: number;
  error?: string;
}

const imageDimensions = (url: string) => new Promise<{ width: number; height: number }>((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
  img.onerror = () => reject(new Error('no carga'));
  img.src = url;
});

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

interface Props { order: any }

const OrderFirebaseInfoPanel: React.FC<Props> = ({ order }) => {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<Record<string, FileInfo>>({});
  const [checking, setChecking] = useState(false);
  const [folderList, setFolderList] = useState<{ paths: string[]; error?: string } | null>(null);
  const [listing, setListing] = useState(false);

  const kind = getOrderPhotoKind(order);
  const docPath = `orders/${order.id}`;
  const folderPath = order.userId ? `orders/${order.userId}/${order.id}` : '';

  const photos = useMemo(() => collectOrderPhotos(order, kind).map(r => ({
    ...r,
    label: describeRef(r, kind),
    storage: storagePathFromUrl(r.url),
  })), [order, kind]);

  const outsideFolder = photos.filter(p => p.storage && folderPath && !p.storage.path.startsWith(`${folderPath}/`));
  const notStorage = photos.filter(p => !p.storage);
  const rawCover = order.coverData?.image;

  const checkFiles = async () => {
    setChecking(true);
    const targets = photos.filter(p => p.storage);
    await mapLimit(targets, 6, async (p) => {
      const info: FileInfo = {};
      try {
        const meta = await getMetadata(storageRef(storage, p.storage!.path));
        info.size = meta.size;
        info.contentType = meta.contentType;
        info.timeCreated = meta.timeCreated;
      } catch (err: any) {
        info.error = err?.code === 'storage/object-not-found' ? 'no existe en Storage' : (err?.code || err?.message || 'error');
      }
      try {
        Object.assign(info, await imageDimensions(p.url));
      } catch {
        info.error = info.error || 'no carga en el navegador';
      }
      setFiles(prev => ({ ...prev, [p.url]: info }));
    });
    setChecking(false);
  };

  const listFolder = async () => {
    if (!folderPath) return;
    setListing(true);
    try {
      const collect = async (path: string): Promise<string[]> => {
        const res = await listAll(storageRef(storage, path));
        const nested = await Promise.all(res.prefixes.map(p => collect(p.fullPath)));
        return [...res.items.map(i => i.fullPath), ...nested.flat()];
      };
      setFolderList({ paths: (await collect(folderPath)).sort() });
    } catch (err: any) {
      setFolderList({ paths: [], error: err?.code || err?.message || 'error' });
    }
    setListing(false);
  };

  const usedPaths = new Set(photos.map(p => p.storage?.path).filter(Boolean) as string[]);
  const unusedInFolder = folderList?.paths.filter(p => !usedPaths.has(p)) || [];

  const docSummary = useMemo(() => {
    // El documento tal cual, sin los arreglos largos (se resumen por longitud).
    const { pages, photos: rawPhotos, ...rest } = order;
    return JSON.stringify({
      ...rest,
      pages: Array.isArray(pages) ? `[${pages.length} páginas]` : pages,
      photos: Array.isArray(rawPhotos) ? `[${rawPhotos.length} fotos]` : rawPhotos,
    }, null, 2);
  }, [order]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm" data-testid="firebase-info-panel">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-6 py-4 text-left text-gray-900 font-bold"
      >
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
        <Database className="w-5 h-5 text-primary" />
        <span>Información de Firebase</span>
        {(outsideFolder.length > 0 || notStorage.length > 0) && (
          <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            <AlertTriangle className="w-3 h-3" /> revisar rutas
          </span>
        )}
        <span className="ml-auto text-xs font-medium text-gray-400">{open ? 'Ocultar' : 'Mostrar'}</span>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-6">
          <section>
            <Row label="Documento" value={docPath} copy={docPath} href={firestoreConsoleUrl(docPath)} />
            <Row label="ID del pedido" value={order.id} copy={order.id} />
            <Row label="Usuario (uid)" value={order.userId || '—'} copy={order.userId} />
            <Row
              label="Carpeta Storage"
              value={folderPath ? `gs://${BUCKET}/${folderPath}/` : '— (el pedido no tiene userId)'}
              copy={folderPath || undefined}
              href={folderPath ? storageConsoleUrl(folderPath) : undefined}
            />
            <Row label="Estado" value={order.status || '—'} />
            <Row label="Tipo" value={`${order.productType || '—'} (${kind})`} />
            <Row label="Creado" value={formatDateTime(order.createdAt)} />
            <Row label="Actualizado" value={formatDateTime(order.updatedAt)} />
            <Row label="Esquema" value={`v${order.schemaVersion ?? '?'} (creado en v${order.createdSchemaVersion ?? '?'})`} />
            <Row label="Fotos (photoCount)" value={`${order.photoCount ?? '—'} · en el documento: ${photos.filter(p => p.pageIndex >= 0).length}${photos.some(p => p.pageIndex < 0) ? ' + portada' : ''}`} />
            {order.checkoutGroup?.id && (
              <Row label="Grupo de pago" value={`${order.checkoutGroup.id} · ${(order.checkoutGroup.orderIds || []).join(', ')}`} copy={order.checkoutGroup.id} />
            )}
            {kind === 'album' && (
              <>
                <Row label="coverData.image" value={rawCover ? String(rawCover) : '(vacío)'} copy={rawCover || undefined} />
                <Row label="coverContent.coverImage" value={String(order.customization?.coverContent?.coverImage ?? '(vacío)')} />
                <Row label="Recorte portada" value={JSON.stringify(order.coverData?.crop ?? null)} />
              </>
            )}
          </section>

          {(outsideFolder.length > 0 || notStorage.length > 0) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-1">
              {outsideFolder.length > 0 && (
                <p><b>{outsideFolder.length}</b> foto(s) están en otra carpeta de Storage (no en la de este pedido): {outsideFolder.slice(0, 6).map(p => p.label).join(', ')}{outsideFolder.length > 6 ? '…' : ''}.</p>
              )}
              {notStorage.length > 0 && (
                <p><b>{notStorage.length}</b> foto(s) no apuntan a Storage ({notStorage.some(p => isLocalPhotoUrl(p.url)) ? 'URLs locales blob:/data:' : 'otro servidor'}): {notStorage.slice(0, 6).map(p => p.label).join(', ')}.</p>
              )}
            </div>
          )}

          <section className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h5 className="text-sm font-bold text-gray-900 mr-auto">Fotos del pedido ({photos.length})</h5>
              <button
                type="button"
                onClick={checkFiles}
                disabled={checking || photos.length === 0}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 hover:border-black disabled:opacity-50"
              >
                {checking && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Leer metadatos de Storage
              </button>
              <button
                type="button"
                onClick={listFolder}
                disabled={listing || !folderPath}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 hover:border-black disabled:opacity-50"
              >
                {listing && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Listar carpeta
              </button>
            </div>
            <div className="max-h-96 overflow-auto rounded-lg border border-gray-100">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-bold">Ubicación</th>
                    <th className="text-left px-3 py-2 font-bold">Ruta en Storage</th>
                    <th className="text-left px-3 py-2 font-bold whitespace-nowrap">Archivo</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {photos.map((p, i) => {
                    const info = files[p.url];
                    const outside = outsideFolder.includes(p);
                    return (
                      <tr key={`${p.url}-${i}`} className="border-t border-gray-50 align-top">
                        <td className="px-3 py-1.5 font-bold text-gray-700 whitespace-nowrap">{p.label}</td>
                        <td className={`px-3 py-1.5 font-mono break-all ${outside || !p.storage ? 'text-amber-700' : 'text-gray-700'}`}>
                          {p.storage ? (p.storage.bucket !== BUCKET ? `gs://${p.storage.bucket}/${p.storage.path}` : p.storage.path) : (isLocalPhotoUrl(p.url) ? `${p.url.slice(0, 40)}…` : p.url)}
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-gray-600">
                          {!info ? <span className="text-gray-300">—</span>
                            : (
                              <span>
                                {[
                                  info.width ? `${info.width}×${info.height} px` : '',
                                  info.size != null ? formatBytes(info.size) : '',
                                  info.contentType ? info.contentType.replace('image/', '') : '',
                                  info.timeCreated ? `subida ${formatDateTime(info.timeCreated)}` : '',
                                ].filter(Boolean).join(' · ')}
                                {info.error && <b className="text-red-600">{info.width || info.size != null ? ' · ' : ''}{info.error}</b>}
                              </span>
                            )}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <div className="flex items-center">
                            <CopyButton value={p.storage?.path || p.url} />
                            {!isLocalPhotoUrl(p.url) && (
                              <a href={p.url} target="_blank" rel="noopener noreferrer" title="Abrir la imagen" className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {folderList && (
            <section className="space-y-2">
              <h5 className="text-sm font-bold text-gray-900">Contenido de la carpeta</h5>
              {folderList.error ? (
                <p className="text-sm text-red-600">No se pudo listar: {folderList.error}</p>
              ) : (
                <>
                  <p className="text-xs text-gray-500">
                    {folderList.paths.length} archivo(s) en la carpeta · {folderList.paths.length - unusedInFolder.length} usados por el pedido · {unusedInFolder.length} sin usar
                  </p>
                  {unusedInFolder.length > 0 && (
                    <ul className="max-h-48 overflow-auto rounded-lg border border-gray-100 font-mono text-xs text-gray-600 divide-y divide-gray-50">
                      {unusedInFolder.map(path => (
                        <li key={path} className="px-3 py-1 flex items-center gap-2">
                          <span className="flex-1 break-all">{path}</span>
                          <CopyButton value={path} />
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>
          )}

          <details className="group">
            <summary className="cursor-pointer text-sm font-bold text-gray-900 select-none">Documento de Firestore (JSON, sin páginas ni fotos)</summary>
            <div className="relative mt-2">
              <div className="absolute right-2 top-2"><CopyButton value={docSummary} /></div>
              <pre className="max-h-96 overflow-auto rounded-lg bg-gray-50 border border-gray-100 p-3 text-[11px] leading-snug text-gray-700">{docSummary}</pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default OrderFirebaseInfoPanel;
