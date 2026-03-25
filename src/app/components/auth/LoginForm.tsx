import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Eye, EyeOff, ArrowLeft, MailCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { mapAuthErrorToKey } from '../../utils/errorMapping';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // ✨ Nuevos estados para el flujo de recuperación de contraseña
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  const { login, resetPassword, isLoading, error } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      onSuccess?.();
      
      const stateFrom = (location.state as any)?.from;
      const from = typeof stateFrom === 'string' ? stateFrom : (stateFrom?.pathname || '/dashboard');
      
      navigate(from, { replace: true, state: typeof stateFrom === 'object' ? stateFrom?.state : undefined });
    } catch (err) {
      // Error handled by useAuth
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword(email);
      setResetSuccess(true);
    } catch (err) {
      // Error handled by useAuth
    }
  };

  // ✨ VISTA DE RECUPERACIÓN DE CONTRASEÑA
  if (isResetMode) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-xl border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">{t('auth.resetPasswordTitle')}</CardTitle>
          <CardDescription className="text-center">
            {resetSuccess 
              ? t('auth.resetSuccessTitle') 
              : t('auth.resetPasswordSubtitle')}
          </CardDescription>
        </CardHeader>
        
        {resetSuccess ? (
          <>
            <CardContent className="flex flex-col items-center py-6">
              <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <MailCheck size={32} />
              </div>
              <p className="text-center text-sm text-gray-600 px-4">
                {t('auth.resetSuccessDesc', { email })}
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setIsResetMode(false);
                  setResetSuccess(false);
                  setPassword('');
                }}
              >
                {t('auth.backToLogin')}
              </Button>
            </CardFooter>
          </>
        ) : (
          <form onSubmit={handleResetSubmit}>
            <CardContent className="space-y-4 py-2.5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{t(mapAuthErrorToKey(error))}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="reset-email">{t('auth.emailLabel')}</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-4">
              <Button type="submit" className="w-full bg-primary" disabled={isLoading || !email}>
                {isLoading ? t('auth.sendingLink') : t('auth.sendResetLink')}
              </Button>
              <button 
                type="button"
                onClick={() => setIsResetMode(false)}
                className="flex items-center justify-center text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={16} className="mr-1" />
                {t('auth.goBack')}
              </button>
            </CardFooter>
          </form>
        )}
      </Card>
    );
  }

  // ✨ VISTA NORMAL DE INICIO DE SESIÓN
  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-gray-100 animate-in fade-in zoom-in-95 duration-200">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">{t('auth.loginTitle')}</CardTitle>
        <CardDescription className="text-center">
          {t('auth.loginSubtitle')}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLoginSubmit}>
        <CardContent className="space-y-4 py-2.5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{t(mapAuthErrorToKey(error))}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.emailLabel')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('auth.passwordLabel')}</Label>
              {/* ✨ Botón para abrir recuperación de contraseña */}
              <button 
                type="button"
                onClick={() => setIsResetMode(true)}
                className="text-xs font-medium text-primary hover:underline focus:outline-none"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full bg-primary" disabled={isLoading}>
            {isLoading ? t('auth.loggingIn') : t('auth.loginButton')}
          </Button>
          <div className="text-center text-sm">
            {t('auth.noAccount')}{' '}
            <Link 
              to="/registro" 
              state={{ from: (location.state as any)?.from }} 
              className="text-primary font-medium hover:underline"
            >
              {t('auth.registerLink')}
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}