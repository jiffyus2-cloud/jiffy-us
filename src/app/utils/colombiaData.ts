/**
 * Departamentos y municipios principales de Colombia.
 * Fuente: DANE – División Político-Administrativa (DIVIPOLA).
 */

export interface Department {
  name: string;
  cities: string[];
}

export const COLOMBIA_DEPARTMENTS: Department[] = [
  {
    name: 'Amazonas',
    cities: ['Leticia', 'Puerto Nariño'],
  },
  {
    name: 'Antioquia',
    cities: [
      'Medellín', 'Bello', 'Itagüí', 'Envigado', 'Apartadó', 'Rionegro',
      'Turbo', 'Sabaneta', 'Caucasia', 'Caldas', 'Copacabana', 'La Estrella',
      'Girardota', 'Barbosa',
    ],
  },
  {
    name: 'Arauca',
    cities: ['Arauca', 'Saravena', 'Tame'],
  },
  {
    name: 'Atlántico',
    cities: ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga', 'Baranoa'],
  },
  {
    name: 'Bogotá D.C.',
    cities: ['Bogotá D.C.'],
  },
  {
    name: 'Bolívar',
    cities: ['Cartagena', 'Magangué', 'Turbaco', 'El Carmen de Bolívar'],
  },
  {
    name: 'Boyacá',
    cities: ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa'],
  },
  {
    name: 'Caldas',
    cities: ['Manizales', 'Villamaría', 'La Dorada', 'Chinchiná', 'Riosucio'],
  },
  {
    name: 'Caquetá',
    cities: ['Florencia', 'San Vicente del Caguán'],
  },
  {
    name: 'Casanare',
    cities: ['Yopal', 'Aguazul', 'Villanueva'],
  },
  {
    name: 'Cauca',
    cities: ['Popayán', 'Santander de Quilichao', 'Puerto Tejada', 'Patía'],
  },
  {
    name: 'Cesar',
    cities: ['Valledupar', 'Aguachica', 'Codazzi', 'La Paz'],
  },
  {
    name: 'Chocó',
    cities: ['Quibdó', 'Istmina', 'Tadó'],
  },
  {
    name: 'Córdoba',
    cities: ['Montería', 'Lorica', 'Cereté', 'Montelíbano', 'Sahagún'],
  },
  {
    name: 'Cundinamarca',
    cities: [
      'Soacha', 'Facatativá', 'Zipaquirá', 'Fusagasugá', 'Girardot',
      'Chía', 'Mosquera', 'Madrid', 'Funza', 'Cajicá', 'Tocancipá',
    ],
  },
  {
    name: 'Guainía',
    cities: ['Inírida'],
  },
  {
    name: 'Guaviare',
    cities: ['San José del Guaviare'],
  },
  {
    name: 'Huila',
    cities: ['Neiva', 'Pitalito', 'Garzón', 'La Plata'],
  },
  {
    name: 'La Guajira',
    cities: ['Riohacha', 'Maicao', 'Uribia', 'Manaure'],
  },
  {
    name: 'Magdalena',
    cities: ['Santa Marta', 'Ciénaga', 'Fundación', 'El Banco'],
  },
  {
    name: 'Meta',
    cities: ['Villavicencio', 'Acacías', 'Granada', 'Puerto López'],
  },
  {
    name: 'Nariño',
    cities: ['Pasto', 'Tumaco', 'Ipiales', 'Túquerres'],
  },
  {
    name: 'Norte de Santander',
    cities: ['Cúcuta', 'Ocaña', 'Pamplona', 'Villa del Rosario', 'Los Patios'],
  },
  {
    name: 'Putumayo',
    cities: ['Mocoa', 'Puerto Asís', 'Orito'],
  },
  {
    name: 'Quindío',
    cities: ['Armenia', 'Calarcá', 'Montenegro', 'Circasia', 'La Tebaida'],
  },
  {
    name: 'Risaralda',
    cities: ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia'],
  },
  {
    name: 'San Andrés y Providencia',
    cities: ['San Andrés', 'Providencia'],
  },
  {
    name: 'Santander',
    cities: [
      'Bucaramanga', 'Floridablanca', 'Girón', 'Barrancabermeja', 'Piedecuesta',
      'San Gil', 'Socorro', 'Vélez',
    ],
  },
  {
    name: 'Sucre',
    cities: ['Sincelejo', 'Corozal', 'Sampués', 'San Marcos'],
  },
  {
    name: 'Tolima',
    cities: ['Ibagué', 'Espinal', 'Melgar', 'Honda', 'Chaparral'],
  },
  {
    name: 'Valle del Cauca',
    cities: [
      'Cali', 'Buenaventura', 'Palmira', 'Tuluá', 'Buga', 'Cartago',
      'Yumbo', 'Jamundí', 'Candelaria', 'Guadalajara de Buga',
    ],
  },
  {
    name: 'Vaupés',
    cities: ['Mitú'],
  },
  {
    name: 'Vichada',
    cities: ['Puerto Carreño'],
  },
];
