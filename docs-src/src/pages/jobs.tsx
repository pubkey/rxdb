import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';

const FILE_EVENT_ID = 'jobs-link-clicked';

import { triggerTrackingEvent } from '../components/trigger-event';
import { IframeFormModal, Modal } from '../components/modal';
import { Button } from '../components/button';
import { JOBS_TITLE } from '../constants';
import { JOBS_TEXTS_DE } from '../components/jobs-texts-de';

type Lang = 'en' | 'de';

/**
 * The texts of the page in every supported language. English is the default,
 * German is shown when the url contains `?lang=de`.
 */
const TEXTS = {
    en: {
        title: JOBS_TITLE,
        description: 'Open working student positions at RxDB in Stuttgart, Germany. 17 € per hour.',
        headline: 'Careers at',
        intro: 'RxDB is a local-first database for JavaScript applications. Apps built on it keep working when the network drops and sync again once the connection is back. We are a small team that builds open source software used by developers all over the world, and we are looking for people who want to build things, not just collect credit points. Both open positions are Werkstudent roles in Stuttgart, Germany 🇩🇪.',
        summary: '17 € per hour, 10 to 20 hours per week, on site in Stuttgart, Germany 🇩🇪',
        openAdvert: 'Read the full advert',
        openAdvertAria: 'Open the job advert: ',
        apply: 'Apply now',
        sectionTasks: 'What you will do',
        sectionRequirements: 'What you bring',
        sectionConditions: 'What you get',
        /**
         * The conditions are identical for both positions, so they live in one
         * place and are rendered into each advert. Each advert has to stand on
         * its own, because a visitor reads one of them and never the other.
         */
        conditions: [
            '17 € per hour',
            '10 to 20 hours per week, scheduled around the lecture timetable',
            'Regularly on site in Stuttgart, Germany 🇩🇪, part of the time from home',
            'Start date by arrangement, mid-semester is possible',
            'All work is open source and credited by name'
        ],
        /**
         * Shown on the page itself, above the adverts, so that a visitor sees
         * what makes these jobs different before opening one of them.
         */
        why: [
            {
                title: 'Your work is public',
                text: 'Everything you build is open source. Your commits, videos and name are out there for every future employer to see.'
            },
            {
                title: 'Real users from day one',
                text: 'RxDB runs in production at companies like Readwise, Nutrien, MoreApp and myAgro. What you ship gets used.'
            },
            {
                title: 'Direct line to the maintainer',
                text: 'You work directly with the person who built RxDB. No layers of management, short feedback loops, fast decisions.'
            },
            {
                title: 'Responsibility, not busywork',
                text: 'You get a topic that is yours, and the freedom to decide how to solve it. Coffee runs are not part of the job.'
            }
        ],
        /**
         * Both positions are German Werkstudent jobs based in Stuttgart. The
         * English titles keep the German term, which is the actual employment
         * status rather than a translation. Same order as in JOBS.
         */
        jobs: [
            {
                title: 'Working Student (m/f/d) Developer Experience, Frontend',
                teaser: 'You write code for the RxDB core. It ships in the next npm release and runs in apps that real companies use every day. No internal tool, no slide deck, no ticket that nobody reads.',
                tasks: [
                    'Find the places where developers get stuck with RxDB and fix them at the root, in the code',
                    'Shape the public API so that it does what people expect on the first try',
                    'Turn cryptic errors into messages that tell the developer exactly what went wrong and how to fix it',
                    'Build small demo apps and examples that show what local-first can do in the browser',
                    'Read what the community asks every week and turn it into product and docs changes'
                ],
                requirements: [
                    'You study computer science, software engineering, media informatics or something comparable',
                    'You write TypeScript with confidence. React, Angular, Vue or Svelte is a plus.',
                    'You have built things nobody asked you to build. Send us your GitHub profile instead of a cover letter.',
                    'You have opinions about tools, APIs and developer experience, and you can back them up'
                ]
            },
            {
                title: 'Working Student (m/f/d) Developer Experience, Video and Social Media',
                teaser: 'You own the RxDB video channel. Idea, camera, edit, upload. You decide what works, you see the numbers, and you get the freedom to try formats that nobody else in the database space is doing.',
                tasks: [
                    'Come up with video ideas that developers want to watch, and film them',
                    'Edit end to end: cut, sound, titles, thumbnails',
                    'Turn every video into shorts and reels for YouTube, LinkedIn, Instagram and TikTok',
                    'Run the YouTube channel and talk to the community in the comments',
                    'Read the reach and engagement data and decide what to produce next'
                ],
                requirements: [
                    'You study audiovisual media, online media, advertising and market communication, media informatics or something comparable',
                    'You film and edit on your own. Show us your best work samples, a portfolio, a channel or a reel.',
                    'You are curious about software. You do not write code in this role, but you follow what happens on screen and can read a short snippet.',
                    'You have a feel for what makes people stop scrolling'
                ]
            }
        ]
    },
    de: JOBS_TEXTS_DE
};

