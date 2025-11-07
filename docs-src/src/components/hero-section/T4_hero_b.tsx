import { ScrollToSection, SemPage } from '@site/src/pages';
import { triggerTrackingEvent } from '../trigger-event';
import { CheckedList } from '../checked-list';
import { Button } from '../button';
import { HeroRuntimes } from '../runtimes';
import { EmojiChatStateful } from '../emoji-chat';
import { PixelToggle } from '../toggle';
import { useState } from 'react';
import { IconWifi } from '../icons/wifi';
import { ABTestContent } from '../a-b-tests';
import { IframeFormModal } from '../modal';

export function HeroSection_B(props: {
    sem?: SemPage;
    scrollToSection: ScrollToSection;
}) {

    const [online, setOnline] = useState(true);
    const [openDemo, setOpenDemo] = useState(false);

    return <div className="block first hero centered dark">
        <div className="content">
            {
                props.sem && props.sem.iconUrl ? (
                    <div style={{ width: '100%', textAlign: 'center' }}>
                        <img src={props.sem.iconUrl} style={{
                            height: 51
                        }} alt={props.sem.metaTitle}></img>
                    </div>
                ) : <></>
            }
            <h1 style={{
                textAlign: 'center',
            }}>
                {
                    props.sem ? props.sem.title : <>The easiest way to <b>store</b> and <b>sync</b> Data inside of your App</>
                }
            </h1>
            <div className="inner">
                <div className="half left" style={{}}>
                    <p style={{
                        marginTop: 0,
                        marginBottom: 0
                    }} className='centered-mobile-p'>
                        RxDB is a NoSQL database for JavaScript that runs directly in your app. With a <a href="/articles/local-first-future.html" target="_blank">local-first</a> design, it delivers zero-latency queries even offline, and syncs seamlessly with many backends. With observable queries, your UI updates instantly as data changes.
                    </p>
                    <CheckedList className='centered-mobile padding-right-20-0' style={{
                        paddingTop: 35,
                        paddingLeft: 0,
                        paddingBottom: 0,
                        maxWidth: 360
                    }}>
                        <>
                            Build apps that work <b onClick={() => props.scrollToSection('offline')}>offline</b>
                        </>
                        <>
                            Sync with <b onClick={() => props.scrollToSection('replication')}>any Backend</b>
                        </>
                        <>
                            Observable <b onClick={() => props.scrollToSection('realtime')}>Realtime Queries</b>
                        </>
                        <>
                            All JavaScript <b onClick={() => props.scrollToSection('runtimes')}>Runtimes</b> Supported
                        </>
                    </CheckedList>

                    <div style={{
                        marginTop: 60,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10,
                        maxWidth: 500,
                    }} className='hero-action-buttons centered-smaller-mobile'>
                        <Button className="hero-action"
                            onClick={() => {
                                setOpenDemo(true);
                                triggerTrackingEvent('hero_section_demo_open', 0.4);
                            }}
                        >Schedule a Demo</Button>
                        <IframeFormModal
                            iframeUrl='https://webforms.pipedrive.com/f/6Fz0viOs1HDtaA9sgYbt29eTE4tsxrW29hQbk8hGIvr1Bzl8NJrZNhcGWQlLcN1Dxh'
                            open={openDemo}
                            onClose={() => setOpenDemo(false)}
                        />
                        <Button primary
                            className="hero-action"
                            href="/quickstart.html"
                            target='_blank'
                            onClick={() => triggerTrackingEvent('hero_section_start_now', 0.4)}
                        >Get Started For Free</Button>
                    </div>
                </div>
                <div
                    className="half right justify-center-mobile grid-2-mobile grid-3"
                >

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyItems: 'center',
                        alignSelf: 'start',
                        flexDirection: 'row',
                        gap: 20,
                    }} className='flex-end-center'
                    >
                        <EmojiChatStateful
                            dark={true}
                            online={online}
                            chatId='hero_left'
                            simulateClicks={true}
                        />
                        <div
                            className='hide-mobile'
                            style={{
                                textAlign: 'center',
                            }}>
                            <IconWifi style={{
                                width: '100%',
                                paddingBottom: 3
                            }} />
                            <PixelToggle checked={online} onChange={setOnline} label='online/offline' />
                        </div>
                        <EmojiChatStateful
                            dark={true}
                            online={online}
                            chatId='hero_right'
                            buttonEmojis={['🧩', '👩🏼‍💻', '🔥']}
                            simulateClicks={true}
                        />
                    </div>

                    <div
                        className='hide-desktop'
                        style={{
                            textAlign: 'center',
                            justifyContent: 'center', // horizontally center the pair
                            alignItems: 'center',     // vertically center (optional)
                            gap: '1rem',
                            marginTop: 19,
                        }}>
                        <IconWifi style={{
                            height: 20
                        }} />
                        <PixelToggle checked={online} onChange={setOnline} label='online/offline' />
                    </div>


                </div>
            </div>
            <HeroRuntimes></HeroRuntimes>
        </div>
    </div >;
}
