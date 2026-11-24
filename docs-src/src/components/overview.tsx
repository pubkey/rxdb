import { lastOfArray } from '../../../plugins/core';
import sidebars from '../../sidebars';
import { Block } from '../components/block';
import { Button } from '../components/button';
import { Steps } from '../components/steps';
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
    return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 60 }}>
        <Button primary href="./quickstart.html">Quickstart</Button>
        <Button href="./rx-storage.html">Pick a Storage</Button>
        <Button href="./replication.html">Sync your Data</Button>
    </div>;
}

/**
 * Variant A: three start buttons, then one tab per category.
 */
export function OverviewTabs() {
    return <>
        <StartButtons />
        <CategoryTabs categories={getCategories()} />
    </>;
}

/**
 * Variant B: one block per category that links to the first page of it.
 */
export function OverviewCategories() {
    return <>
        <StartButtons />
        <BlockGrid links={getCategories().map(category => ({
            key: category.label,
            title: category.label,
            href: category.links[0].href,
            target: category.links[0].target
        }))} />
    </>;
}

/**
 * Variant C: the first steps as a numbered path, then one tab per category.
 */
export function OverviewSteps() {
    const stepButton = (href: string, text: string) => <p><Button href={href}>{text}</Button></p>;
    return <>
        <Steps name="Get started with RxDB">
            <h3 id="overview-step-install">Install RxDB</h3>
            {stepButton('./install.html', 'Installation')}
            <h3 id="overview-step-quickstart">Create a Database</h3>
            {stepButton('./quickstart.html', 'Quickstart')}
            <h3 id="overview-step-storage">Pick a Storage</h3>
            {stepButton('./rx-storage.html', 'Storages')}
            <h3 id="overview-step-sync">Sync your Data</h3>
            {stepButton('./replication.html', 'Sync Engine')}
        </Steps>
        <br />
        <br />
        <CategoryTabs categories={getCategories().slice(1)} />
    </>;
}

export function Overview() {
    const variant = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('v');
    if (variant === 'b') {
        return <OverviewCategories />;
    }
    if (variant === 'c') {
        return <OverviewSteps />;
    }
    return <OverviewTabs />;
}


function stripDash(str: string): string {
    const split = str.split('/');
    return lastOfArray(split);
}
