import React from 'react';

// Textos editables desde "Textos de la Tienda" con el poco formato que admiten.
// Nunca se interpreta HTML: un texto editado no puede meter marcado en la página.

/** Una línea: `**así**` sale en negrilla; el resto, texto plano. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
      )}
    </>
  );
}

/**
 * Varias líneas: cada línea es un párrafo y las que empiezan por "- " forman
 * una lista con viñetas. Las líneas en blanco se ignoran.
 */
export function RichBlock({ text, className }: { text: string; className?: string }) {
  const blocks: Array<{ type: 'p'; text: string } | { type: 'ul'; items: string[] }> = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('- ')) {
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'ul') last.items.push(line.slice(2));
      else blocks.push({ type: 'ul', items: [line.slice(2)] });
    } else {
      blocks.push({ type: 'p', text: line });
    }
  }
  return (
    <div className={className ?? 'space-y-2'}>
      {blocks.map((block, i) =>
        block.type === 'p' ? (
          <p key={i}><RichText text={block.text} /></p>
        ) : (
          <ul key={i} className="list-disc pl-5">
            {block.items.map((item, j) => <li key={j}><RichText text={item} /></li>)}
          </ul>
        )
      )}
    </div>
  );
}
