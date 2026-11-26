import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ShoppingBag, Plus, Minus, Trash2, Pencil, Eye, Loader2, ArrowRight, Image as ImageIcon, Tag, LayoutGrid } from 'lucide-react';
import { Header } from '../navigation/Header';
import { useCart } from '../../context/CartContext';
import { useStoreConfig } from '../../context/StoreConfigContext';
import { useCartOrders, type CartLine } from '../../hooks/useCartOrders';
import { computeCartTotals, MAX_ITEM_QUANTITY } from '../../utils/cartPricing';
import { orderThumbnail } from '../../utils/orderThumbnail';
import { shortSize } from '../../utils/orderPaymentSummary';
import OrderDetailsModal from '../OrderDetailsModal';

const cop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

/** Detalle secundario de una línea: tamaño, tapa, páginas. */
export function lineDetail(line: CartLine): string {
  const p = line.pricing;
  const parts: string[] = [];
  if (p.size) parts.push(shortSize(p.size));
  if (p.kind === 'album') {
    if (p.coverType) parts.push(p.coverType === 'Tela' ? 'Tapa en tela' : 'Tapa dura impresa');
    if (p.pages) parts.push(`${p.pages} págs${p.extraPages ? ` (${p.extraPages} extra)` : ''}`);
  }
  if (p.kind === 'calendar' && line.order?.customization?.year) parts.push(String(line.order.customization.year));
  return parts.join(' · ');
}

