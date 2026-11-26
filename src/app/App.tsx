import { RouterProvider } from 'react-router';
import { router } from './routes';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { StoreConfigProvider } from './context/StoreConfigContext'; // <-- LÍNEA AÑADIDA
import { SystemImagesProvider } from './context/SystemImagesContext';
import InstallPrompt from './components/InstallPrompt';
import { CartProvider } from './context/CartContext';

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <StoreConfigProvider>
          <SystemImagesProvider>
            <CartProvider>
              <RouterProvider router={router} />
            </CartProvider>
            <InstallPrompt />
          </SystemImagesProvider>
        </StoreConfigProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}