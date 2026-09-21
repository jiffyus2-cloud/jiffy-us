import React, { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { Bot, Images, LogIn, Plug, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import OneclicPanel from './OneclicPanel';
import AlbumOrderingLab from './AlbumOrderingLab';

/**
 * Página huérfana para probar y gestionar la conexión con 1clic.ai.
 *
 * No la enlaza ningún menú ni ningún botón: solo se llega escribiendo la ruta
 * (`ONECLIC_LAB_PATH`). Así se puede iterar sobre el panel sin exponerlo en el
 * dashboard. El día que se quiera publicar, basta con montar `<OneclicPanel />`
 * en ConnectionsSection.tsx.
 *
 * Que la ruta no esté enlazada NO es la seguridad: el backend solo atiende
 * `/oneclic/*` con el ID token del dueño (OwnerGuard). Aquí solo se filtra por
 * correo para no mostrar un panel vacío a quien no sea el dueño.
 */
export const ONECLIC_LAB_PATH = '/lab/1clic';

/** Mismo correo que `isOwner()` en firestore.rules y `OwnerGuard` en el backend. */
const OWNER_EMAIL = 'jiffyus2@gmail.com';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gray-100">
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-purple-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Laboratorio · Conexión 1clic.ai</h1>
            <p className="text-xs text-gray-500">Ruta sin enlazar, solo para el dueño. Nada de lo que hagas aquí cambia pedidos ni configuración.</p>
          </div>
        </div>
        <Link to="/owner-dashboard" className="text-sm font-semibold text-gray-600 hover:text-black">Ir al dashboard</Link>
      </div>
    </header>
    <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
  </div>
);

type LabTab = 'connection' | 'albums';

const TABS: { id: LabTab; label: string; icon: React.ReactNode }[] = [
  { id: 'connection', label: 'Conexión', icon: <Plug className="w-4 h-4" /> },
  { id: 'albums', label: 'Ordenar álbumes (prueba)', icon: <Images className="w-4 h-4" /> },
];

const OneclicLabPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [tab, setTab] = useState<LabTab>('connection');

  if (isLoading) {
    return (
      <Shell>
        <p className="text-sm text-gray-500">Cargando sesión…</p>
      </Shell>
    );
  }

  if (!user) {
    // Se manda a /login con `from` para volver aquí al entrar: la ruta no
    // aparece en ningún menú, así que sin esto habría que volver a teclearla.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if ((user.email || '').toLowerCase() !== OWNER_EMAIL) {
    return (
      <Shell>
        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">Esta página solo funciona con la cuenta de administración.</p>
            <p className="mt-1">Has entrado como {user.email}. El backend rechazaría igualmente cualquier petición de esta cuenta.</p>
            <Link to="/login" className="inline-flex items-center gap-1.5 mt-3 font-semibold underline">
              <LogIn className="w-4 h-4" /> Cambiar de cuenta
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <nav className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl transition-colors -mb-px ${tab === t.id ? 'bg-white border border-b-white border-gray-200 text-black' : 'text-gray-500 hover:text-black hover:bg-gray-200/60'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>
      {/* Las dos pestañas se montan solo cuando se ven: cada una carga lo suyo al montarse. */}
      {tab === 'connection' ? <OneclicPanel /> : <AlbumOrderingLab />}
    </Shell>
  );
};

export default OneclicLabPage;
