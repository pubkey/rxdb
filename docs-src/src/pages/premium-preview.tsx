import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import React from 'react';
import { useLocation } from '@docusaurus/router';
import { NON_PREMIUM_COLLECTION_LIMIT, PRICE_CORPORATE_YEARLY, PRICE_PRO_MONTHLY, PRICE_PRO_PLUS_MONTHLY } from '../constants';
import { Button } from '../components/button';
import { IconChevronsRight } from '../components/icons/chevrons-right';
import { IconCheck } from '../components/icons/check';
import { Faq, FaqItem } from '../components/faq';
import { CheckedList } from '../components/checked-list';
import { PartnerTrophy, SOCIAL_PROOF_VALUES, Trophy } from '../components/trophy';
import { ReviewsBlock } from '../components/review-block';
import { PERFORMANCE_BROWSER_DEXIE, PERFORMANCE_BROWSER_INDEXEDDB, PERFORMANCE_OPFS_WORKER } from '../components/performance-data';
import '../css/premium-preview.css';

type Tier = {
    id: string;
    note: string;
    name: string;
    desc: string;
    prefix?: string;
    price: number;
    per: string;
    sub?: string;
    features: React.ReactNode[];
    missing?: string[];
    cta: string;
    href?: string;
    recommended?: boolean;
};

const TIERS: Tier[] = [
    {
        id: 'free', note: '// no signup, no key', name: 'Free', desc: 'Open-source core. Get started for free.',
        price: 0, per: 'forever', sub: 'Apache 2.0 license',
        features: [
            'RxDB core (schemas, queries, hooks)',
            'Replication & realtime sync',
            'Default RxStorage (Dexie, Memory, LokiJS)',
            'Schema validation & migration',
            <>Up to <a href="/rx-collection.html#faq">{NON_PREMIUM_COLLECTION_LIMIT} open collections</a> in parallel</>,
            'Community support on GitHub & Discord',
        ],
        missing: ['Premium storages (OPFS, SQLite, Filesystem)', 'Performance plugins (Sharding, Memory Mapped)'],
        cta: 'Get started', href: '/quickstart.html'
    },
    {
        id: 'pro', note: '// most teams start here', name: 'Pro', desc: 'Production-grade storage engines.',
        prefix: 'From', price: PRICE_PRO_MONTHLY, per: 'month', sub: 'billed annually, unlimited developers',
        features: [
            'Everything in Free',
            <><a href="/rx-storage-opfs.html">RxStorage OPFS</a> - newest browser storage</>,
            <><a href="/rx-storage-indexeddb.html">RxStorage IndexedDB</a> - most reliable browser storage</>,
            <><a href="/rx-storage-sqlite.html">RxStorage SQLite</a> - Electron, React-Native, Capacitor</>,
            <><a href="/rx-storage-filesystem-node.html">RxStorage Filesystem</a> (Node + Expo)</>,
            <a href="/encryption.html">WebCrypto Encryption</a>,
            <a href="/fulltext-search.html">Fulltext Search</a>,
        ],
        cta: 'Get Pro', recommended: true
    },
    {
        id: 'proplus', note: '// for high-throughput apps', name: 'Pro Plus', desc: 'Performance plugins & server adapters.',
        prefix: 'From', price: PRICE_PRO_PLUS_MONTHLY, per: 'month', sub: 'billed annually, unlimited developers',
        features: [
            'Everything in Pro',
            <><a href="/rx-storage-worker.html">RxStorage Worker</a> - main-thread offload</>,
            <a href="/rx-storage-shared-worker.html">RxStorage Shared Worker</a>,
            <a href="/rx-storage-sharding.html">RxStorage Sharding</a>,
            <a href="/rx-storage-memory-mapped.html">RxStorage Memory-Mapped</a>,
            <a href="/rx-storage-localstorage-meta-optimizer.html">Localstorage Meta Optimizer</a>,
            <a href="/query-optimizer.html">Query Optimizer</a>,
            <a href="/rx-server.html">RxServer adapters: Fastify, Koa</a>,
            <><a href="/logger.html">Logger plugin</a> (Compatible with Sentry)</>,
        ],
        cta: 'Get Pro Plus'
    },
    {
        id: 'corporate', note: '// consulting included', name: 'Corporate', desc: 'Pro Plus with consulting sessions.',
        price: PRICE_CORPORATE_YEARLY, per: 'year', sub: 'unlimited developers',
        features: [
            'Everything in Pro Plus',
            <a href="/consulting/">Consulting sessions</a>,
            'Architecture review & onboarding',
            'Named engineer',
            'Source code access',
            'Private support channel',
            'Code review of your RxDB integration',
            'Migration help',
            'Priority bug fixes & feature requests',
        ],
        cta: 'Get Corporate'
    }
];

