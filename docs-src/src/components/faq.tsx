import React, { ReactNode } from 'react';
import { JsonLd, nodeText } from './json-ld';

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
                answer: nodeText((child.props as any).children)
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
            {entities.length > 0 && <JsonLd data={jsonLd} />}
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
