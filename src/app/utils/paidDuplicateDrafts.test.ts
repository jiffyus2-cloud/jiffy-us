import { describe, it, expect } from 'vitest';
import { findPaidDuplicateDrafts } from './paidDuplicateDrafts';

const DRAFT_ID = 'AbCdEfGhIjKlMnOpQrSt';
const PAID_ID = 'ZyXwVuTsRqPoNmLkJiHg';
const url = (uid: string, orderId: string, file: string) =>
  `https://firebasestorage.googleapis.com/v0/b/b.app/o/orders%2F${uid}%2F${orderId}%2F${file}?alt=media`;

describe('findPaidDuplicateDrafts', () => {
  it('detecta el borrador cuyas fotos reutiliza un pedido pagado del mismo cliente', () => {
    const draft = { id: DRAFT_ID, userId: 'u1', status: 'saved_draft', photos: [url('u1', DRAFT_ID, 'a.jpg')] };
    const paid = {
      id: PAID_ID, userId: 'u1', status: 'paid',
      pages: [{ images: [url('u1', DRAFT_ID, 'a.jpg'), url('u1', PAID_ID, 'b.jpg')] }],
    };
    const result = findPaidDuplicateDrafts([draft, paid]);
    expect(result.get(DRAFT_ID)?.id).toBe(PAID_ID);
    expect(result.size).toBe(1);
  });

  it('también cuenta la portada y los estados posteriores al pago', () => {
    const draft = { id: DRAFT_ID, userId: 'u1', status: 'pending_payment' };
    const paid = { id: PAID_ID, userId: 'u1', status: 'enviado', coverData: { image: url('u1', DRAFT_ID, 'cover.jpg') } };
    expect(findPaidDuplicateDrafts([draft, paid]).has(DRAFT_ID)).toBe(true);
  });

  it('ignora pedidos de otro cliente y pedidos aún no pagados', () => {
    const draft = { id: DRAFT_ID, userId: 'u1', status: 'saved_draft' };
    const otherUser = { id: PAID_ID, userId: 'u2', status: 'paid', photos: [url('u1', DRAFT_ID, 'a.jpg')] };
    const unpaid = { id: 'x'.repeat(20), userId: 'u1', status: 'saved_draft', photos: [url('u1', DRAFT_ID, 'a.jpg')] };
    expect(findPaidDuplicateDrafts([draft, otherUser, unpaid]).size).toBe(0);
  });

  it('no marca un borrador independiente con fotos propias', () => {
    const draft = { id: DRAFT_ID, userId: 'u1', status: 'saved_draft', photos: [url('u1', DRAFT_ID, 'a.jpg')] };
    const paid = { id: PAID_ID, userId: 'u1', status: 'paid', photos: [url('u1', PAID_ID, 'a.jpg')] };
    expect(findPaidDuplicateDrafts([draft, paid]).size).toBe(0);
  });
});
