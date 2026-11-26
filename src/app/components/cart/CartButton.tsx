import { Link } from 'react-router';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';

/** Icono del carrito con el número de productos; lleva a /carrito. */
export function CartButton({ className = '' }: { className?: string }) {
  const { count } = useCart();
  return (
    <Link
      to="/carrito"
      aria-label={count > 0 ? `Carrito (${count})` : 'Carrito'}
      title="Carrito"
      data-testid="cart-button"
      className={`relative flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:text-black hover:bg-gray-50 transition-colors ${className}`}
    >
      <ShoppingBag className="w-4.5 h-4.5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
}