export function LineThumb({ order, className = '' }: { order: any; className?: string }) {
  const src = orderThumbnail(order);
  return (
    <div className={`shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-100 ${className}`}>
      {src
        ? <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
        : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon className="w-6 h-6" /></div>}
    </div>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const config = useStoreConfig();
  const { lines, loading } = useCartOrders();
  const [preview, setPreview] = useState<CartLine | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const totals = computeCartTotals(
    lines.map(l => ({ orderId: l.orderId, lineTotal: l.pricing.lineTotal })),
    { discounts: config.discounts, shipping: null },
  );
  const copies = lines.reduce((n, l) => n + l.quantity, 0);

  const editLine = (line: CartLine) => navigate('/create', {
    state: { fromCheckout: true, orderId: line.orderId, productType: line.pricing.kind === 'calendar' ? 'calendar' : 'album' },
  });

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try { await fn(); } finally { setBusyId(null); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="w-full max-w-6xl mx-auto px-4 py-6 md:py-10 flex-1">
        <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
          <ShoppingBag className="w-7 h-7" /> Tu carrito
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Puedes pagar varios productos juntos: un solo pago y un solo envío.
        </p>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin mb-3" /> Cargando tu carrito…
          </div>
        ) : lines.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center max-w-xl mx-auto">
            <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h2 className="text-xl font-semibold mb-1">Tu carrito está vacío</h2>
            <p className="text-gray-500 text-sm mb-6">Crea un álbum o un calendario y agrégalo; también puedes agregar tus borradores guardados.</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button onClick={() => navigate('/create', { state: { fromCart: true } })} className="flex items-center justify-center gap-2 bg-black text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800">
                <Plus className="w-4 h-4" /> Crear un producto
              </button>
              <button onClick={() => navigate('/dashboard')} className="flex items-center justify-center gap-2 border-2 border-gray-200 px-5 py-3 rounded-xl font-semibold hover:bg-gray-50">
                <LayoutGrid className="w-4 h-4" /> Ver mis borradores
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {lines.map(line => (
                <div key={line.orderId} data-testid="cart-line" className="bg-white border border-gray-200 rounded-2xl p-3 md:p-4 flex gap-3 md:gap-4">
                  <button type="button" onClick={() => setPreview(line)} className="shrink-0" aria-label="Ver diseño">
                    <LineThumb order={line.order} className="w-20 h-20 md:w-24 md:h-24" />
                  </button>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {line.pricing.label}
                          {line.order?.coverData?.title ? <span className="font-normal text-gray-500"> · {line.order.coverData.title}</span> : null}
                        </p>
                        <p className="text-xs text-gray-500">{lineDetail(line)}</p>
                      </div>
                      <p className="font-bold whitespace-nowrap" data-testid="cart-line-total">{cop(line.pricing.lineTotal)}</p>
                    </div>

                    <div className="mt-auto pt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-gray-200 rounded-lg" aria-label="Copias">
                          <button
                            type="button"
                            aria-label="Una copia menos"
                            disabled={line.quantity <= 1 || busyId === line.orderId}
                            onClick={() => run(line.orderId, () => cart.setQuantity(line.orderId, line.quantity - 1))}
                            className="w-8 h-8 flex items-center justify-center disabled:text-gray-300 hover:bg-gray-50 rounded-l-lg"
                          ><Minus className="w-3.5 h-3.5" /></button>
                          <span className="w-8 text-center text-sm font-semibold" data-testid="cart-line-qty">{line.quantity}</span>
                          <button
                            type="button"
                            aria-label="Una copia más"
                            disabled={line.quantity >= MAX_ITEM_QUANTITY || busyId === line.orderId}
                            onClick={() => run(line.orderId, () => cart.setQuantity(line.orderId, line.quantity + 1))}
                            className="w-8 h-8 flex items-center justify-center disabled:text-gray-300 hover:bg-gray-50 rounded-r-lg"
                          ><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                        <span className="text-xs text-gray-400">
                          {line.quantity > 1 ? `${line.quantity} copias × ${cop(line.pricing.unitPrice)}` : 'copia'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <button type="button" onClick={() => setPreview(line)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100"><Eye className="w-4 h-4" /><span className="hidden sm:inline">Ver</span></button>
                        <button type="button" onClick={() => editLine(line)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100"><Pencil className="w-4 h-4" /><span className="hidden sm:inline">Editar</span></button>
                        <button
                          type="button"
                          disabled={busyId === line.orderId}
                          onClick={() => run(line.orderId, () => cart.removeItem(line.orderId))}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-red-600 hover:bg-red-50"
                          title="Sale del carrito; el diseño sigue guardado en tus borradores"
                        ><Trash2 className="w-4 h-4" /><span className="hidden sm:inline">Quitar</span></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => navigate('/create', { state: { fromCart: true } })}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-2xl py-4 text-gray-600 font-semibold hover:border-black hover:text-black transition-colors"
              >
                <Plus className="w-4 h-4" /> Agregar otro producto
              </button>
            </div>

            <aside className="lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 lg:sticky lg:top-20 space-y-3 text-sm">
                <h2 className="text-lg font-bold">Resumen</h2>
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({lines.length} producto{lines.length === 1 ? '' : 's'}{copies !== lines.length ? `, ${copies} copias` : ''})</span>
                  <span>{cop(totals.subtotal)}</span>
                </div>
                {totals.storeDiscount > 0 && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span className="flex items-center gap-1"><Tag className="w-4 h-4" /> Descuento ({totals.storeDiscountPct}%)</span>
                    <span>-{cop(totals.storeDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>Envío</span>
                  <span className="italic text-xs">Se calcula en el pago (uno solo)</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                  <span className="font-bold">Total estimado</span>
                  <span className="text-xl font-bold" data-testid="cart-total">{cop(totals.total)}</span>
                </div>
                <button
                  type="button"
                  id="carrito-continuar-pago"
                  onClick={() => navigate('/checkout')}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-black text-white py-4 rounded-xl font-bold text-base hover:bg-gray-900"
                >
                  Continuar al pago <ArrowRight className="w-5 h-5" />
                </button>
                <p className="text-xs text-gray-400 text-center">Los códigos de descuento se aplican en el siguiente paso.</p>
              </div>
            </aside>
          </div>
        )}
      </main>

      {preview && (
        <OrderDetailsModal
          isOpen
          onClose={() => setPreview(null)}
          order={{ ...preview.order, total: preview.pricing.lineTotal, shippingAddress: null, billingAddress: null }}
          hideAddressInfo
          onGoToEdit={() => editLine(preview)}
        />
      )}
    </div>
  );
}
