import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const COLLECTION = 'mcp_api_keys';

export interface McpApiKey {
  id: string;
  name: string;
  agentName: string;
  prefix: string;
  keyHash: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export const MCP_SCOPES = [
  { id: 'orders:read', label: 'Leer Pedidos', description: 'Consultar estado y detalles de órdenes' },
  { id: 'orders:write', label: 'Actualizar Pedidos', description: 'Cambiar estado de órdenes' },
  { id: 'catalog:read', label: 'Leer Catálogo', description: 'Ver precios y configuración de productos' },
  { id: 'catalog:write', label: 'Editar Catálogo', description: 'Modificar precios y configuración' },
  { id: 'customers:read', label: 'Leer Clientes', description: 'Ver información de clientes' },
] as const;

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateRawKey(): string {
  const array = new Uint8Array(20);
  crypto.getRandomValues(array);
  const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  return `cribb_${hex}`;
}

export async function createApiKey(
  name: string,
  agentName: string,
  scopes: string[]
): Promise<{ key: McpApiKey; rawKey: string }> {
  const rawKey = generateRawKey();
  const keyHash = await sha256(rawKey);
  const prefix = rawKey.slice(0, 12);

  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, COLLECTION), {
    name,
    agentName,
    prefix,
    keyHash,
    scopes,
    createdAt: now,
    lastUsedAt: null,
    revokedAt: null,
  });

  const key: McpApiKey = {
    id: docRef.id,
    name,
    agentName,
    prefix,
    keyHash,
    scopes,
    createdAt: now.toDate().toISOString(),
    lastUsedAt: null,
    revokedAt: null,
  };

  return { key, rawKey };
}

export async function listApiKeys(): Promise<McpApiKey[]> {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      agentName: data.agentName,
      prefix: data.prefix,
      keyHash: data.keyHash,
      scopes: data.scopes ?? [],
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      lastUsedAt: data.lastUsedAt ? (data.lastUsedAt as Timestamp).toDate().toISOString() : null,
      revokedAt: data.revokedAt ? (data.revokedAt as Timestamp).toDate().toISOString() : null,
    };
  });
}

export async function revokeApiKey(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    revokedAt: Timestamp.now(),
  });
}
