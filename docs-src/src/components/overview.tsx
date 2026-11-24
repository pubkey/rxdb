import type { ReactNode } from 'react';
import { lastOfArray, ucfirst } from '../../../plugins/core';
import sidebars from '../../sidebars';
import { Block } from '../components/block';
import { Button } from '../components/button';
import { HeadlineWithIcon } from '../components/headline-with-icon';
import { IconCode } from '../components/icons/code';
import { IconCompression } from '../components/icons/compression';
import { IconDeviceDesktop } from '../components/icons/device-desktop';
import { IconEncryption } from '../components/icons/encryption';
import { IconGear } from '../components/icons/gear';
import { IconReplication } from '../components/icons/replication';
import { IconStorage } from '../components/icons/storage';
import { replicationLinks } from '../components/replication-links';
import { Tabs } from '../components/tabs';
import { Tag } from '../components/tag';

type OverviewLink = {
    key: string;
    title: string;
    href: string;
    target?: '_blank';
};
type OverviewCategory = {
    label: string;
    links: OverviewLink[];
};

function toLink(item: any): OverviewLink {
    if (typeof item === 'string') {
        return { key: item, title: stripDash(item), href: './' + item + '.html' };
    }
    if (item.type === 'link') {
        return { key: item.label, title: item.label, href: item.href, target: '_blank' };
    }
    return { key: item.id, title: stripDash(item.label), href: './' + item.id + '.html' };
}

function getCategories(): OverviewCategory[] {
    return (sidebars.tutorialSidebar as any[])
        .filter(item => item.type === 'category' && item.label.toLowerCase() !== 'articles')
        .map(item => ({
            label: item.label,
            links: item.items
                .flatMap(i => i.type === 'category' ? i.items : [i])
                .map(toLink)
                .filter(link => link.key !== 'overview')
        }));
}

function BlockGrid(props: { links: OverviewLink[]; }) {
    return <div className="premium-blocks" style={{ width: '100%' }}>
        {props.links.map(link => <Block
            key={link.key}
            title={link.title}
            href={link.href}
            target={link.target}
        ></Block>)}
    </div>;
}

function CategoryTabs(props: { categories: OverviewCategory[]; }) {
    return <Tabs
        items={props.categories.map(category => ({
            key: category.label,
            label: category.label,
            children: <BlockGrid links={category.links} />
        }))}
    />;
}

function StartButtons() {
    return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 50 }}>
        <Button primary href="./quickstart.html">Quickstart</Button>
        <Button href="./install.html">Installation</Button>
    </div>;
}

/**
 * Icons of the tags in the stack map, by the sidebar id of the linked page.
 * The replication icons are the same ones that the landingpage shows.
 */
const LINK_ICONS: Record<string, ReactNode> = {
    'react': '/files/icons/react.svg',
    'articles/tanstack-db/rxdb-collection-for-tanstack-db': '/files/icons/tanstack.svg',
    'encryption': <IconEncryption />,
    'key-compression': <IconCompression />,
    'rx-storage': <IconStorage />,
    'rx-storage-filesystem-node': '/files/icons/nodejs.svg',
    'rx-storage-dexie': '/files/icons/dexie.svg',
    'rx-storage-mongodb': '/files/icons/mongodb-icon.svg',
    'replication': <IconReplication />,
    'rx-server': '/files/logo/logo.svg',
    'rx-server-scaling': '/files/logo/logo.svg'
};
replicationLinks.forEach(link => {
    LINK_ICONS[link.url.replace(/^\//, '').replace(/\.html$/, '')] = link.iconUrl;
});

function StackLayer(props: {
    category: OverviewCategory;
    eyebrow: string;
    icon: ReactNode;
    variant?: 'core' | 'optional';
}) {
    return <div className={'overview-stack-layer' + (props.variant ? ' ' + props.variant : '')}>
        <div className="overview-stack-eyebrow">{props.eyebrow}</div>
        <div className="overview-stack-title">
            <HeadlineWithIcon h3 icon={props.icon}>{props.category.label}</HeadlineWithIcon>
        </div>
        <div className="overview-stack-links">
            {props.category.links.map(link => <a
                key={link.key}
                href={link.href}
                target={link.target}
            ><Tag img={LINK_ICONS[link.key]} dark={props.variant !== 'core'}>{layerLinkTitle(link.title, props.category.label)}</Tag></a>)}
        </div>
    </div>;
}

/**
 * Shortens the sidebar label so that it fits into a tag:
 * The runtime list like "(Browser, Capacitor)" is stripped and also
 * the name of the category or "Replication", so "HTTP Replication" becomes "HTTP".
 * Function names like replicateRxCollection() keep their casing.
 */
function layerLinkTitle(title: string, categoryLabel: string): string {
    if (title.endsWith('()')) {
        return title;
    }
    title = title.replace(/ \(.+\)$/, '');
    [categoryLabel, 'Replication'].forEach(suffix => {
        if (title.endsWith(' ' + suffix)) {
            title = title.slice(0, -1 * (suffix.length + 1));
        }
    });
    return ucfirst(title);
}

/**
 * Categories that are drawn as a layer of the stack map.
 * All other categories are listed in the tabs below the map.
 */
const STACK_CATEGORIES = [
    'Integrations',
    'Core Entities',
    'Storage Wrappers',
    'Storages',
    'Replication',
    'Server'
];

/**
 * Replication plugins that sync with a third party backend.
 * They are shown in the backend layer instead of the replication layer.
 */
const THIRD_PARTY_REPLICATIONS = [
    'replication-couchdb',
    'replication-firestore',
    'replication-mongodb',
    'replication-supabase',
    'replication-google-drive',
    'replication-microsoft-onedrive',
    'replication-nats',
    'replication-appwrite'
];

export function Overview() {
    const categories = getCategories();
    const byLabel = (label: string) => categories.find(category => category.label === label);
    const isThirdParty = (link: OverviewLink) => THIRD_PARTY_REPLICATIONS.includes(link.key);
    const replication: OverviewCategory = {
        label: 'Replication',
        links: byLabel('Replication').links.filter(link => !isThirdParty(link))
    };
    const server: OverviewCategory = {
        label: 'Server',
        links: byLabel('Server').links.concat(byLabel('Replication').links.filter(isThirdParty))
    };
    return <>
        <StartButtons />
        <div className="overview-stack">
            <div className="overview-stack-column">
                <StackLayer category={byLabel('Integrations')} eyebrow="Your App" icon={<IconCode />} />
                <div className="overview-stack-connector">queries and writes</div>
                <StackLayer category={byLabel('Core Entities')} eyebrow="RxDB Core" icon={<IconGear />} variant="core" />
                <div className="overview-stack-connector">optional</div>
                <StackLayer category={byLabel('Storage Wrappers')} eyebrow="Wrappers" icon={<IconEncryption />} variant="optional" />
                <div className="overview-stack-connector">reads and writes documents</div>
                <StackLayer category={byLabel('Storages')} eyebrow="On Disk" icon={<IconStorage />} />
            </div>
            <div className="overview-stack-sync"><span>sync</span></div>
            <div className="overview-stack-column">
                <StackLayer category={replication} eyebrow="Sync Engine" icon={<IconReplication />} />
                <div className="overview-stack-connector">pull, push, and event stream</div>
                <StackLayer category={server} eyebrow="Backend" icon={<IconDeviceDesktop />} />
            </div>
        </div>
        <CategoryTabs categories={categories.filter(category => !STACK_CATEGORIES.includes(category.label))} />
    </>;
}


function stripDash(str: string): string {
    const split = str.split('/');
    return lastOfArray(split);
}
