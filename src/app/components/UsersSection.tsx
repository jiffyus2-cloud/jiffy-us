import React, { useState, useEffect, useCallback } from 'react';
import {
  collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, where, orderBy
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  Users, Plus, Search, Loader2, Trash2, Edit2, Eye, X,
  Mail, User, Calendar, MapPin, CreditCard, ShoppingBag,
  ChevronDown, ChevronRight, AlertCircle, Check, RefreshCw,
  Package, Clock, CheckCircle2, Truck, Home
} from 'lucide-react';
import { PhoneInput, COUNTRY_CODES } from './ui/PhoneInput';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface UserRecord {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: any;
  savedAddresses?: SavedAddress[];
  savedBilling?: SavedBilling | null;
}

interface SavedAddress {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  city: string;
  address: string;
  addressExtra: string;
  zipCode: string;
  savedAt: string;
}

interface SavedBilling {
  name: string;
  address: string;
  city: string;
  zipCode: string;
  savedAt: string;
}

interface UserOrder {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  product?: { name?: string; type?: string };
  productType?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(val: any): string {
  if (!val) return '—';
  try {
    const d = val?.toDate ? val.toDate() : new Date(val);
    return format(d, 'dd MMM yyyy', { locale: es });
  } catch {
    return '—';
  }
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  paid:           { label: 'Pagado',          color: 'bg-green-100 text-green-800',   icon: <CheckCircle2 className="w-3 h-3" /> },
  mock_paid:      { label: 'Pagado (demo)',    color: 'bg-green-100 text-green-700',   icon: <CheckCircle2 className="w-3 h-3" /> },
  en_produccion:  { label: 'En Producción',   color: 'bg-blue-100 text-blue-800',     icon: <Package className="w-3 h-3" /> },
  enviado:        { label: 'Enviado',          color: 'bg-purple-100 text-purple-800', icon: <Truck className="w-3 h-3" /> },
  entregado:      { label: 'Entregado',        color: 'bg-gray-100 text-gray-700',     icon: <Check className="w-3 h-3" /> },
  draft:          { label: 'Borrador',         color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" /> },
  saved_draft:    { label: 'Borrador',         color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" /> },
  pending_payment:{ label: 'Pend. Pago',      color: 'bg-orange-100 text-orange-800', icon: <Clock className="w-3 h-3" /> },
};

// ─── Create User via Firebase Auth REST API ───────────────────────────────────

async function createUserViaRest(email: string, password: string, name: string, phone?: string): Promise<string> {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: false }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const msg: Record<string, string> = {
      'EMAIL_EXISTS': 'Este correo ya está registrado.',
      'WEAK_PASSWORD : Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
      'INVALID_EMAIL': 'El correo electrónico no es válido.',
    };
    throw new Error(msg[data.error?.message] ?? data.error?.message ?? 'Error al crear usuario.');
  }
  const uid: string = data.localId;
  await setDoc(doc(db, 'users', uid), {
    uid,
    name,
    email,
    createdAt: new Date().toISOString(),
    ...(phone ? { phone } : {}),
  });
  return uid;
}

// ─── Modal: User Detail ───────────────────────────────────────────────────────

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2 border-b border-gray-100 last:border-0">
    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide sm:w-36 shrink-0">{label}</span>
    <span className="text-sm text-gray-800 break-all">{value}</span>
  </div>
);

type DetailTab = 'info' | 'addresses' | 'billing' | 'orders';

