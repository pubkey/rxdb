import React, { ReactNode } from 'react';

/**
 * Renders a schema.org JSON-LD block inline in the component (in the page body,
 * not in the document <head>). Search engines read structured data from the body
 * just as well as from the head, and keeping it next to the component that owns
 * the data makes it render server-side into the static HTML.
 *
 * The `<` characters are escaped so a string value can never close the
 * surrounding <script> tag.
 */
export function JsonLd({ data }: { data: unknown; }) {
    const json = JSON.stringify(data).replace(/</g, '\\u003c');
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: json }}
        />
    );
}

const BLOCK_LEVEL_TAGS = new Set([
    'p', 'div', 'li', 'ul', 'ol', 'br',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'pre', 'table', 'tr',
]);

/**
 * Recursively extracts the plain text of rendered markdown children so the
 * JSON-LD text matches the visible content. Block-level elements add a
 * separating space so paragraphs do not glue together.
 */
export function nodeText(node: ReactNode): string {
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }
    if (Array.isArray(node)) {
        return node.map(nodeText).join('');
    }
    if (React.isValidElement(node)) {
        const text = nodeText((node.props as any).children);
        return typeof node.type === 'string' && BLOCK_LEVEL_TAGS.has(node.type)
            ? text + ' '
            : text;
    }
    return '';
}
