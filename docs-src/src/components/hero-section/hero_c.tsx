import { ScrollToSection, SemPage } from '@site/src/pages';
import { triggerTrackingEvent } from '../trigger-event';
import { DevicesSync } from '../devices-sync';

export function HeroSection_C(props: {
    sem?: SemPage;
    scrollToSection: ScrollToSection;
}) {

    return <div className="block first hero centered dark">
        <div className="content">
            <div className="inner">
                <div className="half left">
                    {
                        props.sem && props.sem.iconUrl ? (
                            <div style={{ width: '100%', textAlign: 'left' }}>
                                <img src={props.sem.iconUrl} style={{
                                    marginLeft: '40%',
                                    height: 51
                                }} alt={props.sem.metaTitle}></img>
                            </div>
                        ) : <></>
                    }
                    <h1 style={{
                    }}>
                        {
                            props.sem ? props.sem.title : <>The local <b className="underline">Database</b> for{' '}
                                <b className="underline">JavaScript</b> Applications</>
                        }
                    </h1>
                    <ul className="checked">
                        <li>
                            Build apps that work <b className="underline" onClick={() => props.scrollToSection('offline')}>Offline</b>
                        </li>
                        <li>
                            Observable <b className="underline" onClick={() => props.scrollToSection('realtime')}>Realtime Queries</b>
                        </li>
                        <li>
                            Sync with <b className="underline" onClick={() => props.scrollToSection('replication')}>any Backend</b>
                        </li>
                        <li>
                            Great Performance
                        </li>
                        <li>
                            All JavaScript <b className="underline" onClick={() => props.scrollToSection('runtimes')}>Runtimes</b> Supported
                        </li>
                    </ul>
                    {/* <div className="text">
                        {
                            props.sem && props.sem.text ? props.sem.text : <>Store data locally to build high performance realtime {getAppName(props)} applications that sync data with the backend and even work when offline.</>
                        }
                    </div> */}

                    <br />
                    <br />


                    <div className="hero-action">
                        <div
                            className="button button-empty"
                            onClick={() => {
                                triggerTrackingEvent('hero_section_how_others', 0.4);
                                props.scrollToSection('reviews');
                            }}
                        >
                            How others use it
                        </div>
                    </div>
                    <div className="hero-action">
                        <a
                            className="button"
                            href="/quickstart.html"
                            target="_blank"
                            onClick={() => triggerTrackingEvent('hero_section_start_now', 0.4)}
                        >
                            Get Started For Free &#x27A4;<br />
                        </a>
                        <a
                            href="/premium/"
                            target="_blank"
                            onClick={() => triggerTrackingEvent('hero_section_get_premium', 0.4)}
                        >
                            <div className="buy-option-action">
                                (Get Premium)
                            </div>
                        </a>

                    </div>



                    {/* <a
            className="button light"
            href="/code/"
            target="_blank"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              className="star-icon"
              aria-hidden="true"
              fill="currentColor"
              style={{ width: 14, marginRight: 8, marginLeft: -6, float: 'left', marginTop: 2 }}
            >
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
            </svg>
            Star (20,172)
          </a> */}

                    <div className="clear" />
                    <br />
                </div>
                <div
                    className="half right"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingLeft: '6%',
                        paddingRight: '2%'
                    }}
                >
                    <DevicesSync sem={props.sem} />
                </div>

                <div className='clear'></div>
            </div>
        </div>
        <br />
        <br />
        <br />
        <br />
    </div >;
}