function TierCards({ compact }: { compact?: boolean; }) {
    return <div className="pricing-tiers">
        {TIERS.map(t => <div key={t.id} className={'pricing-tier' + (t.recommended ? ' pro-tier' : '') + (compact ? ' compact' : '')}>
            <div className="tier-top">
                <span className="tier-note">{t.note}</span>
                {t.recommended ? <div className="badge-recommended">RECOMMENDED</div> : null}
                <h3>{t.name}</h3>
                <p className="tier-desc">{t.desc}</p>
                <span className="tier-price-prefix">{t.prefix ? t.prefix : <>&nbsp;</>}</span>
                <div className="tier-price">${t.price}<span>/ {t.per}</span></div>
                <div className="tier-price-sub">{t.sub}</div>
            </div>
            <div className="tier-cta">
                <Button primary={t.recommended} href={t.href ? t.href : '#'} style={{ width: '100%' }} icon={<IconChevronsRight />}>{t.cta}</Button>
            </div>
            {compact ? null : <>
                <div className="tier-includes-title">INCLUDES</div>
                <ul className="tier-features">
                    {t.features.map((f, i) => <li key={i}>{f}</li>)}
                    {(t.missing || []).map((f, i) => <li key={'m' + i} className="strikethrough">{f}</li>)}
                </ul>
            </>}
        </div>)}
    </div>;
}

const BENCH = [
    { title: 'Insert 500 documents (bulk)', key: 'insert-documents-500' },
    { title: 'Find 3000 documents by query', key: 'find-by-query' },
] as const;
const BENCH_STORAGES = [
    { label: 'Dexie.js (free)', data: PERFORMANCE_BROWSER_DEXIE, premium: false },
    { label: 'IndexedDB (Pro)', data: PERFORMANCE_BROWSER_INDEXEDDB, premium: true },
    { label: 'OPFS (Pro)', data: PERFORMANCE_OPFS_WORKER, premium: true },
];

function Bench() {
    return <div className="bench">
        <div className="bench-title">Browser storage performance</div>
        <div className="bench-sub">time in milliseconds (lower is better)</div>
        {BENCH.map(b => {
            const max = Math.max(...BENCH_STORAGES.map(s => s.data[b.key]));
            return <div key={b.key}>
                <div className="bench-group">{b.title}</div>
                {BENCH_STORAGES.map(s => <div key={s.label} className={'bench-row' + (s.premium ? ' premium' : '')}>
                    <span className="label">{s.label}</span>
                    <span><div className="bar" style={{ width: Math.max(2, (s.data[b.key] / max) * 100) + '%' }} /></span>
                    <span className="ms">{s.data[b.key]} ms</span>
                </div>)}
            </div>;
        })}
        <div className="bench-foot"><a href="/rx-storage-performance.html">See all storage benchmarks</a></div>
    </div>;
}

