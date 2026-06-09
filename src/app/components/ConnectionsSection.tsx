import React, { useState, useEffect, useCallback } from 'react';
import {
  Key, Plus, Copy, Check, Trash2, Loader2, RefreshCw,
  ShieldCheck, AlertTriangle, Link, Eye, EyeOff, Zap,
  ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import {
  McpApiKey,
  MCP_SCOPES,
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from '../../services/mcpService';

const MCP_ENDPOINT = `${import.meta.env.VITE_API_URL ?? ''}/mcp`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function useCopy(timeout = 2000) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    });
  }, [timeout]);
  return { copied, copy };
}

// ── Sub-components ────────────────────────────────────────────────────────────

const CopyButton: React.FC<{ text: string; label?: string }> = ({ text, label }) => {
  const { copied, copy } = useCopy();
  return (
    <button
      onClick={() => copy(text)}
      title="Copiar"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
      {label ?? (copied ? 'Copiado' : 'Copiar')}
    </button>
  );
};

const ScopeBadge: React.FC<{ scope: string }> = ({ scope }) => {
  const info = MCP_SCOPES.find(s => s.id === scope);
  const isWrite = scope.endsWith(':write');
  return (
    <span
      title={info?.description}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
        isWrite
          ? 'bg-amber-100 text-amber-800'
          : 'bg-blue-100 text-blue-800'
      }`}
    >
      {info?.label ?? scope}
    </span>
  );
};

// ── New Key Modal ─────────────────────────────────────────────────────────────

interface CreateKeyModalProps {
  onClose: () => void;
  onCreated: (key: McpApiKey, rawKey: string) => void;
}

const CreateKeyModal: React.FC<CreateKeyModalProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [agentName, setAgentName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleScope = (id: string) =>
    setSelectedScopes(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );

  const handleCreate = async () => {
    if (!name.trim()) { setError('El nombre es requerido.'); return; }
    if (!agentName.trim()) { setError('El nombre del agente es requerido.'); return; }
    if (selectedScopes.length === 0) { setError('Selecciona al menos un permiso.'); return; }
    setLoading(true);
    setError(null);
    try {
      const { key, rawKey } = await createApiKey(name.trim(), agentName.trim(), selectedScopes);
      onCreated(key, rawKey);
    } catch (e) {
      setError('Error al crear la clave. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Key className="w-5 h-5" /> Nueva Clave de Agente
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Las claves permiten a agentes externos leer y escribir datos de tu tienda via MCP.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
              Nombre de la clave
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ej. Agente de Análisis de Ventas"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
              Nombre del agente (identificador)
            </label>
            <input
              value={agentName}
              onChange={e => setAgentName(e.target.value)}
              placeholder="ej. sales-agent"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
              Permisos (scopes)
            </label>
            <div className="space-y-2">
              {MCP_SCOPES.map(scope => (
                <label
                  key={scope.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                    selectedScopes.includes(scope.id)
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope.id)}
                    onChange={() => toggleScope(scope.id)}
                    className="mt-0.5 w-4 h-4 rounded"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{scope.label}</p>
                    <p className="text-xs text-gray-500">{scope.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-black text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Crear Clave
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Key Created Banner ────────────────────────────────────────────────────────

interface KeyCreatedBannerProps {
  rawKey: string;
  onDismiss: () => void;
}

const KeyCreatedBanner: React.FC<KeyCreatedBannerProps> = ({ rawKey, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const { copied, copy } = useCopy();

  return (
    <div className="rounded-2xl border-2 border-green-400 bg-green-50 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-green-600" />
        <span className="font-bold text-green-800">Clave creada — guárdala ahora</span>
      </div>
      <p className="text-sm text-green-700">
        Esta es la única vez que verás la clave completa. Cópiala y guárdala en un lugar seguro.
      </p>
      <div className="flex items-center gap-3">
        <div className="flex-1 font-mono text-sm bg-white border border-green-300 rounded-xl px-4 py-2.5 overflow-x-auto">
          {visible ? rawKey : '•'.repeat(rawKey.length)}
        </div>
        <button
          onClick={() => setVisible(v => !v)}
          title={visible ? 'Ocultar' : 'Mostrar'}
          className="p-2.5 border border-green-300 rounded-xl bg-white hover:bg-green-100 transition-colors"
        >
          {visible ? <EyeOff className="w-4 h-4 text-green-700" /> : <Eye className="w-4 h-4 text-green-700" />}
        </button>
        <button
          onClick={() => copy(rawKey)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-xl transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <button onClick={onDismiss} className="text-xs text-green-600 hover:text-green-800 underline">
        He guardado la clave, continuar
      </button>
    </div>
  );
};

// ── Key Row ───────────────────────────────────────────────────────────────────

interface KeyRowProps {
  apiKey: McpApiKey;
  onRevoke: (id: string) => void;
}

const KeyRow: React.FC<KeyRowProps> = ({ apiKey, onRevoke }) => {
  const [expanded, setExpanded] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const isRevoked = !!apiKey.revokedAt;

  const handleRevoke = async () => {
    if (!confirm(`¿Revocar la clave "${apiKey.name}"? Esta acción no se puede deshacer.`)) return;
    setRevoking(true);
    try {
      await revokeApiKey(apiKey.id);
      onRevoke(apiKey.id);
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className={`rounded-xl border ${isRevoked ? 'border-gray-200 opacity-60' : 'border-gray-200'} bg-white`}>
      <div className="flex items-center gap-3 p-4">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isRevoked ? 'bg-gray-300' : 'bg-green-400'}`} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{apiKey.name}</p>
          <p className="text-xs text-gray-500 font-mono">{apiKey.prefix}•••••••••••••••••••••••••••••••</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
          {apiKey.scopes.slice(0, 3).map(s => <ScopeBadge key={s} scope={s} />)}
          {apiKey.scopes.length > 3 && (
            <span className="text-xs text-gray-400">+{apiKey.scopes.length - 3}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
          {!isRevoked && (
            <button
              onClick={handleRevoke}
              disabled={revoking}
              title="Revocar clave"
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
            >
              {revoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Agente</p>
              <p className="text-gray-800">{apiKey.agentName}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Estado</p>
              <p className={isRevoked ? 'text-gray-500' : 'text-green-600 font-semibold'}>
                {isRevoked ? `Revocada ${formatDate(apiKey.revokedAt)}` : 'Activa'}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Creada</p>
              <p className="text-gray-800">{formatDate(apiKey.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Último uso</p>
              <p className="text-gray-800">{formatDate(apiKey.lastUsedAt)}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-1.5">Permisos</p>
            <div className="flex flex-wrap gap-1.5">
              {apiKey.scopes.map(s => <ScopeBadge key={s} scope={s} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Section ──────────────────────────────────────────────────────────────

const ConnectionsSection: React.FC = () => {
  const [keys, setKeys] = useState<McpApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [showRevoked, setShowRevoked] = useState(false);

  const { copied: endpointCopied, copy: copyEndpoint } = useCopy();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setKeys(await listApiKeys());
    } catch {
      setError('No se pudieron cargar las claves. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (key: McpApiKey, rawKey: string) => {
    setKeys(prev => [key, ...prev]);
    setNewRawKey(rawKey);
    setShowCreate(false);
  };

  const handleRevoke = (id: string) => {
    setKeys(prev =>
      prev.map(k => k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k)
    );
  };

  const activeKeys = keys.filter(k => !k.revokedAt);
  const revokedKeys = keys.filter(k => !!k.revokedAt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-1">
          <Zap className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">Conexiones MCP</h2>
        </div>
        <p className="text-sm text-gray-500 ml-9">
          Conecta agentes de IA y aplicaciones externas a tu tienda usando el protocolo Model Context Protocol (MCP).
          Genera claves de API con permisos específicos y úsalas para autenticar agentes.
        </p>
      </div>

      {/* MCP Endpoint */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Link className="w-4 h-4" /> Endpoint del Servidor MCP
        </h3>
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <code className="flex-1 text-sm font-mono text-gray-800 break-all">{MCP_ENDPOINT}</code>
          <CopyButton text={MCP_ENDPOINT} />
        </div>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 text-sm text-blue-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
          <div className="space-y-1">
            <p className="font-semibold">Cómo conectar un agente</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Crea una clave de API con los permisos necesarios.</li>
              <li>Configura el agente con el endpoint y la clave:
                <pre className="mt-1 p-2 bg-blue-100 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
{`Authorization: Bearer <tu_clave_cribb_...>
Content-Type: application/json

POST ${MCP_ENDPOINT}
{"jsonrpc":"2.0","method":"tools/list","id":1}`}
                </pre>
              </li>
              <li>El agente recibirá solo las herramientas correspondientes a sus permisos.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* New Key Banner */}
      {newRawKey && (
        <KeyCreatedBanner rawKey={newRawKey} onDismiss={() => setNewRawKey(null)} />
      )}

      {/* Active Keys */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Key className="w-4 h-4" /> Claves Activas
              <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                {activeKeys.length}
              </span>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              title="Recargar"
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" /> Nueva Clave
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Cargando claves…</span>
          </div>
        ) : activeKeys.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Key className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay claves activas.</p>
            <p className="text-xs mt-1">Crea una nueva clave para conectar tu primer agente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeKeys.map(k => (
              <KeyRow key={k.id} apiKey={k} onRevoke={handleRevoke} />
            ))}
          </div>
        )}
      </div>

      {/* Revoked Keys */}
      {revokedKeys.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <button
            onClick={() => setShowRevoked(v => !v)}
            className="w-full flex items-center justify-between text-sm font-bold text-gray-400 uppercase tracking-widest"
          >
            <span className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Claves Revocadas ({revokedKeys.length})
            </span>
            {showRevoked ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showRevoked && (
            <div className="mt-4 space-y-3">
              {revokedKeys.map(k => (
                <KeyRow key={k.id} apiKey={k} onRevoke={() => {}} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateKeyModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  );
};

export default ConnectionsSection;
