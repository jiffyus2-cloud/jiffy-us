import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { useAuth } from '../../../hooks/useAuth';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      onSuccess?.();
      
      // --- CORRECCIÓN DE ENRUTAMIENTO ---
      // Verificamos si 'from' es un texto simple (ej. '/create') o un objeto
      const stateFrom = (location.state as any)?.from;
      const from = typeof stateFrom === 'string' ? stateFrom : (stateFrom?.pathname || '/dashboard');
      
      navigate(from, { replace: true, state: typeof stateFrom === 'object' ? stateFrom?.state : undefined });
    } catch (err) {
      // Error handled by useAuth
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-gray-100">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Bienvenido de nuevo</CardTitle>
        <CardDescription className="text-center">
          Ingresa tus credenciales para acceder a tu cuenta
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 py-2.5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
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
              <Label htmlFor="password">Contraseña</Label>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full bg-primary" disabled={isLoading}>
            {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Button>
          <div className="text-center text-sm">
            ¿No tienes una cuenta?{' '}
            {/* CORRECCIÓN: Pasamos el estado al Link para no perder la memoria de dónde venimos */}
            <Link 
              to="/registro" 
              state={{ from: (location.state as any)?.from }} 
              className="text-primary font-medium hover:underline"
            >
              Regístrate aquí
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}