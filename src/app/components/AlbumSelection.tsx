import { Check } from 'lucide-react';

interface Album {
  id: string;
  name: string;
  description: string;
  price: number;
  pages: number;
  image: string;
}

const albums: Album[] = [
  {
    id: '1',
    name: 'Classic Linen',
    description: 'Elegant linen cover with premium paper',
    price: 79.99,
    pages: 20,
    image: 'https://images.unsplash.com/photo-1582047099758-862642d6c7df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsaW5lbiUyMHBob3RvJTIwYWxidW0lMjBlbGVnYW50fGVufDF8fHx8MTc3MTQ1NTUyOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
  {
    id: '2',
    name: 'Modern Leather',
    description: 'Sophisticated leather bound album',
    price: 99.99,
    pages: 30,
    image: 'https://images.unsplash.com/photo-1504514276537-1f6ffc853594?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsZWF0aGVyJTIwcGhvdG8lMjBhbGJ1bSUyMGJvb2t8ZW58MXx8fHwxNzcxNDU1NTI4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
  {
    id: '3',
    name: 'Rustic Wood',
    description: 'Natural wooden cover with rustic charm',
    price: 89.99,
    pages: 25,
    image: 'https://images.unsplash.com/photo-1610377507996-dcd4f0cfc125?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b29kZW4lMjBwaG90byUyMGFsYnVtJTIwcnVzdGljfGVufDF8fHx8MTc3MTQ1NTUyOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
  {
    id: '4',
    name: 'Minimalist White',
    description: 'Clean and contemporary design',
    price: 69.99,
    pages: 20,
    image: 'https://images.unsplash.com/photo-1638294622885-6356fca9c62d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZSUyMG1pbmltYWxpc3QlMjBwaG90byUyMGFsYnVtfGVufDF8fHx8MTc3MTQ1NTUyOXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
  {
    id: '5',
    name: 'Premium Collection',
    description: 'Luxury album with gold accents',
    price: 129.99,
    pages: 40,
    image: 'https://images.unsplash.com/photo-1758347262341-61a99a04e17a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwcGhvdG8lMjBhbGJ1bSUyMGNvZmZlZSUyMHRhYmxlfGVufDF8fHx8MTc3MTQ1NTUyOXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
];

interface AlbumSelectionProps {
  selectedAlbum: Album | null;
  onSelectAlbum: (album: Album) => void;
}

export default function AlbumSelection({ selectedAlbum, onSelectAlbum }: AlbumSelectionProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12">
      <div className="mb-12 text-center">
        <h2 className="text-4xl mb-4">Choose Your Style</h2>
        <p className="text-gray-600 text-lg">
          Select a premium album style that matches your vision
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {albums.map((album) => (
          <div
            key={album.id}
            onClick={() => onSelectAlbum(album)}
            className={`relative bg-white border-2 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl ${
              selectedAlbum?.id === album.id
                ? 'border-black shadow-lg'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {selectedAlbum?.id === album.id && (
              <div className="absolute top-4 right-4 z-10 bg-black text-white rounded-full p-2">
                <Check className="w-5 h-5" />
              </div>
            )}
            
            <div className="aspect-[3/4] overflow-hidden bg-gray-50">
              <img
                src={album.image}
                alt={album.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="p-6">
              <h3 className="text-xl mb-2">{album.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{album.description}</p>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-2xl">${album.price}</p>
                  <p className="text-gray-500 text-sm">{album.pages} pages</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { Album };