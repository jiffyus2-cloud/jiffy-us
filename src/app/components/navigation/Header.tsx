import { Link, useNavigate, useLocation } from 'react-router';
import { Button } from '../ui/button';
import React, { useState } from 'react';
import logo from '../../../assets/JiffyLogo.svg';
import { useLanguage } from '../../context/LanguageContext';
import { LogOut, Plus, CircleHelp, Menu } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import { buttonVariants } from '../ui/button';
import { SupportChatPanel } from '../support/SupportChatPanel';

export function Header() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isDashboard = location.pathname === '/dashboard';

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center hover:opacity-75 transition-opacity shrink-0">
              <img src={logo} alt="Jiffy" className="h-8 w-auto" />
            </Link>

            <nav className="hidden sm:flex items-center gap-1">
              {user && (
                <Link
                  to="/dashboard"
                  className={`text-sm px-3 py-1.5 rounded-md transition-colors ${isDashboard ? 'bg-gray-100 text-black font-medium' : 'text-gray-500 hover:text-black hover:bg-gray-50'}`}
                >
                  {t('nav.dashboard')}
                </Link>
              )}
              <button
                onClick={() => setIsSupportOpen(true)}
                aria-label={t('nav.support')}
                title={t('nav.support')}
                className="flex items-center justify-center w-8 h-8 rounded-md transition-colors text-gray-500 hover:text-black hover:bg-gray-50"
              >
                <CircleHelp className="w-4.5 h-4.5" />
              </button>
            </nav>
          </div>

          {/* Desktop actions */}
          <nav className="hidden sm:flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  size="sm"
                  className="flex items-center gap-1.5 bg-black text-white hover:bg-gray-800 text-sm px-4 py-2 h-8"
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

          {/* Mobile: single hamburger menu grouping all nav items */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'h-8 w-8' })}>
                <Menu className="w-4.5 h-4.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                {user && (
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    {t('nav.dashboard')}
                  </DropdownMenuItem>
                )}
                {user && (
                  <DropdownMenuItem onClick={() => navigate('/create')}>
                    <Plus className="w-3.5 h-3.5" />
                    Nuevo Pedido
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setIsSupportOpen(true)}>
                  <CircleHelp className="w-3.5 h-3.5" />
                  {t('nav.support')}
                </DropdownMenuItem>
                {user ? (
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-3.5 h-3.5" />
                    Salir
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => navigate('/login')}>
                      {t('nav.login')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/registro')}>
                      {t('nav.signup')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {isSupportOpen && <SupportChatPanel onClose={() => setIsSupportOpen(false)} />}
    </>
  );
}