const Y = <span className="yes">✓</span>;
const N = <span className="no">-</span>;
const MATRIX: ([string] | [React.ReactNode, React.ReactNode, React.ReactNode, React.ReactNode, React.ReactNode])[] = [
    ['Core'],
    ['RxDB core, replication, schema migration', Y, Y, Y, Y],
    ['Open collections in parallel', String(NON_PREMIUM_COLLECTION_LIMIT), 'unlimited', 'unlimited', 'unlimited'],
    ['Storages'],
    ['Dexie, Memory, localStorage', Y, Y, Y, Y],
    [<a href="/rx-storage-opfs.html">OPFS</a>, N, Y, Y, Y],
    [<a href="/rx-storage-indexeddb.html">IndexedDB</a>, N, Y, Y, Y],
    [<a href="/rx-storage-sqlite.html">SQLite</a>, N, Y, Y, Y],
    [<a href="/rx-storage-filesystem-node.html">Filesystem (Node + Expo)</a>, N, Y, Y, Y],
    ['Security & Search'],
    [<a href="/encryption.html">WebCrypto Encryption</a>, N, Y, Y, Y],
    [<a href="/fulltext-search.html">Fulltext Search</a>, N, Y, Y, Y],
    ['Performance'],
    [<a href="/rx-storage-worker.html">Worker & SharedWorker</a>, N, N, Y, Y],
    [<a href="/rx-storage-sharding.html">Sharding</a>, N, N, Y, Y],
    [<a href="/rx-storage-memory-mapped.html">Memory-Mapped</a>, N, N, Y, Y],
    [<a href="/query-optimizer.html">Query Optimizer</a>, N, N, Y, Y],
    [<a href="/rx-server.html">RxServer adapters: Fastify, Koa</a>, N, N, Y, Y],
    [<a href="/logger.html">Logger plugin</a>, N, N, Y, Y],
    ['Support'],
    ['Community support (GitHub, Discord)', Y, Y, Y, Y],
    [<a href="/consulting/">Consulting sessions</a>, N, N, N, Y],
    ['Private support channel, named engineer', N, N, N, Y],
    ['Source code access', N, N, N, Y],
    ['Priority bug fixes & feature requests', N, N, N, Y],
];

function Matrix() {
    return <div className="matrix-wrap">
        <table className="matrix">
            <thead>
                <tr><th></th><th>Free</th><th className="hl">Pro</th><th>Pro Plus</th><th>Corporate</th></tr>
            </thead>
            <tbody>
                {MATRIX.map((row, i) => row.length === 1
                    ? <tr key={i} className="group"><td colSpan={5}>{row[0]}</td></tr>
                    : <tr key={i}>{row.map((c, j) => <td key={j} className={j === 2 ? 'hl' : ''}>{c}</td>)}</tr>)}
            </tbody>
        </table>
    </div>;
}

function FaqBlock({ dark }: { dark?: boolean; }) {
    return <div className={'block trophy-before' + (dark ? ' dark' : '')} id="faq">
        <div className="content centered premium-faq">
            <h2>Frequently Asked <b>Questions</b></h2>
            <Faq>
                <FaqItem question="What is the process for making a purchase?">
                    <ul>
                        <li>Fill out the form by clicking one of the buttons above.</li>
                        <li>You will receive a license agreement to sign via email.</li>
                        <li>You will receive an invoice to pay.</li>
                        <li>You will receive an access token to add the Premium plugins to your project.</li>
                    </ul>
                </FaqItem>
                <FaqItem question="Can I get a free trial period?">We do not currently offer a free trial.</FaqItem>
                <FaqItem question="Can I install/build the premium plugins in my CI?">Yes.</FaqItem>
                <FaqItem question="Which payment methods are accepted?">Stripe.</FaqItem>
                <FaqItem question="Is there any tracking code inside of the premium plugins?">No.</FaqItem>
                <FaqItem question="Can I upgrade to a higher tier later?">Yes.</FaqItem>
                <FaqItem question="Can I get a discount?">...</FaqItem>
                <FaqItem question="Why do I have to pay taxes?">...</FaqItem>
            </Faq>
        </div>
    </div>;
}

function ReviewsSection({ dark }: { dark?: boolean; }) {
    return <div className={'block reviews trophy-before trophy-after' + (dark ? ' dark' : '')}>
        <div className="content centered">
            <h2>Used by <b>Thousands Worldwide</b></h2>
            <div className="inner"><ReviewsBlock /></div>
        </div>
    </div>;
}

function Closing({ dark }: { dark?: boolean; }) {
    return <div className={'block closing trophy-before' + (dark ? ' dark' : '')} style={{ paddingBottom: 90 }}>
        <div className="content centered">
            <h2>Ship faster with <b>RxDB Premium</b></h2>
            <div className="closing-buttons">
                <Button primary href="#pricing" icon={<IconChevronsRight />}>Get Pro</Button>
                <Button href="/consulting/">Talk to the Maintainer</Button>
                <Button href="/rx-storage-performance.html">Compare Performance</Button>
            </div>
        </div>
    </div>;
}

