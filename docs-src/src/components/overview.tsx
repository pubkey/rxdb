import type { ReactNode } from 'react';
import { lastOfArray, ucfirst } from '../../../plugins/core';
import sidebars from '../../sidebars';
import { Block } from '../components/block';
import { Button } from '../components/button';
import { HeadlineWithIcon } from '../components/headline-with-icon';
import { IconCode } from '../components/icons/code';
import { IconDeviceDesktop } from '../components/icons/device-desktop';
import { IconEncryption } from '../components/icons/encryption';
import { IconGear } from '../components/icons/gear';
import { IconReplication } from '../components/icons/replication';
import { IconStorage } from '../components/icons/storage';
import { Tabs } from '../components/tabs';

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
            >{layerLinkTitle(link.title)}</a>)}
        </div>
    </div>;
}

/**
 * Strips the runtime list like "(Browser, Capacitor)" from the sidebar label.
 * Function names like replicateRxCollection() keep their casing.
 */
function layerLinkTitle(title: string): string {
    if (title.endsWith('()')) {
        return title;
    }
    return ucfirst(title.replace(/ \(.+\)$/, ''));
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

export function Overview() {
    const categories = getCategories();
    const byLabel = (label: string) => categories.find(category => category.label === label);
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
                <StackLayer category={byLabel('Replication')} eyebrow="Sync Engine" icon={<IconReplication />} />
                <div className="overview-stack-connector">pull, push, and event stream</div>
                <StackLayer category={byLabel('Server')} eyebrow="Backend" icon={<IconDeviceDesktop />} />
            </div>
        </div>
        <CategoryTabs categories={categories.filter(category => !STACK_CATEGORIES.includes(category.label))} />
    </>;
}


function stripDash(str: string): string {
    const split = str.split('/');
    return lastOfArray(split);
}
