import React, { type ReactNode } from 'react';
import Head from '@docusaurus/Head';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import type { PageMetadata as PageMetadataOriginal } from '@docusaurus/theme-common';

/**
 * Docusaurus has no `@theme/PageMetadata` component,
 * the props are defined at the PageMetadata of the theme-common package.
 */
type Props = Parameters<typeof PageMetadataOriginal>[0];

/**
 * Swizzled version of the default Docusaurus PageMetadata.
 *
 * The only difference to the original is the page title:
 * Docusaurus appends the site title (`| RxDB - JavaScript Database`)
 * to every page title. This removes that suffix so the SEO title
 * is just the page title itself.
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
                    content={typeof keywords === 'string' ? keywords : keywords.join(',')}
                />
            )}

            {image && <meta property="og:image" content={pageImage} />}
            {image && <meta name="twitter:image" content={pageImage} />}

            {children}
        </Head>
    );
}
