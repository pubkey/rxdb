import React, { ReactNode } from 'react';
import { IconQuoteEnd, IconQuoteStart } from './icons/quote';
import { JsonLd, nodeText } from './json-ld';

export interface QuoteBlockProps {
  author: string;
  year?: string;
  sourceLink?: string;
  children: ReactNode;
}

export function QuoteBlock({
  author,
  year,
  sourceLink,
  children,
}: QuoteBlockProps) {
  const quotationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Quotation',
    text: nodeText(children).replace(/\s+/g, ' ').trim(),
    creator: {
      '@type': 'Person',
      name: author,
    },
    ...(sourceLink ? { citation: sourceLink } : {}),
    ...(year ? { datePublished: year } : {}),
  };
  return (
    <div
      style={{
        borderLeft: '2px solid var(--color-top)',
        paddingLeft: '1rem',
        paddingTop: '0.5rem',
        paddingBottom: '0.5rem',
        marginTop: 30,
        marginBottom: 30
      }}
    >
      <JsonLd data={quotationJsonLd} />
      <IconQuoteStart />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
        <p style={{ margin: 0 }}>{children}</p>
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 5
      }}>

        <IconQuoteEnd />
      </div>
      <p
        style={{
          marginTop: '0.75rem',
          marginBottom: 0,
          textAlign: 'right',
          fontSize: '0.9rem',
        }}
      >
        -{' '}
        {sourceLink ? (
          <a
            href={sourceLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            {author}
          </a>
        ) : (
          author
        )}
        {year && `, ${year}`}
      </p>
    </div>
  );
}
