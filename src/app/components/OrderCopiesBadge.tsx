import { Copy } from 'lucide-react';
import { orderCopies } from '../utils/orderPaymentSummary';

/**
 * Aviso de copias idénticas («×5 copias»). Solo aparece cuando el pedido es de
 * más de una copia, para que nadie produzca una sola por despiste.
 */
export default function OrderCopiesBadge({ order, className = '' }: { order: any; className?: string }) {
  const copies = orderCopies(order);
  if (copies <= 1) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 ${className}`}
      title={`El cliente pidió ${copies} copias idénticas de este diseño`}
      data-testid="order-copies-badge"
    >
      <Copy className="w-3 h-3" /> ×{copies} copias
    </span>
  );
}
