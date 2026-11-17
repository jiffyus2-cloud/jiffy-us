import { Fragment, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Header } from '../navigation/Header';
import { useLanguage } from '../../context/LanguageContext';
import { DESIGN } from '../../../styles/design-system';
import { getLegalDoc, LEGAL_PATHS, type LegalDocKind } from './legalContent';

const LINK_RE = /(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.]+|myaccount\.google\.com\/permissions)/g;

/** Convierte URLs y correos del texto en enlaces. */
function linkify(text: string): ReactNode[] {
  return text.split(LINK_RE).map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    const isEmail = part.includes('@') && !part.startsWith('http');
    const href = isEmail ? `mailto:${part}` : part.startsWith('http') ? part : `https://${part}`;
    return (
      <a
        key={i}
        href={href}
        className="text-gray-900 underline underline-offset-2 break-all"
        {...(isEmail ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
      >
        {part}
      </a>
    );
  });
}

export default function LegalPage({ kind }: { kind: LegalDocKind }) {
  const { language } = useLanguage();
  const doc = getLegalDoc(kind, language);
  const other: LegalDocKind = kind === 'privacy' ? 'terms' : 'privacy';
  const otherDoc = getLegalDoc(other, language);

  useEffect(() => {
    const previous = document.title;
    document.title = `${doc.title} · Jiffy Photos`;
    window.scrollTo(0, 0);
    return () => { document.title = previous; };
  }, [doc.title]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className={`${DESIGN.layout.containerNarrow} w-full py-10 md:py-14 flex-1`}>
        <h1 className="text-3xl md:text-4xl font-medium text-black mb-2">{doc.title}</h1>
        <p className={`${DESIGN.text.bodySmall} mb-8`}>{doc.updated}</p>
        <p className={`${DESIGN.text.body} mb-8 leading-relaxed`}>{linkify(doc.intro)}</p>

        {doc.sections.map((section) => (
          <section key={section.heading} className="mb-8">
            <h2 className="text-xl font-medium text-black mb-3">{section.heading}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p} className={`${DESIGN.text.body} mb-3 leading-relaxed`}>{linkify(p)}</p>
            ))}
            {section.bullets && (
              <ul className="list-disc pl-6 space-y-2 mb-3">
                {section.bullets.map((b) => (
                  <li key={b} className={`${DESIGN.text.body} leading-relaxed`}>{linkify(b)}</li>
                ))}
              </ul>
            )}
            {section.after?.map((p) => (
              <p key={p} className={`${DESIGN.text.body} mb-3 leading-relaxed`}>{linkify(p)}</p>
            ))}
          </section>
        ))}

        <div className="border-t border-gray-200 pt-6 mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link to={LEGAL_PATHS[other]} className="text-gray-900 underline underline-offset-2">
            {otherDoc.title}
          </Link>
          <Link to="/" className="text-gray-500 hover:text-gray-900">jiffyphotos.com</Link>
        </div>
      </main>
    </div>
  );
}