const github = <Trophy href="/code/" title="GitHub" subTitle='Open Source' value={SOCIAL_PROOF_VALUES.github} icon="/files/icons/github-star-with-logo.svg" valueTitle='stars' />;
const discord = <Trophy href="/chat/" title="Discord" subTitle='Chat on' value={SOCIAL_PROOF_VALUES.discord} icon="/files/icons/discord.svg" valueTitle='members' black={true} />;
const mongodb = <PartnerTrophy href="https://www.mongodb.com/company/blog/innovation/from-local-global-scalable-edge-apps-rxdb" title="MongoDB" imgUrl="/files/icons/mongodb-icon.svg" />;
const supabase = <PartnerTrophy href="https://supabase.com/partners/integrations/rxdb" title="Supabase" imgUrl="/files/icons/supabase.svg" />;

const LEAD = <>The core of RxDB is free and open-source. The <b>Premium plugins</b> add <a href="/rx-storage-performance.html">faster storages</a>, a smaller build size, and secure encryption for production workloads.</>;

function VariantA() {
    return <>
        <div className="block first hero dark" id="pricing" style={{ paddingBottom: 90 }}>
            <div className="content centered">
                <h1 style={{ textAlign: 'center' }}>RxDB for <b>Professionals</b></h1>
                <p className="hero-lead">{LEAD}</p>
                <TierCards />
            </div>
        </div>
        {github}
        <FaqBlock />
    </>;
}

function VariantB() {
    return <>
        <div className="block first hero dark" style={{ paddingBottom: 90 }}>
            <div className="content">
                <h1 style={{ textAlign: 'center' }}>RxDB for <b>Professionals</b></h1>
                <div className="inner">
                    <div className="half left">
                        <p style={{ marginTop: 0, marginBottom: 0 }} className='centered-mobile-p'>{LEAD}</p>
                        <CheckedList className='centered-mobile padding-right-20-0' style={{ paddingTop: 35, paddingLeft: 0, paddingBottom: 0, maxWidth: 400 }}>
                            <>Faster <b>Storages</b> for every runtime</>
                            <>Smaller <b>build size</b></>
                            <>WebCrypto <b>Encryption</b></>
                            <>Unlimited <b>developers</b> per license</>
                        </CheckedList>
                        <div style={{ marginTop: 44, display: 'flex', flexWrap: 'wrap', gap: 10, maxWidth: 500 }} className='hero-action-buttons centered-smaller-mobile'>
                            <Button className="hero-action" href="/rx-storage-performance.html">Compare Performance</Button>
                            <Button primary className="hero-action" href="#pricing">See Pricing</Button>
                        </div>
                    </div>
                    <div className="half right justify-center-mobile" style={{ display: 'flex', alignItems: 'center' }}>
                        <Bench />
                    </div>
                </div>
            </div>
        </div>
        {github}
        <div className="block trophy-before trophy-after" id="pricing">
            <div className="content centered">
                <h2>Pick your <b>Plan</b></h2>
                <TierCards />
            </div>
        </div>
        {mongodb}
        <ReviewsSection dark />
        {discord}
        <FaqBlock />
        {supabase}
        <Closing dark />
    </>;
}

function VariantC() {
    return <>
        <div className="block first hero dark" id="pricing" style={{ paddingBottom: 90 }}>
            <div className="content centered">
                <h1 style={{ textAlign: 'center' }}>RxDB for <b>Professionals</b></h1>
                <p className="hero-lead">{LEAD}</p>
                <div className="hero-facts">
                    <span><IconCheck style={{ width: 22 }} />Unlimited <b>developers</b></span>
                    <span><IconCheck style={{ width: 22 }} />No <b>tracking</b> code</span>
                    <span><IconCheck style={{ width: 22 }} />Free in <b>CI</b></span>
                </div>
                <TierCards compact />
            </div>
        </div>
        {github}
        <div className="block trophy-before trophy-after">
            <div className="content centered">
                <h2>Compare all <b>Features</b></h2>
                <Matrix />
            </div>
        </div>
        {mongodb}
        <ReviewsSection dark />
        {discord}
        <FaqBlock />
        {supabase}
        <Closing dark />
    </>;
}

export default function PremiumPreview() {
    const v = new URLSearchParams(useLocation().search).get('v') || 'a';
    return <>
        <Head><body className="homepage" /></Head>
        <Layout title="RxDB for Professionals">
            <main className="pv2">
                {v === 'a' ? <VariantA /> : v === 'b' ? <VariantB /> : <VariantC />}
            </main>
        </Layout>
    </>;
}