const JOBS = [
    {
        id: 'frontend',
        /**
         * Each position has its own Pipedrive webform, so an application
         * arrives already assigned to a position and the form does not have
         * to ask which one it is for.
         */
        formUrl: 'https://webforms.pipedrive.com/f/czK0WxW1wnP2HOdt6VkTVENuSfO4WvZsVeFXTCAy1a6wazfJcSa0BHBiWNoj1YKZTZ'
    },
    {
        id: 'video',
        formUrl: 'https://webforms.pipedrive.com/f/6ULD69TOWMqORnAypjPo1bdwhsesN2fDV6KxV3qLLYIPaJhOP8rNnznmTTk7Pojq39'
    }
];

function Section(props: { title: string; items: string[]; }) {
    return <>
        <div style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: 0.65,
            marginTop: 24,
            marginBottom: 8
        }}>{props.title}</div>
        <ul style={{ lineHeight: '24px', fontSize: 14, fontWeight: 500, marginBottom: 0 }}>
            {props.items.map((item, i) => <li key={'i-' + i}>{item}</li>)}
        </ul>
    </>;
}

export default function Jobs() {
    useEffect(() => {
        (() => {
            triggerTrackingEvent(FILE_EVENT_ID, 0.5);
        })();
    });

    /**
     * The static html is always rendered in English. The language is read
     * from the url after hydration, so server and client markup match.
     */
    const location = useLocation();
    const [lang, setLang] = useState<Lang>('en');
    useEffect(() => {
        setLang(new URLSearchParams(location.search).get('lang') === 'de' ? 'de' : 'en');
    }, [location.search]);
    const t = TEXTS[lang];

    const [openJob, setOpenJob] = useState<number | null>(null);
    // which position's form to show, kept after closing so the modal can fade out
    const [formJob, setFormJob] = useState<number | null>(null);
    const [formOpen, setFormOpen] = useState(false);

    const showJob = (index: number) => {
        setOpenJob(index);
        triggerTrackingEvent('jobs_detail_open_' + JOBS[index].id, 0.3);
    };

    /**
     * Applying happens from inside an advert. Close that one first so the two
     * modals never stack on top of each other.
     */
    const openApplicationForm = (index: number) => {
        setOpenJob(null);
        setFormJob(index);
        setFormOpen(true);
        triggerTrackingEvent('jobs_form_open_' + JOBS[index].id, 0.5);
    };

    const job = openJob === null ? null : t.jobs[openJob];

    return (
        <>
            <Head>
                <html lang={lang} />
                <body className="homepage jobs-page" />
                <link rel="canonical" href="/jobs/" />
            </Head>
            <Layout
                title={t.title}
                description={t.description}
            >
                <main>

                    <div className="block first centered">
                        <div className="content">
                            <div style={{ textAlign: 'center', fontSize: 14, marginBottom: 12 }}>
                                {lang === 'en' ? <b>English</b> : <Link to='/jobs/'>English</Link>}
                                {' | '}
                                {lang === 'de' ? <b>Deutsch</b> : <Link to='/jobs/?lang=de'>Deutsch</Link>}
                            </div>
                            <h1 style={{ textAlign: 'center' }}>
                                {t.headline} <b>RxDB</b>
                            </h1>
                            <div className="inner centered" style={{ flexDirection: 'column' }}>
                                <p className="centered-mobile-p" style={{ maxWidth: 780 }}>
                                    {t.intro}
                                </p>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    maxWidth: 980,
                                    marginTop: 16
                                }}>
                                    {t.why.map(entry => <div key={entry.title} style={{
                                        flex: '1 1 220px',
                                        margin: 8,
                                        textAlign: 'left'
                                    }}>
                                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{entry.title}</div>
                                        <div style={{ fontSize: 14, lineHeight: '21px', opacity: 0.85 }}>{entry.text}</div>
                                    </div>)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="block dark" style={{ paddingBottom: 124 }}>
                        <div className="content">
                            {/*
                              * Plain flex row instead of the shared .inner
                              * class, which turns column-reverse on small
                              * screens and would show the second advert first.
                              */}
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                alignItems: 'stretch'
                            }}>
                                {
                                    t.jobs.map((entry, i) => {
                                        return <div
                                            key={JOBS[i].id}
                                            role='button'
                                            tabIndex={0}
                                            aria-label={t.openAdvertAria + entry.title}
                                            onClick={() => showJob(i)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    showJob(i);
                                                }
                                            }}
                                            style={{
                                                backgroundColor: 'var(--bg-color)',
                                                borderRadius: 10,
                                                padding: 32,
                                                margin: 8,
                                                flex: '1 1 420px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{
                                                fontSize: 20,
                                                fontWeight: 700,
                                                lineHeight: '28px',
                                                marginBottom: 14
                                            }}>{entry.title}</div>
                                            <div style={{
                                                fontSize: 15,
                                                lineHeight: '23px',
                                                marginBottom: 20
                                            }}>{entry.teaser}</div>
                                            <div style={{
                                                fontSize: 13,
                                                fontWeight: 500,
                                                opacity: 0.7,
                                                flexGrow: 1
                                            }}>
                                                {t.summary}
                                            </div>
                                            <div style={{ textAlign: 'center', marginTop: 28 }}>
                                                <Button primary onClick={(event) => {
                                                    // the whole tile is clickable, so the
                                                    // button must not trigger it a second time
                                                    event.stopPropagation();
                                                    showJob(i);
                                                }}>
                                                    {t.openAdvert}
                                                </Button>
                                            </div>
                                        </div>;
                                    })
                                }
                            </div>
                        </div>
                    </div>

                    <Modal
                        open={job !== null}
                        onCancel={() => setOpenJob(null)}
                        title={job ? job.title : ''}
                    >
                        {
                            job ? <>
                                {/*
                                  * The advert scrolls, the button does not. Keeping the
                                  * button out of the scroll container stops the browser
                                  * from scrolling the advert to the bottom when the modal
                                  * is opened by keyboard and focus lands on the button.
                                  */}
                                <div style={{
                                    padding: '0 20px',
                                    maxHeight: '60vh',
                                    overflowY: 'auto'
                                }}>
                                    <div style={{ fontSize: 15, lineHeight: '23px' }}>{job.teaser}</div>
                                    <Section title={t.sectionTasks} items={job.tasks} />
                                    <Section title={t.sectionRequirements} items={job.requirements} />
                                    <Section title={t.sectionConditions} items={t.conditions} />
                                </div>
                                <div style={{
                                    textAlign: 'center',
                                    padding: '20px 20px 4px 20px'
                                }}>
                                    <Button primary onClick={() => {
                                        if (openJob !== null) {
                                            openApplicationForm(openJob);
                                        }
                                    }}>
                                        {t.apply}
                                    </Button>
                                </div>
                            </> : null
                        }
                    </Modal>

                    {
                        formJob === null ? null : <IframeFormModal
                            // remount when the visitor switches position
                            key={JOBS[formJob].id}
                            iframeUrl={JOBS[formJob].formUrl}
                            open={formOpen}
                            onClose={() => setFormOpen(false)}
                            eventId={'jobs_form_' + JOBS[formJob].id}
                            focusEventType={'jobs_form_focus_' + JOBS[formJob].id}
                        />
                    }
                </main>
            </Layout>
        </>
    );
}
