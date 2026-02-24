import { createBrowserRouter } from 'react-router';
import LandingPage from './components/LandingPage';
import Creator from './components/Creator';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: LandingPage,
  },
  {
    path: '/create',
    Component: Creator,
  },
]);