import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { useState } from 'react';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulación de login
      console.log('Login data:', data);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onSuccess?.();
    } catch (err) {
      setError('Credenciales inválidas. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
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
      <form onSubmit={handleSubmit(onSubmit)}>
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
              {...register('email', {
                required: 'El correo es obligatorio',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Correo electrónico inválido',
                },
              })}
              className={errors.email ? 'border-destructive focus-visible:ring-destructive/20' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
            </div>
            <Input
              id="password"
              type="password"
              {...register('password', {
                required: 'La contraseña es obligatoria',
                minLength: {
                  value: 6,
                  message: 'La contraseña debe tener al menos 6 caracteres',
                },
              })}
              className={errors.password ? 'border-destructive focus-visible:ring-destructive/20' : ''}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full bg-primary" disabled={isLoading}>
            {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Button>
          <div className="text-center text-sm">
            ¿No tienes una cuenta?{' '}
            <Link to="/registro" className="text-primary font-medium hover:underline">
              Regístrate aquí
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
