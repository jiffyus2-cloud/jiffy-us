import { Receipt, ShoppingBag } from 'lucide-react';
import { describeOrderPayment } from '../utils/orderPaymentSummary';

const cop = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString('es-CO')}`;

/**
 * «Lo pagado» de un pedido, para el panel del dueño: producto, tamaño, tapa,
 * cantidad, páginas extra, descuentos, envío, método y total.
 */
export default function OrderPaidSummary({ order, className = '' }: { order: any; className?: string }) {
  const d = describeOrderPayment(order);
  const qty = Number(order?.quantity ?? order?.paymentSummary?.quantity) || 1;
  return (
    <div className={`rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 text-[11px] leading-snug text-gray-700 ${className}`} data-testid="order-paid-summary">
      <p className="flex items-center gap-1 font-bold text-gray-500 uppercase tracking-wide text-[10px] mb-1">
        <Receipt className="w-3 h-3" /> Lo pagado
        {qty > 1 && (
          <span className="ml-auto normal-case tracking-normal bg-amber-100 text-amber-800 rounded px-1.5 py-0.5" title="Imprimir este diseño varias veces">
            ×{qty} copias
          </span>
        )}
        {d.group && (
          <span
            className={`${qty > 1 ? '' : 'ml-auto '}normal-case tracking-normal bg-indigo-100 text-indigo-700 rounded px-1.5 py-0.5 inline-flex items-center gap-0.5`}
            title={`Pagado junto con otros ${d.group.count - 1} pedido(s) del mismo cliente: un solo pago y un solo envío.`}
          >
            <ShoppingBag className="w-2.5 h-2.5" /> Compra {d.group.index + 1}/{d.group.count}
          </span>
        )}
      </p>
      <ul className="space-y-0.5">
        {d.lines.map((line, i) => (
          <li key={i} className="flex items-start justify-between gap-2">
            <span className="min-w-0">
              {line.label}
              {line.detail && <span className="block text-[10px] text-gray-400">{line.detail}</span>}
            </span>
            {line.amount !== undefined && (
              <span className={`shrink-0 font-mono ${line.amount < 0 ? 'text-green-700' : ''}`}>
                {line.amount < 0 ? '−' : ''}{line.amount === 0 ? 'Gratis' : cop(line.amount)}
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-1 pt-1 border-t border-gray-200 flex items-center justify-between font-bold text-gray-900">
        <span>Total{d.paymentMethodLabel ? ` · ${d.paymentMethodLabel}` : ''}</span>
        <span className="font-mono">{cop(d.total)}</span>
      </div>
      {d.group && (
        <p className="mt-0.5 flex items-center justify-between text-[10px] text-indigo-700">
          <span>Total de la compra ({d.group.count} productos)</span>
          <span className="font-mono">{cop(d.group.total)}</span>
        </p>
      )}
      {!d.exact && (
        <p className="mt-1 text-[10px] text-gray-400" title="Pedido hecho antes de que el checkout guardara el desglose: se muestra lo que quedó registrado, sin precios por línea.">
          Pedido anterior al desglose: sin precios por línea.
        </p>
      )}
    </div>
  );
}
