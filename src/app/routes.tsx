import { createBrowserRouter } from 'react-router';
import LandingPage from './components/LandingPage';
import Creator from './components/Creator';
import UserDashboard from './components/UserDashboard';
import Checkout from './components/Checkout';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { Header } from './components/navigation/Header';
import ProtectedRoute from './components/ProtectedRoute';

const AuthLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col">
    <Header />
    <div className="flex-1 flex items-center justify-center p-4">
      {children}
    </div>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: (
      <AuthLayout>
        <LoginForm />
      </AuthLayout>
    ),
  },
  {
    path: '/registro',
    element: (
      <AuthLayout>
        <RegisterForm />
      </AuthLayout>
    ),
  },
  {
    path: '/create',
    element: <Creator />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <UserDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/checkout',
    element: (
      <ProtectedRoute>
        {/* Note: This is a placeholder for the future standalone checkout route */}
        <Checkout product={{} as any} productType="album" />
      </ProtectedRoute>
    ),
  },
]);
