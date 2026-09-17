export interface Album {
  id: string;
  name: string;
  description: string;
  price: number;
  pages: number;
  image: string;
}

export interface Calendar {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  type: 'desk' | 'wall-notes' | 'wall-no-notes';
}

export interface CustomAlbumProduct {
  id: string;
  name: string;
  description: string;
  image: string;
  type: 'custom-album';
}

export const BASE_ALBUM: Album = {
  id: 'base-album',
  name: 'Classic Album',
  description: 'Our signature premium photo album',
  price: 69.99,
  pages: 40,
  image: 'https://images.unsplash.com/photo-1582047099758-862642d6c7df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsaW5lbiUyMHBob3RvJTIwYWxidW0lMjBlbGVnYW50fGVufDF8fHx8MTc3MTQ1NTUyOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
};

export const BASE_CALENDAR: Calendar = {
  id: 'base-calendar',
  name: 'Classic Calendar',
  description: 'Elegant wall calendar for your memories',
  price: 24.99,
  image: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=800&h=1000&fit=crop',
  type: 'wall-notes',
};

export const BASE_CUSTOM_ALBUM: CustomAlbumProduct = {
  id: 'base-custom-album',
  name: 'Álbum Personalizado',
  description: 'Un curador te acompaña de principio a fin, desde la selección de fotos hasta el diseño final.',
  image: 'https://images.unsplash.com/photo-1582047099758-862642d6c7df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80',
  type: 'custom-album',
};
