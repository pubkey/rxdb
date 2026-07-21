import React, { ReactNode } from 'react';
import Head from '@docusaurus/Head';

/**
 * FAQ section that renders its items as the site-wide styled
 * <details>/<summary> blocks and emits FAQPage JSON-LD structured
 * data for rich search results.
 *
 * Usage in .md/.mdx files:
 *
 * <Faq>
 *   <FaqItem question="Is RxDB free?">
 *
 *     Yes. The core of **[RxDB](./rx-database.md)** is open source.
 *
 *   </FaqItem>
 *   <FaqItem question="Does RxDB work offline?">
 *
 *     Yes. RxDB is a local-first database.
 *
 *   </FaqItem>
 * </Faq>
 */
export function Faq(props: {
    children: ReactNode;
}) {
    const entities: Array<{ question: string; answer: string; }> = [];
    React.Children.forEach(props.children, (child) => {
        if (
            React.isValidElement(child) &&
            typeof (child.props as any).question === 'string'
        ) {
            entities.push({
                question: (child.props as any).question,
                answer: extractPlainText((child.props as any).children)
                    .replace(/\s+/g, ' ')
                    .trim(),
            });
        }
    });

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: entities.map(entity => ({
            '@type': 'Question',
            name: entity.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: entity.answer,
            },
        })),
    };

    return (
        <div>
            {entities.length > 0 && (
                <Head>
                    <script type="application/ld+json">
                        {JSON.stringify(jsonLd)}
                    </script>
                </Head>
            )}
            {props.children}
        </div>
    );
}

export function FaqItem(props: {
    question: string;
    children: ReactNode;
}) {
    return (
        <details>
            <summary>{props.question}</summary>
            <div style={{ paddingTop: 8 }}>
                {props.children}
            </div>
        </details>
    );
}

const BLOCK_LEVEL_TAGS = new Set([
    'p', 'div', 'li', 'ul', 'ol', 'br',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'pre', 'table', 'tr',
]);

/**
 * Recursively extracts the plain text of rendered markdown children
 * so the JSON-LD answer text matches the visible answer.
 * Block-level elements add a separating space so paragraphs
 * do not glue together.
 */
function extractPlainText(node: ReactNode): string {
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }
    if (Array.isArray(node)) {
        return node.map(extractPlainText).join('');
    }
    if (React.isValidElement(node)) {
        const text = extractPlainText((node.props as any).children);
        return typeof node.type === 'string' && BLOCK_LEVEL_TAGS.has(node.type)
            ? text + ' '
            : text;
    }
    return '';
}
