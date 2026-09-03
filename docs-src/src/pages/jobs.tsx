import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import React, { useEffect, useState } from 'react';

const FILE_EVENT_ID = 'jobs-link-clicked';

import { triggerTrackingEvent } from '../components/trigger-event';
import { IframeFormModal, Modal } from '../components/modal';
import { Button } from '../components/button';
import { JOBS_TITLE } from '../constants';

/**
 * The conditions are identical for both positions, so they live in one place
 * and are rendered into each advert. Each advert has to stand on its own,
 * because a visitor reads one of them and never the other.
 */
const CONDITIONS = [
    '20 € per hour',
    '10 to 20 hours per week, flexible around your lecture timetable',
    'regularly on site in Stuttgart, Germany 🇩🇪, part of the time from home',
    'start by arrangement, mid-semester is fine',
    'your work is open source and stays visible under your name'
];

/**
 * Both positions are German Werkstudent jobs based in Stuttgart. The page is
 * in English like the rest of the site, so the job titles keep the German
 * term, which is the actual employment status rather than a translation.
 */
const JOBS = [
    {
        id: 'frontend',
        title: 'Working Student (m/f/d) Developer Experience, Frontend',
        /**
         * Each position has its own Pipedrive webform, so an application
         * arrives already assigned to a position and the form does not have
         * to ask which one it is for.
         */
        formUrl: 'https://webforms.pipedrive.com/f/czK0WxW1wnP2HOdt6VkTVENuSfO4WvZsVeFXTCAy1a6wazfJcSa0BHBiWNoj1YKZTZ',
        teaser: 'You work on RxDB itself, and on getting developers productive with it faster.',
        tasks: [
            'finding where developers get stuck when they start with RxDB, and fixing the causes in the code',
            'working on the public interface of the library so that it behaves predictably',
            'improving what RxDB tells you when something goes wrong',
            'feeding recurring questions from the community back into the product and the documentation'
        ],
        requirements: [
            'studies in computer science, software engineering, media informatics or a comparable subject',
            'confident with TypeScript, experience with a frontend framework is an advantage',
            'published projects of your own. A GitHub profile replaces the cover letter here.'
        ]
    },
    {
        id: 'video',
        title: 'Working Student (m/f/d) Developer Experience, Video and Social Media',
        formUrl: 'https://webforms.pipedrive.com/f/6ULD69TOWMqORnAypjPo1bdwhsesN2fDV6KxV3qLLYIPaJhOP8rNnznmTTk7Pojq39',
        teaser: 'You run RxDB\'s YouTube channel and its social media, and decide what gets made next.',
        tasks: [
            'producing short videos about working with RxDB, from the concept through recording and editing to the title and the thumbnail',
            'cutting them into shorts and reels for YouTube, LinkedIn, Instagram and TikTok',
            'running the YouTube channel and the social media channels, including community management',
            'reading the reach numbers and deciding what to cover next'
        ],
        requirements: [
            'studies in audiovisual media, online media, advertising and market communication, media informatics or a comparable subject',
            'you edit independently, shown by work samples',
            'basic knowledge of software development. You do not write the code, but you should understand what happens in a video and be able to read a snippet of it.'
        ]
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

    const job = openJob === null ? null : JOBS[openJob];

    return (
        <>
            <Head>
                <body className="homepage jobs-page" />
                <link rel="canonical" href="/jobs/" />
            </Head>
            <Layout
                title={JOBS_TITLE}
                description="Open working student positions at RxDB in Stuttgart, Germany. 20 € per hour."
            >
                <main>

                    <div className="block first centered">
                        <div className="content">
                            <h1 style={{ textAlign: 'center' }}>
                                Careers at <b>RxDB</b>
                            </h1>
                            <div className="inner centered" style={{ flexDirection: 'column' }}>
                                <p className="centered-mobile-p" style={{ maxWidth: 780 }}>
                                    RxDB is a local-first database for JavaScript applications. It
                                    keeps working when the network drops and syncs again once the
                                    connection is back. Companies like Readwise, Nutrien, MoreApp and
                                    myAgro run RxDB in production. Both open positions are
                                    Werkstudent roles based in Stuttgart, Germany 🇩🇪.
                                </p>
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
                                    JOBS.map((entry, i) => {
                                        return <div
                                            key={entry.id}
                                            role='button'
                                            tabIndex={0}
                                            aria-label={'Open the job advert: ' + entry.title}
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
                                                20 € per hour, 10 to 20 hours per week,
                                                on site in Stuttgart, Germany 🇩🇪
                                            </div>
                                            <div style={{ textAlign: 'center', marginTop: 28 }}>
                                                <Button primary onClick={(event) => {
                                                    // the whole tile is clickable, so the
                                                    // button must not trigger it a second time
                                                    event.stopPropagation();
                                                    showJob(i);
                                                }}>
                                                    Read the full advert
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
                                    <Section title='Tasks' items={job.tasks} />
                                    <Section title='Requirements' items={job.requirements} />
                                    <Section title='Conditions' items={CONDITIONS} />
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
                                        Apply now
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
