import React from 'react';
import Head from '@docusaurus/Head';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import { JsonLd } from './json-ld';

/**
 * The author of the articles under docs/articles/.
 * Used for the visible byline and for the schema.org Person in the JSON-LD.
 */
export const ARTICLE_AUTHOR = {
    name: 'Daniel Meyer',
    jobTitle: 'Creator of RxDB',
    url: 'https://www.linkedin.com/in/danielmeyerdev',
    image: 'https://rxdb.info/files/authors/daniel-meyer.jpg',
    avatar: '/files/authors/daniel-meyer.jpg',
    sameAs: [
        'https://github.com/pubkey',
        'https://www.linkedin.com/in/danielmeyerdev',
    ],
} as const;

type ArticleBylineProps = {
    /**
     * ISO day of the commit that added the article, set by src/remark/article-byline.ts.
     */
    published?: string;
    /**
     * ISO day of the last commit that changed the article.
     */
    modified?: string;
    readingMinutes?: string;
    wordCount?: string;
};

/**
 * Formats in UTC so server render and hydration produce the same string.
 */
function formatDay(isoDay: string): string {
    return new Date(isoDay + 'T00:00:00Z').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

/**
 * Renders an article like a blog post: author byline with publish and update
 * dates plus the BlogPosting structured data and the article meta tags.
 * Inserted automatically below the H1 of every page in docs/articles/.
 */
export function ArticleByline(props: ArticleBylineProps) {
    const { metadata, frontMatter } = useDoc();
    const { siteConfig } = useDocusaurusContext();
    const pageUrl = siteConfig.url + metadata.permalink;
    const imagePath = (frontMatter as { image?: string; }).image;
    const imageUrl = useBaseUrl(imagePath ?? '', { absolute: true });

    const published = props.published;
    const modified = props.modified ?? published;
    const showUpdated = !!modified && modified !== published;

    const authorJsonLd = {
        '@type': 'Person',
        name: ARTICLE_AUTHOR.name,
        jobTitle: ARTICLE_AUTHOR.jobTitle,
        url: ARTICLE_AUTHOR.url,
        image: ARTICLE_AUTHOR.image,
        sameAs: ARTICLE_AUTHOR.sameAs,
    };
    const blogPostingJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: metadata.title,
        description: metadata.description,
        url: pageUrl,
        mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
        ...(imagePath ? { image: imageUrl } : {}),
        ...(published ? { datePublished: published } : {}),
        ...(modified ? { dateModified: modified } : {}),
        ...(props.wordCount ? { wordCount: parseInt(props.wordCount, 10) } : {}),
        inLanguage: 'en',
        author: authorJsonLd,
        publisher: {
            '@type': 'Organization',
            name: 'RxDB',
            url: 'https://rxdb.info',
            logo: {
                '@type': 'ImageObject',
                url: 'https://rxdb.info/files/logo/logo.svg',
            },
        },
    };

    return (
        <>
            <Head>
                <meta property="og:type" content="article" />
                <meta name="author" content={ARTICLE_AUTHOR.name} />
                <meta property="article:author" content={ARTICLE_AUTHOR.url} />
                {published && <meta property="article:published_time" content={published} />}
                {modified && <meta property="article:modified_time" content={modified} />}
            </Head>
            <JsonLd data={blogPostingJsonLd} />
            <div className="article-byline">
                <img
                    className="article-byline-avatar"
                    src={ARTICLE_AUTHOR.avatar}
                    alt={ARTICLE_AUTHOR.name}
                    width={44}
                    height={44}
                    loading="lazy"
                />
                <div className="article-byline-text">
                    <div className="article-byline-author">
                        <a href={ARTICLE_AUTHOR.url} rel="author" target="_blank">{ARTICLE_AUTHOR.name}</a>
                        <span className="article-byline-role">{ARTICLE_AUTHOR.jobTitle}</span>
                    </div>
                    <div className="article-byline-meta">
                        {published && (
                            <span>Published <time dateTime={published}>{formatDay(published)}</time></span>
                        )}
                        {showUpdated && (
                            <span>Updated <time dateTime={modified}>{formatDay(modified)}</time></span>
                        )}
                        {props.readingMinutes && (
                            <span>{props.readingMinutes} min read</span>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default ArticleByline;
