import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/firebase', () => ({ storage: {}, db: {} }));

import { altFromFileName, imageSnippet, insertOnOwnLine } from './emailImage';
import { templateFromDoc } from '../../services/emailTemplates';

const URL = 'https://firebasestorage.googleapis.com/v0/b/x/o/email_images%2Fa.jpg?alt=media&token=1';

describe('imageSnippet', () => {
  it('formato texto: ![descripción](url), sin corchetes ni saltos en la descripción', () => {
    expect(imageSnippet(URL, 'Álbum [nuevo]\n2026', 'text')).toBe(`![Álbum nuevo 2026](${URL})`);
  });

  it('formato HTML: <img> con atributos escapados', () => {
    const html = imageSnippet(URL, 'Foto "linda" <3', 'html');
    expect(html).toContain('src="https://firebasestorage.googleapis.com/v0/b/x/o/email_images%2Fa.jpg?alt=media&amp;token=1"');
    expect(html).toContain('alt="Foto &quot;linda&quot; &lt;3"');
  });
});

describe('insertOnOwnLine', () => {
  it('en medio de una línea la parte en dos para que la imagen quede sola', () => {
    const r = insertOnOwnLine('Hola mundo', 4, 4, '![x](u)');
    expect(r.text).toBe('Hola\n![x](u)\n mundo');
    expect(r.cursor).toBe('Hola\n![x](u)\n'.length);
  });

  it('al inicio de una línea o en un texto vacío no añade saltos de más', () => {
    expect(insertOnOwnLine('', 0, 0, 'I').text).toBe('I');
    expect(insertOnOwnLine('Uno\nDos', 4, 4, 'I').text).toBe('Uno\nI\nDos');
    expect(insertOnOwnLine('Uno\n', 4, 4, 'I').text).toBe('Uno\nI');
  });

  it('reemplaza la selección', () => {
    expect(insertOnOwnLine('Uno\nBORRAR\nDos', 4, 10, 'I').text).toBe('Uno\nI\nDos');
  });
});

describe('altFromFileName', () => {
  it('quita la extensión y los separadores', () => {
    expect(altFromFileName('promo_navidad-2026.final.JPG')).toBe('promo navidad 2026 final');
  });
});

describe('templateFromDoc', () => {
  it('normaliza documentos incompletos', () => {
    const t = templateFromDoc('a', { name: '  ', subject: 'Hola', format: 'otro' });
    expect(t).toMatchObject({ id: 'a', name: 'Sin nombre', subject: 'Hola', body: '', format: 'text', updatedAt: null });
  });
});
