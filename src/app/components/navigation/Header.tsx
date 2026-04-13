import { Link, useNavigate, useLocation } from 'react-router';
import { Button } from '../ui/button';
import React from 'react';
import logo from '../../../assets/JiffyLogo.svg';
import { useLanguage } from '../../context/LanguageContext';
import { Globe, LogOut, Plus } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

export function Header() {
  const { language, setLanguage, t } = useLanguage();
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isDashboard = location.pathname === '/dashboard';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center hover:opacity-75 transition-opacity shrink-0">
            <img src={logo} alt="Jiffy" className="h-8 w-auto" />
          </Link>

          <nav className="flex items-center gap-1">
            {user && (
              <Link
                to="/dashboard"
                className={`text-sm px-3 py-1.5 rounded-md transition-colors ${isDashboard ? 'bg-gray-100 text-black font-medium' : 'text-gray-500 hover:text-black hover:bg-gray-50'}`}
              >
                {t('nav.dashboard')}
              </Link>
            )}
          </nav>
        </div>

        <nav className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
            className="text-gray-400 hover:text-gray-700 text-xs gap-1.5 px-2"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase">{language}</span>
          </Button>

          {user ? (
            <div className="flex items-center gap-2">
              <Button
                asChild
                size="sm"
                className="hidden sm:flex items-center gap-1.5 bg-black text-white hover:bg-gray-800 text-sm px-4 py-2 h-8"
              >
                <Link to="/create">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Pedido</span>
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-700 h-8 px-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline ml-1.5 text-sm">Salir</span>
              </Button>

              <div className="sm:hidden">
                <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                  <Link to="/create">
                    <Plus className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild size="sm" className="text-gray-600 text-sm h-8">
                <Link to="/login">{t('nav.login')}</Link>
              </Button>
              <Button asChild size="sm" className="bg-black text-white hover:bg-gray-800 text-sm h-8 px-4">
                <Link to="/registro">{t('nav.signup')}</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
