import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string;
const CUSTOMER_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_CUSTOMER_TEMPLATE_ID as string;
const OWNER_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_OWNER_TEMPLATE_ID as string;

const OWNER_EMAIL = 'memorias@jiffyphotos.com';

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function sendOrderConfirmationToCustomer(order: any): Promise<void> {
  const customerEmail = order.shippingAddress?.email;
  if (!customerEmail) {
    console.warn('No customer email found in order, skipping customer confirmation email.');
    return;
  }

  const params = {
    to_email: customerEmail,
    to_name: order.shippingAddress?.name || 'Cliente',
    order_id: order.id,
    product_name: order.product?.name || 'Producto personalizado',
    order_total: formatCOP(order.total || 0),
    order_date: formatDate(order.createdAt || new Date().toISOString()),
    shipping_address: [
      order.shippingAddress?.address,
      order.shippingAddress?.addressExtra,
      order.shippingAddress?.city,
      order.shippingAddress?.department,
    ]
      .filter(Boolean)
      .join(', '),
    customization_size: order.customization?.size || '',
    customization_paper: order.customization?.paper || '',
  };

  await emailjs.send(SERVICE_ID, CUSTOMER_TEMPLATE_ID, params, PUBLIC_KEY);
}

export async function sendNewOrderNotificationToOwner(order: any): Promise<void> {
  const ownerDashboardUrl = `${window.location.origin}/owner-dashboard`;

  const params = {
    to_email: OWNER_EMAIL,
    order_id: order.id,
    customer_name: order.shippingAddress?.name || 'Sin nombre',
    customer_email: order.shippingAddress?.email || '',
    product_name: order.product?.name || 'Producto personalizado',
    order_total: formatCOP(order.total || 0),
    order_date: formatDate(order.createdAt || new Date().toISOString()),
    dashboard_url: ownerDashboardUrl,
  };

  await emailjs.send(SERVICE_ID, OWNER_TEMPLATE_ID, params, PUBLIC_KEY);
}
