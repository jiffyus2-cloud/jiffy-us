import { RouterProvider } from 'react-router';
import { router } from './routes';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { StoreConfigProvider } from './context/StoreConfigContext'; // <-- LÍNEA AÑADIDA

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <StoreConfigProvider>
          <RouterProvider router={router} />
        </StoreConfigProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}