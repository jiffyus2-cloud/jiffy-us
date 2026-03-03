import { createBrowserRouter } from 'react-router';
import LandingPage from './components/LandingPage';
import Creator from './components/Creator';
import UserDashboard from './components/UserDashboard';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { Header } from './components/navigation/Header';
import { Navigate } from 'react-router';

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
    path: '/dashboard',
    Component: UserDashboard,
  },
  {
    path: '/create',
    Component: Creator,
  },
  {
    path: '/login',
    element: (
      <AuthLayout>
        <LoginForm onSuccess={() => (window.location.href = '/')} />
      </AuthLayout>
    ),
  },
  {
    path: '/registro',
    element: (
      <AuthLayout>
        <RegisterForm onSuccess={() => (window.location.href = '/')} />
      </AuthLayout>
    ),
  },
]);