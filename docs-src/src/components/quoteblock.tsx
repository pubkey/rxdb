import React, { ReactNode } from "react";
import { IconQuoteEnd, IconQuoteStart } from './icons/quote';

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
  return (
    <div
      style={{
        borderLeft: "2px solid var(--color-top)",
        paddingLeft: "1rem",
        paddingTop: "0.5rem",
        paddingBottom: "0.5rem",
        marginTop: 30,
        marginBottom: 30
      }}
    >
      <IconQuoteStart />
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
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
          marginTop: "0.75rem",
          marginBottom: 0,
          textAlign: "right",
          fontSize: "0.9rem",
        }}
      >
        –{" "}
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
