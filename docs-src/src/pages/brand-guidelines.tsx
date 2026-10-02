import Head from '@docusaurus/Head';
import Layout from '@theme/Layout';
import React from 'react';

type LogoAsset = {
    title: string;
    file: string;
    usage: string;
    width: number;
    height: number;
    formats: { label: string; href: string; }[];
    background: 'dark' | 'light';
};

const LOGOS: LogoAsset[] = [
    {
        title: 'Logo with Wordmark',
        file: '/files/logo/logo_text_white.svg',
        usage: 'The default logo. Use it on dark backgrounds, for example in headers, slides, and footers.',
        width: 394,
        height: 140,
        formats: [
            { label: 'SVG', href: '/files/logo/logo_text_white.svg' },
            { label: 'PNG', href: '/files/logo/png/logo_text_white.png' },
        ],
        background: 'dark',
    },
    {
        title: 'Logo with Wordmark (Outlined)',
        file: '/files/logo/logo_text.svg',
        usage: 'Use it on light or colored backgrounds where the white wordmark would not be readable.',
        width: 226,
        height: 140,
        formats: [
            { label: 'SVG', href: '/files/logo/logo_text.svg' },
            { label: 'PNG', href: '/files/logo/png/logo_text.png' },
        ],
        background: 'light',
    },
    {
        title: 'Icon',
        file: '/files/logo/logo.svg',
        usage: 'Use it where space is limited, for example as an avatar, favicon, app icon, or in a list of technologies.',
        width: 103,
        height: 140,
        formats: [
            { label: 'SVG', href: '/files/logo/logo.svg' },
            { label: 'PNG', href: '/files/logo/png/logo.png' },
            { label: 'ICO', href: '/files/logo/icon.ico' },
        ],
        background: 'dark',
    },
    {
        title: 'Logo with Claim',
        file: '/files/logo/rxdb_javascript_database.svg',
        usage: 'Use it when your readers do not know RxDB yet, for example in articles, talks, and comparison tables.',
        width: 282,
        height: 140,
        formats: [
            { label: 'SVG', href: '/files/logo/rxdb_javascript_database.svg' },
            { label: 'PNG', href: '/files/logo/png/rxdb_javascript_database.png' },
        ],
        background: 'dark',
    },
];

const COLORS = [
    { name: 'RxDB Pink', hex: '#ED168F' },
    { name: 'RxDB Magenta', hex: '#B2218B' },
    { name: 'RxDB Purple', hex: '#752A8A' },
    { name: 'Background Dark', hex: '#0D0F18' },
    { name: 'White', hex: '#FFFFFF' },
];

const ALLOWED = [
    'Show that your project, product, or company uses RxDB, for example in a "Built with RxDB" section or a list of technologies.',
    'Illustrate articles, blog posts, tutorials, books, videos, and conference talks about RxDB.',
    'Add RxDB to comparison tables and overviews of databases and sync engines.',
    'Link the logo to https://rxdb.info/ when you use it on a website.',
];

const NOT_ALLOWED = [
    'Change the colors, proportions, or shapes of the logo, or add effects like shadows, outlines, or gradients.',
    'Rotate, stretch, or crop the logo, or place it on a background where it is hard to read.',
    'Use the logo or the name "RxDB" as part of your own product name, logo, domain, or app icon.',
    'Use the logo in a way that suggests RxDB sponsors, endorses, or partners with you, unless there is a written agreement.',
    'Sell merchandise with the logo without asking first.',
];

