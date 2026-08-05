#!/usr/bin/env node
/**
 * Auditoría de pedidos con fotos perdidas.
 *
 * POR QUÉ EXISTE
 * --------------
 * Hasta esta corrección, `orderService.createDraftOrder` hacía:
 *
 *     try { photoUrl = await uploadImage(...) } catch { photoUrl = null }
 *
 * Un fallo de red al subir convertía la foto en `null` y se persistía como hueco,
 * sin log ni aviso. Además `setDoc` sin `merge` y una cola de guardado que en
 * realidad permitía escrituras concurrentes podían dejar fuera del documento
 * fotos que SÍ se habían subido a Storage.
 *
 * QUÉ SE PUEDE Y QUÉ NO SE PUEDE RECUPERAR
 * ----------------------------------------
 * En el esquema antiguo, un `null` en `pages[].images` es indistinguible de un
 * slot vacío a propósito: cuando la subida fallaba tampoco se escribía el crop.
 * Por eso NO existe una migración automática correcta y este script no la intenta.
 *
 *   - Huérfanos en Storage  → RECUPERABLES. Se subieron pero un guardado posterior
 *                             los dejó fuera del documento. Se pueden devolver.
 *   - Fotos que fallaron    → IRRECUPERABLES. Nunca llegaron a Storage.
 *   - `blob:` en el documento → BASURA. Solo cabe contactar al cliente.
 *
 * Es de SOLO LECTURA salvo por el flag `needsCustomerContact`, que únicamente se
 * escribe si se pasa --write-flags.
 *
 * USO
 * ---
 *   npm i -D firebase-admin        # no es dependencia del frontend
 *   node scripts/audit-orders.mjs --key ./firebase-service-account.json \
 *                                 --bucket <project-id>.appspot.com \
 *                                 [--since 2025-01-01] [--write-flags] \
 *                                 [--out auditoria.csv]
 *
 * NOTA DE SEGURIDAD: `jiffy-backend/firebase-service-account.json` está commiteado
 * en el repositorio. Conviene rotar esa credencial y sacarla del control de
 * versiones; este script no la lee por defecto, hay que indicarla con --key.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { argv, exit } from 'node:process';

// ── Argumentos ───────────────────────────────────────────────────────────────

function parseArgs() {
  const args = { out: 'auditoria-pedidos.csv', writeFlags: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--key') args.key = argv[++i];
    else if (a === '--bucket') args.bucket = argv[++i];
    else if (a === '--since') args.since = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--write-flags') args.writeFlags = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

const args = parseArgs();

if (args.help || !args.key || !args.bucket) {
  console.log(`
Auditoría de pedidos con fotos perdidas (solo lectura).

  --key <ruta>      Service account JSON de Firebase Admin   (obligatorio)
  --bucket <name>   Bucket de Storage, p. ej. mi-proyecto.appspot.com  (obligatorio)
  --since <fecha>   Solo pedidos con createdAt >= fecha ISO   (opcional)
  --out <ruta>      CSV de salida (por defecto auditoria-pedidos.csv)
  --write-flags     Marca needsCustomerContact:true en los pedidos irrecuperables
`);
  exit(args.help ? 0 : 1);
}

// ── Firebase Admin ───────────────────────────────────────────────────────────

let admin;
try {
  admin = await import('firebase-admin');
} catch {
  console.error('Falta firebase-admin. Instálalo con:  npm i -D firebase-admin');
  exit(1);
}

const serviceAccount = JSON.parse(readFileSync(args.key, 'utf8'));
admin.default.initializeApp({
  credential: admin.default.credential.cert(serviceAccount),
  storageBucket: args.bucket,
});

const db = admin.default.firestore();
const bucket = admin.default.storage().bucket();

// ── Helpers ──────────────────────────────────────────────────────────────────

const isLocalUrl = (s) =>
  typeof s === 'string' && (s.startsWith('blob:') || s.startsWith('data:image'));

/** Extrae la ruta dentro del bucket de una download URL de Firebase Storage. */
function storagePathFromUrl(url) {
  if (typeof url !== 'string') return null;
  const m = url.match(/\/o\/([^?]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

function collectDocumentUrls(order) {
  const urls = new Set();
  const visit = (v) => {
    if (typeof v === 'string') {
      if (v.includes('/o/')) urls.add(v);
      return;
    }
    if (Array.isArray(v)) return v.forEach(visit);
    if (v && typeof v === 'object') return Object.values(v).forEach(visit);
  };
  visit(order.pages);
  visit(order.photos);
  visit(order.items);
  visit(order.coverData);
  return urls;
}

function countNullSlots(pages) {
  let nulls = 0;
  let real = 0;
  (pages || []).forEach((p) => {
    (p?.images || []).forEach((img) => {
      if (img) real++;
      else nulls++;
    });
  });
  return { nulls, real };
}

function findLocalUrls(order) {
  const found = [];
  JSON.stringify(order, (_k, v) => {
    if (isLocalUrl(v)) found.push(v.slice(0, 60));
    return v;
  });
  return found;
}

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// ── Auditoría ────────────────────────────────────────────────────────────────

console.log('Leyendo pedidos…');

let query = db.collection('orders');
if (args.since) query = query.where('createdAt', '>=', args.since);

const snapshot = await query.get();
console.log(`${snapshot.size} pedido(s) a revisar.\n`);

const rows = [];
const toFlag = [];

for (const doc of snapshot.docs) {
  const order = doc.data();
  const hasAlbum = Array.isArray(order.pages) && order.pages.length > 0;
  const localUrls = findLocalUrls(order);

  // 1) Documentos con blob:/data: — basura irrecuperable.
  if (localUrls.length > 0) {
    rows.push({
      orderId: doc.id,
      customerEmail: order.customerEmail || '',
      status: order.status || '',
      createdAt: order.createdAt || '',
      realPhotos: countNullSlots(order.pages).real,
      emptySlots: countNullSlots(order.pages).nulls,
      orphansInStorage: 0,
      verdict: 'IRRECUPERABLE: el documento contiene URLs locales (blob:/data:)',
    });
    toFlag.push(doc.id);
    continue;
  }

  if (!hasAlbum) continue;

  const { nulls, real } = countNullSlots(order.pages);

  // 2) Comparar Storage contra lo referenciado en el documento.
  const prefix = `orders/${order.userId}/${doc.id}/photos`;
  let filesInStorage = [];
  try {
    const [files] = await bucket.getFiles({ prefix });
    filesInStorage = files.map((f) => f.name);
  } catch (e) {
    console.warn(`  [${doc.id}] no se pudo listar Storage: ${e.message}`);
  }

  const referenced = new Set(
    [...collectDocumentUrls(order)].map(storagePathFromUrl).filter(Boolean)
  );
  const orphans = filesInStorage.filter((name) => !referenced.has(name));

  let verdict;
  if (orphans.length > 0) {
    verdict = `RECUPERABLE: ${orphans.length} foto(s) en Storage no referenciadas en el pedido`;
  } else if (nulls > 0) {
    verdict = `REVISAR: ${nulls} slot(s) vacío(s) sin equivalente en Storage ` +
              `(no distinguible de un hueco intencional; contactar al cliente si se queja)`;
  } else {
    continue; // pedido sano
  }

  rows.push({
    orderId: doc.id,
    customerEmail: order.customerEmail || '',
    status: order.status || '',
    createdAt: order.createdAt || '',
    realPhotos: real,
    emptySlots: nulls,
    orphansInStorage: orphans.length,
    verdict,
  });

  if (orphans.length > 0) {
    console.log(`  [${doc.id}] ${orphans.length} huérfano(s) recuperable(s):`);
    orphans.slice(0, 10).forEach((o) => console.log(`      ${o}`));
    if (orphans.length > 10) console.log(`      … y ${orphans.length - 10} más`);
  }
}

// ── Salida ───────────────────────────────────────────────────────────────────

const headers = [
  'orderId', 'customerEmail', 'status', 'createdAt',
  'realPhotos', 'emptySlots', 'orphansInStorage', 'verdict',
];
const csv = [
  headers.join(','),
  ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(',')),
].join('\n');

writeFileSync(args.out, csv, 'utf8');

console.log(`\n─────────────────────────────────────────`);
console.log(`Pedidos revisados:      ${snapshot.size}`);
console.log(`Con incidencias:        ${rows.length}`);
console.log(`  recuperables:         ${rows.filter((r) => r.verdict.startsWith('RECUPERABLE')).length}`);
console.log(`  a revisar:            ${rows.filter((r) => r.verdict.startsWith('REVISAR')).length}`);
console.log(`  irrecuperables:       ${rows.filter((r) => r.verdict.startsWith('IRRECUPERABLE')).length}`);
console.log(`Informe: ${args.out}`);

if (args.writeFlags && toFlag.length > 0) {
  console.log(`\nMarcando ${toFlag.length} pedido(s) con needsCustomerContact…`);
  for (const id of toFlag) {
    await db.collection('orders').doc(id).update({ needsCustomerContact: true });
  }
  console.log('Hecho.');
} else if (toFlag.length > 0) {
  console.log(`\n${toFlag.length} pedido(s) irrecuperables. Usa --write-flags para marcarlos.`);
}
