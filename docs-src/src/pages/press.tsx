import Head from '@docusaurus/Head';
import Layout from '@theme/Layout';
import React, { useState } from 'react';
import { CITATIONS, CITATION_TYPE_LABELS, type CitationType } from '../components/press-data';
import { JsonLd } from '../components/json-ld';

const NEW_ISSUE_URL = 'https://github.com/pubkey/rxdb/issues/new';

const styles = {
    filters: { display: 'flex', flexWrap: 'wrap', gap: 8, margin: '16px 0 24px 0' },
    list: { listStyle: 'none', padding: 0 },
    item: {
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        padding: '16px 0',
    },
    meta: { fontSize: '0.85rem', color: 'var(--expo-theme-text-secondary, #b0b0b0)' },
    tag: {
        display: 'inline-block',
        fontSize: '0.75rem',
        padding: '2px 8px',
        borderRadius: 4,
        border: '1px solid var(--color-top)',
        marginRight: 8,
    },
    form: { display: 'grid', gap: 12, maxWidth: 640 },
    input: {
        width: '100%',
        padding: 8,
        borderRadius: 4,
        border: '1px solid rgba(255, 255, 255, 0.3)',
        background: 'rgba(255, 255, 255, 0.06)',
        color: 'var(--fontColor-offwhite)',
        fontSize: '1rem',
    },
} as const;

function FilterButton(props: { active: boolean; onClick: () => void; children: React.ReactNode; }) {
    return (
        <button
            type="button"
            onClick={props.onClick}
            className={'button' + (props.active ? '' : ' light')}
            style={{
                cursor: 'pointer',
                padding: '4px 12px',
                borderRadius: 4,
                border: '1px solid var(--color-top)',
                background: props.active ? 'var(--color-top)' : 'transparent',
                color: 'var(--fontColor-offwhite)',
            }}
        >
            {props.children}
        </button>
    );
}

