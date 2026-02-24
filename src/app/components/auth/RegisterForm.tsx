import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { useState } from 'react';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: any) => {
    if (data.password !== data.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      // Simulación de registro
      console.log('Register data:', data);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onSuccess?.();
    } catch (err) {
      setError('Hubo un error al crear tu cuenta. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
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
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 py-2.5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input
              id="name"
              type="text"
              placeholder="Tu nombre"
              {...register('name', {
                required: 'El nombre es obligatorio',
                minLength: { value: 3, message: 'El nombre debe tener al menos 3 caracteres' },
              })}
              className={errors.name ? 'border-destructive focus-visible:ring-destructive/20' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                {...register('password', {
                  required: 'La contraseña es obligatoria',
                  minLength: {
                    value: 6,
                    message: 'Al menos 6 caracteres',
                  },
                })}
                className={errors.password ? 'border-destructive focus-visible:ring-destructive/20' : ''}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword', {
                  required: 'Confirma tu contraseña',
                })}
                className={errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive/20' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full bg-primary" disabled={isLoading}>
            {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
          <div className="text-center text-sm">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Inicia sesión aquí
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
