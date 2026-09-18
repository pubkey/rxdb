import React from 'react';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import { JsonLd } from './json-ld';

const SITE_URL = 'https://rxdb.info';
const DEFAULT_AUTHOR = 'Daniel Meyer';
const DEFAULT_AUTHOR_URL = 'https://www.linkedin.com/in/danielmeyerdev/';

export type ArticleBylineProps = {
    /**
     * (optional) Name of the person who wrote the article.
     * [default='Daniel Meyer']
     */
    author?: string;
    /**
     * (optional) Link to the author's profile, used on the byline and in
     * the `author.url` field of the Article JSON-LD. [default=the RxDB
     * maintainer's LinkedIn profile]
     */
    authorUrl?: string;
    /**
     * The date the article was first published, as an ISO date
     * like "2025-01-22". This is the oldest git commit that added the
     * file, so it stays accurate without anyone having to update it by
     * hand.
     */
    published: string;
};

/**
 * Blog-like byline shown under the H1 of every article, so the article can
 * be quoted and cited with a named author and a publication date, the same
 * way a blog post would be. Also emits Article JSON-LD structured data
 * (author, datePublished, dateModified) for search engines and AI answer
 * engines that read structured data to attribute a quote.
 *
 * The "Updated" date comes from `showLastUpdateTime`, Docusaurus' own git
 * based last-modified date for the page (see docs-fetch-git-history.mjs),
 * so it keeps updating itself on every future edit of the article.
 *
 * Usage in any article under docs/articles, no import needed (registered
 * globally in src/theme/MDXComponents):
 *
 *   <ArticleByline published="2025-01-22" />
 */
export function ArticleByline({
    author = DEFAULT_AUTHOR,
    authorUrl = DEFAULT_AUTHOR_URL,
    published,
}: ArticleBylineProps) {
    const { metadata, frontMatter } = useDoc();
    // `lastUpdatedAt` is a millisecond timestamp read from `git log`.
    const updated = metadata.lastUpdatedAt
        ? isoDate(new Date(metadata.lastUpdatedAt))
        : undefined;
    const image = typeof frontMatter.image === 'string' ? frontMatter.image : undefined;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: metadata.title,
        description: metadata.description,
        ...(image ? { image: SITE_URL + image } : {}),
        author: {
            '@type': 'Person',
            name: author,
            ...(authorUrl ? { url: authorUrl } : {}),
        },
        publisher: {
            '@type': 'Organization',
            name: 'RxDB',
            logo: {
                '@type': 'ImageObject',
                url: SITE_URL + '/files/logo/logo.svg',
            },
        },
        datePublished: published,
        dateModified: updated ?? published,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': SITE_URL + metadata.permalink,
        },
    };

    return (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '0.4rem',
                margin: '0.5rem 0 1.5rem',
                fontSize: '0.9rem',
                opacity: 0.75,
            }}
        >
            <JsonLd data={jsonLd} />
            <span>
                By{' '}
                <a href={authorUrl} target="_blank" rel="noopener noreferrer author">
                    {author}
                </a>
            </span>
            <span aria-hidden="true">&middot;</span>
            <span>
                Published <time dateTime={published}>{formatDate(published)}</time>
            </span>
            {updated && updated !== published && (
                <>
                    <span aria-hidden="true">&middot;</span>
                    <span>
                        Updated <time dateTime={updated}>{formatDate(updated)}</time>
                    </span>
                </>
            )}
        </div>
    );
}

function formatDate(date: string): string {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(date + 'T00:00:00Z'));
}

function isoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export default ArticleByline;