const UserDetailModal: React.FC<{
  user: UserRecord;
  onClose: () => void;
  onEdit: (user: UserRecord) => void;
  onDelete: (uid: string) => void;
}> = ({ user, onClose, onEdit, onDelete }) => {
  const [tab, setTab] = useState<DetailTab>('info');
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (tab !== 'orders') return;
    setLoadingOrders(true);
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'orders'));
        const list: UserOrder[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserOrder));
        list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
        setOrders(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingOrders(false);
      }
    })();
  }, [tab, user.uid]);

  const tabBtn = (id: DetailTab, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-t-lg transition-all ${
        tab === id
          ? 'bg-white border-t border-l border-r border-gray-200 text-black -mb-px z-10'
          : 'text-gray-500 hover:text-black'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-lg font-bold">
              {user.name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(user)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </button>
            <button
              onClick={() => { onDelete(user.uid); onClose(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Eliminar
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-gray-200 bg-gray-50/50">
          {tabBtn('info', 'Información', <User className="w-3.5 h-3.5" />)}
          {tabBtn('addresses', 'Direcciones', <MapPin className="w-3.5 h-3.5" />)}
          {tabBtn('billing', 'Facturación', <CreditCard className="w-3.5 h-3.5" />)}
          {tabBtn('orders', 'Pedidos', <ShoppingBag className="w-3.5 h-3.5" />)}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Info ── */}
          {tab === 'info' && (
            <div>
              <DetailRow label="Nombre" value={user.name || '—'} />
              <DetailRow label="Email" value={user.email || '—'} />
              <DetailRow label="Teléfono" value={user.phone || '—'} />
              <DetailRow label="UID" value={user.uid} />
              <DetailRow label="Registrado" value={formatDate(user.createdAt)} />
              <DetailRow label="Direcciones" value={`${user.savedAddresses?.length ?? 0} guardada(s)`} />
              <DetailRow label="Facturación" value={user.savedBilling ? 'Guardada' : 'Sin datos'} />
            </div>
          )}

          {/* ── Addresses ── */}
          {tab === 'addresses' && (
            <div className="space-y-3">
              {!user.savedAddresses?.length ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin direcciones guardadas</p>
              ) : user.savedAddresses.map((addr, i) => (
                <div key={addr.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700">Dirección {i + 1}</span>
                    <span className="text-xs text-gray-400">· {formatDate(addr.savedAt)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div><span className="text-gray-400">Nombre: </span><span>{addr.name}</span></div>
                    <div><span className="text-gray-400">Email: </span><span>{addr.email}</span></div>
                    {addr.phone && (
                      <div><span className="text-gray-400">Teléfono: </span><span>{addr.phone}</span></div>
                    )}
                    <div><span className="text-gray-400">Ciudad: </span><span>{addr.city}</span></div>
                    <div><span className="text-gray-400">Depto: </span><span>{addr.department}</span></div>
                    <div className="col-span-2"><span className="text-gray-400">Dirección: </span><span>{addr.address}</span></div>
                    {addr.addressExtra && (
                      <div className="col-span-2"><span className="text-gray-400">Adicional: </span><span>{addr.addressExtra}</span></div>
                    )}
                    <div><span className="text-gray-400">Código postal: </span><span>{addr.zipCode || '—'}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Billing ── */}
          {tab === 'billing' && (
            <div>
              {!user.savedBilling ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin datos de facturación guardados</p>
              ) : (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700">Datos de facturación</span>
                    <span className="text-xs text-gray-400">· {formatDate(user.savedBilling.savedAt)}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-400">Nombre: </span><span>{user.savedBilling.name}</span></div>
                    <div><span className="text-gray-400">Dirección: </span><span>{user.savedBilling.address}</span></div>
                    <div><span className="text-gray-400">Ciudad: </span><span>{user.savedBilling.city}</span></div>
                    <div><span className="text-gray-400">Código postal: </span><span>{user.savedBilling.zipCode || '—'}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Orders ── */}
          {tab === 'orders' && (
            <div>
              {loadingOrders ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : !orders.length ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin pedidos ni proyectos</p>
              ) : (
                <div className="space-y-2">
                  {orders.map(order => {
                    const st = STATUS_CONFIG[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-600', icon: null };
                    const productName = order.product?.name ?? order.product?.type ?? order.productType ?? '—';
                    return (
                      <div key={order.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800 truncate">{productName}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${st.color}`}>
                              {st.icon} {st.label}
                            </span>
                          </div>
                          <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                            <span>#{order.id.slice(0, 8)}</span>
                            <span>{formatDate(order.createdAt)}</span>
                          </div>
                        </div>
                        {order.total > 0 && (
                          <span className="text-sm font-bold text-gray-800 shrink-0">{formatCurrency(order.total)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Modal: Create / Edit User ────────────────────────────────────────────────

const UserFormModal: React.FC<{
  user?: UserRecord | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ user, onClose, onSaved }) => {
  const isEdit = !!user;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [phoneCode, setPhoneCode] = useState(() => {
    if (!user?.phone) return '+57';
    const match = [...COUNTRY_CODES]
      .sort((a, b) => b.code.length - a.code.length)
      .find(c => user.phone!.startsWith(c.code));
    return match?.code ?? '+57';
  });
  const [phoneNumber, setPhoneNumber] = useState(() => {
    if (!user?.phone) return '';
    const match = [...COUNTRY_CODES]
      .sort((a, b) => b.code.length - a.code.length)
      .find(c => user.phone!.startsWith(c.code));
    return match ? user.phone!.slice(match.code.length) : user.phone!;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim()) { setError('El nombre y el email son obligatorios.'); return; }
    if (!isEdit && password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setSaving(true);
    try {
      const phoneValue = phoneNumber.trim() ? phoneCode + phoneNumber.trim() : undefined;
      if (isEdit) {
        await setDoc(doc(db, 'users', user!.uid), {
          name: name.trim(),
          email: email.trim(),
          ...(phoneValue !== undefined ? { phone: phoneValue } : {}),
        }, { merge: true });
      } else {
        await createUserViaRest(email.trim(), password, name.trim(), phoneValue);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold">{isEdit ? 'Editar Usuario' : 'Crear Usuario'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre completo</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Ana García"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              disabled={isEdit}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {isEdit && <p className="text-xs text-gray-400 mt-1">El correo no se puede modificar desde aquí.</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Teléfono <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <PhoneInput
              phoneCode={phoneCode}
              phoneNumber={phoneNumber}
              onPhoneCodeChange={setPhoneCode}
              onPhoneNumberChange={setPhoneNumber}
              label=""
              inputClassName="py-2 text-sm border-gray-200"
            />
          </div>
          {!isEdit && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña inicial</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-semibold bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

const DeleteConfirmModal: React.FC<{
  userName: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}> = ({ userName, onConfirm, onCancel, deleting }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-bold">Eliminar usuario</h3>
        <p className="text-sm text-gray-500">
          ¿Estás seguro de que deseas eliminar a <strong>{userName}</strong>? Se eliminarán sus datos de Firestore.
          Esta acción no se puede deshacer.
        </p>
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={onCancel}
          disabled={deleting}
          className="flex-1 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          className="flex-1 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Eliminar
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const UsersSection: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [editUser, setEditUser] = useState<UserRecord | null | undefined>(undefined); // undefined = closed
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: UserRecord[] = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserRecord));
      list.sort((a, b) => {
        const da = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0);
        const db2 = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0);
        return db2.getTime() - da.getTime();
      });
      setUsers(list);
    } catch (e) {
      console.error('Error loading users:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', deleteTarget.uid));
      setDeleteTarget(null);
      setSelectedUser(null);
      await loadUsers();
    } catch (e) {
      console.error('Error deleting user:', e);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.uid.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Usuarios Registrados</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Cargando...' : `${users.length} usuario${users.length !== 1 ? 's' : ''} en total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setEditUser(null)}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear Usuario
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o UID..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* ── User List ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search ? 'Sin resultados para esa búsqueda.' : 'No hay usuarios registrados.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50/70">
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Usuario</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Email</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Registrado</th>
                <th className="px-5 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Dirs.</th>
                <th className="px-5 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(user => (
                <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors group">
                  {/* Avatar + Name */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {user.name?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 leading-tight">{user.name || '—'}</p>
                        <p className="text-xs text-gray-400 sm:hidden">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  {/* Email */}
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <span className="text-sm text-gray-600">{user.email}</span>
                  </td>
                  {/* Date */}
                  <td className="px-5 py-3 hidden md:table-cell">
                    <span className="text-sm text-gray-500">{formatDate(user.createdAt)}</span>
                  </td>
                  {/* Addresses count */}
                  <td className="px-5 py-3 text-center hidden lg:table-cell">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                      {user.savedAddresses?.length ?? 0}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditUser(user)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(user)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ── */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onEdit={u => { setSelectedUser(null); setEditUser(u); }}
          onDelete={uid => setDeleteTarget(users.find(u => u.uid === uid) ?? null)}
        />
      )}

      {editUser !== undefined && (
        <UserFormModal
          user={editUser}
          onClose={() => setEditUser(undefined)}
          onSaved={loadUsers}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          userName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
};

export default UsersSection;
