import { Link, useNavigate, useLocation } from 'react-router';
import { Button } from '../ui/button';
import { DESIGN } from '../../../styles/design-system';
import React from 'react';
import logo from '../../../assets/JiffyLogo.svg';
import { useLanguage } from '../../context/LanguageContext';
import { Globe, LogOut, User, Plus, Home } from 'lucide-react';
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
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <div className="flex items-center gap-3 sm:gap-8">
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0">
            <img src={logo} alt="Jiffy" className="h-10 sm:h-12 w-auto" />
          </Link>

          <nav className="flex items-center gap-3 sm:gap-6">
            {user && (
              <div className={`px-3 py-1.5 rounded-lg transition-all ${isDashboard ? 'bg-primary/10 border border-primary/20' : 'hover:bg-gray-50'}`}>
                <Link 
                  to="/dashboard" 
                  className={`text-xs sm:text-sm font-bold transition-colors ${isDashboard ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}
                >
                  {t('nav.dashboard')}
                </Link>
              </div>
            )}
          </nav>
        </div>

        <nav className="flex items-center gap-3 sm:gap-6">
          {user && (
            <div className="hidden lg:flex items-center gap-2 mr-2">
              <span className="text-sm font-medium text-gray-700">
                ¡Hola, <span className="text-primary font-bold">{userData?.name || user.displayName || 'Usuario'}</span>! 👋
              </span>
            </div>
          )}

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
            className="flex items-center gap-2 text-gray-600"
          >
            <Globe className="w-4 h-4" />
            <span className="uppercase font-semibold">{language}</span>
          </Button>
          
          {user ? (
            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                asChild 
                size="sm" 
                className={`${DESIGN.button.primary} hidden sm:flex items-center gap-2 shadow-sm`}
              >
                <Link to="/create">
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Pedido</span>
                </Link>
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout} 
                className="flex items-center gap-2 border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Cerrar sesión</span>
              </Button>
              
              <div className="sm:hidden">
                 <Button asChild size="icon" variant="ghost" className="text-primary">
                    <Link to="/create">
                      <Plus className="w-5 h-5" />
                    </Link>
                 </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild size="sm" className="font-medium">
                <Link to="/login">{t('nav.login')}</Link>
              </Button>
              <Button asChild size="sm" className={`${DESIGN.button.primary} rounded-lg font-medium`}>
                <Link to="/registro">{t('nav.signup')}</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
