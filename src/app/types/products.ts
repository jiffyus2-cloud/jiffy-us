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

export interface MugProduct {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  image: string;
  type: 'mug';
}

export interface PhotoPack {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  image: string;
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

export const BASE_MUG: MugProduct = {
  id: 'base-mug',
  name: 'Classic Mug',
  description: 'Perfect for your morning coffee',
  basePrice: 12.99,
  image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&h=800&fit=crop',
  type: 'mug',
};

export const BASE_PHOTO_PACK: PhotoPack = {
  id: 'base-photo-pack',
  name: 'Photo Pack',
  description: 'High-quality loose photo prints',
  basePrice: 0.50, // Price per photo
  image: 'https://images.unsplash.com/photo-1541517155340-0220c1d1a8a3?w=800&h=1000&fit=crop',
};
