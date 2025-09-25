import { ScrollToSection, SemPage } from '@site/src/pages';
import { triggerTrackingEvent } from '../trigger-event';
// import { CheckedList } from '../checked-list';
import { Button } from '../button';
import { HeroRuntimes } from '../runtimes';
import { EmojiChatStateful } from '../emoji-chat';
import { PixelToggle } from '../toggle';
import { useState } from 'react';
import { IconWifi } from '../icons/wifi';

export function HeroSection_A(props: {
    sem?: SemPage;
    scrollToSection: ScrollToSection;
}) {

    const [online, setOnline] = useState(true);

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
                <div className="half left" style={{ paddingTop: 35 }}>
                    <p className='centered-mobile padding-right-20-0'>
                        RxDB is a NoSQL Database that runs inside of your JavaScript application.
                        Store, query and observe data.{' '}
                         <b onClick={() => props.scrollToSection('replication')}>Sync</b> with any backend.
                        Build apps that work offline.
                    </p>
                    <div style={{
                        marginTop: 60,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10,
                        maxWidth: 500,
                    }} className='hero-action-buttons centered-smaller-mobile'>
                        <Button className="hero-action"
                            onClick={() => {
                                triggerTrackingEvent('hero_section_how_others', 0.4);
                                props.scrollToSection('reviews');
                            }}
                        >How others use it</Button>
                        <Button primary
                            className="hero-action"
                            href="/quickstart.html"
                            onClick={() => triggerTrackingEvent('hero_section_start_now', 0.4)}
                        >Get Started For Free</Button>
                    </div>
                    <div className="clear" />
                    <br />
                </div>
                <div
                    className='hide-desktop'
                    style={{
                        textAlign: 'center',
                        justifyContent: 'center', // horizontally center the pair
                        alignItems: 'center',     // vertically center (optional)
                        gap: '1rem',
                        marginTop: 9
                    }}>
                    <IconWifi style={{
                        height: 20
                    }} />
                    <PixelToggle checked={online} onChange={setOnline} />
                </div>
                <div
                    className="half right justify-center-mobile grid-2-mobile grid-3"
                    style={{
                        display: 'grid',
                        alignItems: 'center',
                        justifyItems: 'center',
                        alignSelf: 'start',
                        gap: 20
                    }}
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
                        <PixelToggle checked={online} onChange={setOnline} />
                    </div>
                    <EmojiChatStateful
                        dark={true}
                        online={online}
                        chatId='hero_right'
                        buttonEmojis={['🧩', '👩🏼‍💻', '🔥']}
                        simulateClicks={true}
                    />
                </div>
                <div className='clear'></div>
            </div>
            <HeroRuntimes></HeroRuntimes>
        </div>
    </div >;
}
