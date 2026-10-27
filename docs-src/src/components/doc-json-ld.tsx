import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {
    findFirstSidebarItemLink,
    useDoc,
    useDocsSidebar,
} from '@docusaurus/plugin-content-docs/client';
import type { PropSidebarItem } from '@docusaurus/plugin-content-docs';
import { JsonLd } from './json-ld';

/**
 * Returns the chain of sidebar categories that contain the page.
 * useSidebarBreadcrumbs() cannot be used because it returns null
 * when the visible breadcrumbs are disabled in the config.
 */
function findCategoryPath(items: PropSidebarItem[], permalink: string): PropSidebarItem[] | undefined {
    for (const item of items) {
        if (item.type === 'link' && item.href === permalink) {
            return [];
        }
        if (item.type === 'category') {
            if (item.href === permalink) {
                return [];
            }
            const subPath = findCategoryPath(item.items, permalink);
            if (subPath) {
                return [item, ...subPath];
            }
        }
    }
    return undefined;
}

/**
 * Pages under docs/articles/ already get BlogPosting structured data from the
 * ArticleByline, so they only need the breadcrumbs.
 */
function isArticle(source: string): boolean {
    return source.includes('/docs/articles/');
}

/**
 * Structured data for every docs page:
 * - BreadcrumbList that mirrors the sidebar hierarchy. The visible breadcrumbs
 *   are disabled, so without this markup crawlers do not see where a page
 *   belongs. Sidebar categories have no page of their own, so they link to
 *   their first item, like a click on the category in the sidebar does.
 * - TechArticle with the title, description, image and the last git
 *   modification date for all pages that are not articles.
 */
export function DocJsonLd() {
    const { metadata, frontMatter } = useDoc();
    const { siteConfig } = useDocusaurusContext();
    const sidebar = useDocsSidebar();
    const categories = sidebar ? findCategoryPath(sidebar.items, metadata.permalink) ?? [] : [];
    const pageUrl = siteConfig.url + metadata.permalink;
    const imagePath = (frontMatter as { image?: string; }).image;
    const imageUrl = useBaseUrl(imagePath ?? '', { absolute: true });

    const crumbs: { name: string; url: string; }[] = [
        { name: 'RxDB', url: siteConfig.url + '/' },
    ];
    categories.forEach(category => {
        if (category.type !== 'category') {
            return;
        }
        const href = category.href ?? findFirstSidebarItemLink(category);
        if (href) {
            crumbs.push({ name: category.label, url: siteConfig.url + href });
        }
    });
    crumbs.push({ name: metadata.title, url: pageUrl });
    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: crumb.name,
            item: crumb.url,
        })),
    };

    const lastUpdatedAt = metadata.lastUpdatedAt;
    const techArticleJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: metadata.title,
        description: metadata.description,
        url: pageUrl,
        mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
        ...(imagePath ? { image: imageUrl } : {}),
        ...(lastUpdatedAt ? { dateModified: new Date(lastUpdatedAt).toISOString().slice(0, 10) } : {}),
        inLanguage: 'en',
        about: {
            '@type': 'SoftwareApplication',
            name: 'RxDB',
            url: 'https://rxdb.info/',
        },
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
            <JsonLd data={breadcrumbJsonLd} />
            {!isArticle(metadata.source) && <JsonLd data={techArticleJsonLd} />}
        </>
    );
}
