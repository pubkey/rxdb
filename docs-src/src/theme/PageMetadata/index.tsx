import React, { type ReactNode } from 'react';
import Head from '@docusaurus/Head';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import type { Props } from '@theme/PageMetadata';

/**
 * Swizzled version of the default Docusaurus PageMetadata.
 *
 * The only difference to the original is the page title: this renders the raw
 * page title instead of running it through `useTitleFormatter`.
 *
 * NOTE: this does NOT remove the ` | <site title>` suffix from rendered pages,
 * even though it skips the formatter. Docs and plugin pages import
 * `PageMetadata` from `@docusaurus/theme-common` directly rather than through
 * `@theme/PageMetadata`, so they never reach this component and the suffix is
 * still appended. Verified 2026-07-30: every page on the live site ends with
 * the site title. The suffix is controlled by `title` in docusaurus.config.ts,
 * which is the only global lever for it.
 * @link https://github.com/pubkey/rxdb
 */
export default function PageMetadata({
    title,
    description,
    keywords,
    image,
    children,
}: Props): ReactNode {
    const { siteConfig } = useDocusaurusContext();
    // Use the raw page title without the appended site title suffix.
    // Fall back to the site title for pages that do not set a title.
    const pageTitle = title && title.trim().length > 0 ? title.trim() : siteConfig.title;
    const pageImage = useBaseUrl(image, { absolute: true });

    return (
        <Head>
            {pageTitle && <title>{pageTitle}</title>}
            {pageTitle && <meta property="og:title" content={pageTitle} />}

            {description && <meta name="description" content={description} />}
            {description && <meta property="og:description" content={description} />}

            {keywords && (
                <meta
                    name="keywords"
                    content={Array.isArray(keywords) ? keywords.join(',') : keywords}
                />
            )}

            {image && <meta property="og:image" content={pageImage} />}
            {image && <meta name="twitter:image" content={pageImage} />}

            {children}
        </Head>
    );
}
