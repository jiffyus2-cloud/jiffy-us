import React, { useState } from 'react';
import { 
  Package, 
  Truck, 
  Clock, 
  Plus, 
  ChevronRight, 
  CheckCircle, 
  History,
  ExternalLink,
  RotateCcw,
  Star,
  MapPin,
  Box,
  Check
} from 'lucide-react';
import { DESIGN } from '../../styles/design-system';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { Textarea } from './ui/textarea';
import { useAuth } from '../../hooks/useAuth';
import { Header } from './navigation/Header';

// Types for our dashboard
type OrderStatus = 'Recibido' | 'En Producción' | 'Enviado' | 'Entregado';

interface Order {
  id: string;
  product: string;
  date: string;
  status: OrderStatus;
  total: string;
  progress: number;
}

const STEPS: OrderStatus[] = ['Recibido', 'En Producción', 'Enviado', 'Entregado'];

const UserDashboard: React.FC = () => {
  const { userData } = useAuth();
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(0);

  // Mock data
  const ongoingOrders: Order[] = [
    {
      id: 'ORD-7721',
      product: 'Álbum Premium XL',
      date: '2024-02-25',
      status: 'En Producción',
      total: '45.00€',
      progress: 40,
    },
    {
      id: 'ORD-9950',
      product: 'Libro de Fotos Familiar',
      date: '2024-02-28',
      status: 'Enviado',
      total: '32.50€',
      progress: 75,
    },
    {
      id: 'ORD-8812',
      product: 'Calendario Pared A3',
      date: '2024-02-27',
      status: 'Recibido',
      total: '19.90€',
      progress: 10,
    }
  ];

  const orderHistory: Order[] = [
    { id: 'ORD-1234', product: 'Pack 20 Fotos', date: '2024-01-15', status: 'Entregado', total: '12.50€', progress: 100 },
    { id: 'ORD-0987', product: 'Mug Personalizada', date: '2023-12-20', status: 'Entregado', total: '15.00€', progress: 100 },
  ];

  const getStepIndex = (status: OrderStatus) => STEPS.indexOf(status);

  const handleOpenTracking = (order: Order) => {
    setSelectedOrder(order);
    setIsTrackingOpen(true);
  };

  const handleOpenRating = (order: Order) => {
    setSelectedOrder(order);
    setIsRatingOpen(true);
    setRating(0);
  };

  return (
    <div className={`min-h-screen bg-gray-50 pb-20`}>
      <Header />
      
      {/* Hero Section Simplified */}
      <div className="bg-white border-b border-gray-200 py-8">
        <div className={DESIGN.layout.container}>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Mi Panel de Control
            </h1>
            <p className="text-gray-500 mt-1">
              Gestiona tus recuerdos y sigue tus pedidos en tiempo real.
            </p>
          </div>
        </div>
      </div>

      <main className={`${DESIGN.layout.container} mt-8 space-y-12`}>
        
        {/* Ongoing Orders Section */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold">Pedidos en Curso</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {ongoingOrders.map((order) => (
              <Card key={order.id} className="border-none shadow-md overflow-hidden bg-white hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{order.product}</CardTitle>
                      <CardDescription className="font-mono text-sm mt-1">ID: {order.id}</CardDescription>
                    </div>
                    <Badge variant="secondary" className={`${order.status === 'Enviado' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {/* Stepper Visual */}
                  <div className="relative mt-4 mb-8">
                    <div className="flex justify-between mb-4">
                      {STEPS.map((step, idx) => {
                        const isActive = idx <= getStepIndex(order.status);
                        return (
                          <div key={step} className="flex flex-col items-center z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                              ${isActive ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 text-gray-300'}`}>
                              {idx < getStepIndex(order.status) ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <span className="text-xs font-bold">{idx + 1}</span>
                              )}
                            </div>                            <span className={`text-[10px] mt-2 font-medium hidden md:block
                              ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Progress Bar Background */}
                    <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-100 -z-0" />
                    <div 
                      className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-500 -z-0" 
                      style={{ width: `${order.progress}%` }}
                    />
                  </div>

                  {order.status === 'Enviado' && (
                    <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-orange-100 p-2 rounded-lg">
                            <Truck className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-orange-900">¡Tu pedido está en camino!</p>
                            <p className="text-xs text-orange-700">Llegada estimada: Mañana, 3 Mar</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-white border-orange-200 text-orange-700 hover:bg-orange-50"
                          onClick={() => handleOpenTracking(order)}
                        >
                          Seguir Envío
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Pedido el {new Date(order.date).toLocaleDateString()}</span>
                    </div>
                    <div className="font-semibold text-gray-900">{order.total}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* History Section */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <History className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold">Historial de Pedidos</h2>
          </div>
          
          <Card className="border-none shadow-md overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">Pedido ID</TableHead>
                  <TableHead className="font-semibold">Fecha</TableHead>
                  <TableHead className="font-semibold">Producto</TableHead>
                  <TableHead className="font-semibold">Total</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="text-right font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderHistory.map((order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-mono text-sm">{order.id}</TableCell>
                    <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{order.product}</TableCell>
                    <TableCell>{order.total}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => handleOpenRating(order)}
                        >
                          <Star className="w-4 h-4 mr-1" />
                          Calificar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary/80 hover:bg-primary/10">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Detalles
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-gray-600">
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Repetir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      </main>

      {/* Tracking Modal */}
      <Dialog open={isTrackingOpen} onOpenChange={setIsTrackingOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Truck className="w-6 h-6 text-primary" />
              Seguimiento de Envío
            </DialogTitle>
            <DialogDescription>
              Pedido {selectedOrder?.id} • {selectedOrder?.product}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="space-y-8 relative before:absolute before:inset-0 before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
              <div className="relative flex gap-4">
                <div className="z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-gray-900">En reparto</p>
                  <p className="text-xs text-gray-500">Madrid, España • 02 Mar, 09:30</p>
                  <p className="text-sm text-gray-600">El transportista tiene tu paquete y lo entregará hoy mismo.</p>
                </div>
              </div>

              <div className="relative flex gap-4">
                <div className="z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary border-2 border-primary/30">
                  <Box className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-1 text-gray-500">
                  <p className="text-sm font-semibold">Llegada al centro logístico</p>
                  <p className="text-xs">Madrid, España • 01 Mar, 21:15</p>
                </div>
              </div>

              <div className="relative flex gap-4">
                <div className="z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary border-2 border-primary/30">
                  <Check className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-1 text-gray-500">
                  <p className="text-sm font-semibold">Salida de producción</p>
                  <p className="text-xs">Barcelona, España • 01 Mar, 10:00</p>
                </div>
              </div>

              <div className="relative flex gap-4">
                <div className="z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary border-2 border-primary/30">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-1 text-gray-500">
                  <p className="text-sm font-semibold">Pedido recibido</p>
                  <p className="text-xs">Online • 28 Feb, 15:45</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsTrackingOpen(false)} className="w-full">
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Modal */}
      <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">Califica tu pedido</DialogTitle>
            <DialogDescription className="text-center">
              ¿Qué te ha parecido tu {selectedOrder?.product}? Tu opinión nos ayuda a mejorar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center py-6 gap-6">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setRating(star)}
                  className="transition-transform active:scale-90"
                >
                  <Star 
                    className={`w-10 h-10 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} 
                  />
                </button>
              ))}
            </div>

            <Textarea 
              placeholder="Cuéntanos más sobre tu experiencia (opcional)..." 
              className="min-h-[100px] rounded-xl border-gray-200 focus:ring-primary"
            />
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button 
              className="w-full py-6 rounded-xl text-lg font-semibold"
              disabled={rating === 0}
              onClick={() => setIsRatingOpen(false)}
            >
              Enviar Calificación
            </Button>
            <Button 
              variant="ghost" 
              className="w-full text-gray-500"
              onClick={() => setIsRatingOpen(false)}
            >
              Ahora no
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default UserDashboard;
