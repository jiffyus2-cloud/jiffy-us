import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { useAuth } from '../../../hooks/useAuth';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  
  const { register, isLoading, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden');
      return;
    }

    try {
      await register(email, password, name);
      onSuccess?.();
      
      // --- CORRECCIÓN DE ENRUTAMIENTO ---
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
        <CardTitle className="text-2xl font-bold text-center">Crear una cuenta</CardTitle>
        <CardDescription className="text-center">
          Ingresa tus datos para comenzar a crear tus álbumes
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 py-2.5">
          {(localError || authError) && (
            <Alert variant="destructive">
              <AlertDescription>{localError || authError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input
              id="name"
              type="text"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full bg-primary" disabled={isLoading}>
            {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
          <div className="text-center text-sm">
            ¿Ya tienes una cuenta?{' '}
            {/* CORRECCIÓN: Pasamos el estado al Link */}
            <Link 
              to="/login" 
              state={{ from: (location.state as any)?.from }} 
              className="text-primary font-medium hover:underline"
            >
              Inicia sesión aquí
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}