function SubmitSourceForm() {
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [type, setType] = useState<CitationType>('article');
    const [source, setSource] = useState('');
    const [date, setDate] = useState('');
    const [context, setContext] = useState('');

    function onSubmit(event: React.FormEvent) {
        event.preventDefault();
        const body = [
            'A publication that cites or mentions RxDB, for the list at https://rxdb.info/press/',
            '',
            '- **Title**: ' + title,
            '- **URL**: ' + url,
            '- **Type**: ' + CITATION_TYPE_LABELS[type],
            '- **Author / Publisher**: ' + source,
            '- **Date**: ' + date,
            '',
            '**How RxDB is mentioned:**',
            '',
            context,
        ].join('\n');
        const issueUrl = NEW_ISSUE_URL +
            '?title=' + encodeURIComponent('[Press] ' + title) +
            '&body=' + encodeURIComponent(body);
        window.open(issueUrl, '_blank', 'noopener');
    }

    return (
        <form onSubmit={onSubmit} style={styles.form}>
            <label>
                Title of the publication *
                <input style={styles.input} required value={title} onChange={e => setTitle(e.target.value)} />
            </label>
            <label>
                URL *
                <input style={styles.input} type="url" required placeholder="https:// (for example a YouTube link)" value={url} onChange={e => setUrl(e.target.value)} />
            </label>
            <label>
                Type
                <select style={styles.input} value={type} onChange={e => setType(e.target.value as CitationType)}>
                    {(Object.keys(CITATION_TYPE_LABELS) as CitationType[]).map(key => (
                        <option key={key} value={key}>{CITATION_TYPE_LABELS[key]}</option>
                    ))}
                </select>
            </label>
            <label>
                Author, publisher, journal or conference *
                <input style={styles.input} required value={source} onChange={e => setSource(e.target.value)} />
            </label>
            <label>
                Publication date
                <input style={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
            </label>
            <label>
                How is RxDB mentioned or used? *
                <textarea style={{ ...styles.input, minHeight: 100 }} required value={context} onChange={e => setContext(e.target.value)} />
            </label>
            <div>
                <button type="submit" className="button" style={{ cursor: 'pointer' }}>
                    Submit via GitHub
                </button>
            </div>
            <p style={styles.meta}>
                Submitting opens a prefilled GitHub issue in a new tab, which you then have to confirm.
                Every submission is reviewed before it is added to the list.
            </p>
        </form>
    );
}

export default function PressPage() {
    const [filter, setFilter] = useState<CitationType | 'all'>('all');
    const [search, setSearch] = useState('');
    const usedTypes = (Object.keys(CITATION_TYPE_LABELS) as CitationType[])
        .filter(type => CITATIONS.some(citation => citation.type === type));
    const searchTerm = search.trim().toLowerCase();
    const shown = CITATIONS
        .filter(citation => filter === 'all' || citation.type === filter)
        .filter(citation => !searchTerm || [citation.title, citation.source, citation.summary]
            .some(text => text.toLowerCase().includes(searchTerm)));
    const years = Array.from(new Set(shown.map(citation => citation.date.slice(0, 4))));

    const itemListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'RxDB in the Press',
        itemListElement: CITATIONS.map((citation, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
                '@type': citation.type === 'paper' || citation.type === 'thesis' ? 'ScholarlyArticle' : 'CreativeWork',
                name: citation.title,
                url: citation.url,
                datePublished: citation.date,
                publisher: citation.source,
                about: { '@type': 'SoftwareApplication', name: 'RxDB', url: 'https://rxdb.info/' },
            },
        })),
    };

    return (
        <>
            <Head>
                <body className="homepage" />
            </Head>
            <Layout
                title="RxDB in the Press - Articles, Papers, Books, Talks, and Videos"
                description="RxDB in the Press is a curated collection of news articles, research papers, theses, books, talks, and videos that cite or mention RxDB."
            >
                <JsonLd data={itemListJsonLd} />
                <main>
                    <div className="block first">
                        <div className="content">
                            <h1>RxDB in the Press</h1>
                            <p>
                                <b>RxDB in the Press</b> is a curated collection of news articles, research papers, theses, books,
                                talks, and videos that cite or mention <a href="/">RxDB</a>. Every entry is written
                                by a third party and links to the original source. The list currently has <b>{CITATIONS.length}</b> entries.
                                If you know a publication that is missing, <a href="#submit">submit it with the form below</a>.
                            </p>
                        </div>
                    </div>

                    <div className="block dark">
                        <div className="content">
                            <input
                                style={{ ...styles.input, maxWidth: 640 }}
                                type="search"
                                placeholder="Search by title, author, or publisher"
                                aria-label="Search press mentions of RxDB"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            <div style={styles.filters}>
                                <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
                                    All ({CITATIONS.length})
                                </FilterButton>
                                {usedTypes.map(type => (
                                    <FilterButton key={type} active={filter === type} onClick={() => setFilter(type)}>
                                        {CITATION_TYPE_LABELS[type]} ({CITATIONS.filter(c => c.type === type).length})
                                    </FilterButton>
                                ))}
                            </div>

                            {shown.length === 0 && <p>No entries match your search.</p>}
                            {years.map(year => (
                                <section key={year}>
                                    <h2>{year}</h2>
                                    <ul style={styles.list}>
                                        {shown.filter(citation => citation.date.startsWith(year)).map(citation => (
                                            <li key={citation.url} style={styles.item}>
                                                <div style={styles.meta}>
                                                    <span style={styles.tag}>{CITATION_TYPE_LABELS[citation.type]}</span>
                                                    {citation.source} · <time dateTime={citation.date}>{citation.date}</time>
                                                </div>
                                                <h3 style={{ margin: '8px 0' }}>
                                                    <a href={citation.url} target="_blank" rel="noopener">{citation.title}</a>
                                                </h3>
                                                <p style={{ margin: 0 }}>{citation.summary}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>
                    </div>

                    <div className="block" id="submit">
                        <div className="content">
                            <h2>Submit a Publication</h2>
                            <p>
                                When you wrote or found an article, paper, thesis, book, talk, video, or podcast that mentions RxDB,
                                fill out the form so it can be reviewed and added to the list.
                                If you want to show the RxDB logo in your publication, read the <a href="/brand-guidelines/">RxDB brand guidelines</a>.
                            </p>
                            <SubmitSourceForm />
                        </div>
                    </div>
                </main>
            </Layout>
        </>
    );
}