const styles = {
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 24,
        marginTop: 24,
        marginBottom: 48,
    },
    card: {
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    preview: {
        height: 180,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    cardBody: {
        padding: 16,
        flexGrow: 1,
    },
    downloads: {
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
    },
    swatch: {
        width: '100%',
        height: 72,
        borderRadius: 6,
        border: '1px solid rgba(255, 255, 255, 0.2)',
    },
} as const;

export default function BrandGuidelinesPage() {
    return (
        <>
            <Head>
                <body className="homepage" />
            </Head>
            <Layout
                title="RxDB Brand Guidelines - Logo Downloads and Usage Rules"
                description="Download the RxDB logo as SVG or PNG and learn how you can use it in articles, talks, and 'Built with RxDB' sections."
            >
                <main>
                    <div className="block first">
                        <div className="content">
                            <h1>RxDB Brand Guidelines</h1>
                            <p>
                                The <b>RxDB brand guidelines</b> explain how you can use the RxDB logo, colors, and name, and where you can download the official logo files.
                                You are welcome to use the logo to refer to <a href="/">RxDB</a> in articles, talks, videos,
                                documentation, and on websites that show that a project is built with RxDB.
                                You do not have to ask for permission for these use cases as long as you follow the rules below.
                            </p>
                        </div>
                    </div>

                    <div className="block dark">
                        <div className="content">
                            <h2>Download the RxDB Logo</h2>
                            <p>
                                Prefer the SVG files because they scale to any size without losing quality.
                                Use the PNG files (512px high, transparent background) only when a tool does not accept SVG.
                            </p>
                            <div style={styles.grid}>
                                {LOGOS.map(logo => (
                                    <div key={logo.file} style={styles.card}>
                                        <div
                                            style={{
                                                ...styles.preview,
                                                background: logo.background === 'dark' ? '#0D0F18' : '#FFFFFF',
                                            }}
                                        >
                                            <img
                                                src={logo.file}
                                                alt={'RxDB ' + logo.title}
                                                width={logo.width}
                                                height={logo.height}
                                                style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
                                                loading="lazy"
                                            />
                                        </div>
                                        <div style={styles.cardBody}>
                                            <h3 style={{ marginBottom: 8 }}>{logo.title}</h3>
                                            <p style={{ fontSize: '0.9rem' }}>{logo.usage}</p>
                                            <div style={styles.downloads}>
                                                {logo.formats.map(format => (
                                                    <a key={format.href} href={format.href} download>
                                                        Download {format.label}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="block">
                        <div className="content">
                            <h2>How You Can Use the Logo</h2>
                            <p>You can use the RxDB logo without asking to:</p>
                            <ul>
                                {ALLOWED.map(text => <li key={text}>{text}</li>)}
                            </ul>

                            <h2>What You Should Not Do</h2>
                            <p>To keep the logo recognizable and to avoid confusion about who makes RxDB, do not:</p>
                            <ul>
                                {NOT_ALLOWED.map(text => <li key={text}>{text}</li>)}
                            </ul>
                        </div>
                    </div>

                    <div className="block dark">
                        <div className="content">
                            <h2>Spacing and Minimum Size</h2>
                            <ul>
                                <li><b>Clear space</b>: keep a free space around the logo that is at least half the height of the icon.</li>
                                <li><b>Minimum size</b>: render the icon at least 24px high and the logo with wordmark at least 32px high, so the letters stay readable.</li>
                                <li><b>Background</b>: use the white wordmark on dark backgrounds and the outlined wordmark on light backgrounds.</li>
                            </ul>

                            <h2>Brand Colors</h2>
                            <div style={{ ...styles.grid, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                                {COLORS.map(color => (
                                    <div key={color.hex}>
                                        <div style={{ ...styles.swatch, background: color.hex }} />
                                        <div style={{ marginTop: 8 }}><b>{color.name}</b></div>
                                        <code>{color.hex}</code>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="block">
                        <div className="content">
                            <h2>Writing the Name</h2>
                            <p>
                                Write the name as <b>RxDB</b>, with a capital R, a lowercase x, and a capital DB.
                                Do not write "RXDB", "RxDb", or "Rx DB". When you introduce RxDB to new readers you can describe it as
                                "RxDB, a local-first, NoSQL database for JavaScript applications" and link it
                                to <a href="https://rxdb.info/">https://rxdb.info/</a>.
                            </p>

                            <h2>Questions and Other Use Cases</h2>
                            <p>
                                For any use that is not covered on this page, like merchandise, co-marketing,
                                or partner badges, ask in the <a href="/chat/">RxDB Discord</a> or
                                via the <a href="/consulting/">contact form</a> before you publish it.
                                If you wrote an article, paper, or talk that mentions RxDB, add it to
                                the <a href="/press/">RxDB in the Press</a> list.
                            </p>
                        </div>
                    </div>
                </main>
            </Layout>
        </>
    );
}
