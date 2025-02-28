import { ScrollToSection, SemPage, getAppName } from '@site/src/pages';
import { triggerTrackingEvent } from '../trigger-event';

export function HeroSection_A(props: {
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
                    {/* <ul className="checked">
            <li>
              <b>Offline Support</b>:
              Store data locally on your users device to build applications that work even when
              there is <u>no internet access</u>.
            </li>
            <li>
              <b>Supports all JavaScript runtimes</b>:
              With the flexible RxDB storage layer you can run the
              same code in <u>Browsers</u>, <u>Node.js</u>, <u>Electron</u>,{' '}
              <u>React-Native</u>, <u>Capacitor</u>, <u>Bun</u> and <u>Deno</u>.
            </li>
            <li>
              <b>Realtime Queries</b>:
              With RxDB you can
              observe query results and even single document fields everything which makes building <u>realtime applications</u> effortless.
            </li>
            <li>
              <b>Realtime Replication</b>:
              Run a two-way realtime replication with one of the many replication plugins.
              Also making your <u>custom backend compatible</u> is pretty simple.
            </li>
            <li>
              <b>Great Performance</b>:
              Years of performance optimization made RxDB one of the <u>fastest</u> ways
              to store and query data inside of JavaScript.
            </li>
          </ul> */}
                    <div className="text">
                        {
                            props.sem && props.sem.text ? props.sem.text : <>Store data locally to build high performance realtime {getAppName(props)} applications that sync data with the backend and even work when offline.</>
                        }
                    </div>

                    <br />
                    <br />


                    <div className="hero-action">
                        <div
                            className="button button-empty"
                            onClick={() => {
                                triggerTrackingEvent('hero_section_how_others', 0.4, false);
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
                            onClick={() => triggerTrackingEvent('hero_section_start_now', 0.4, false)}
                        >
                            Get Started For Free &#x27A4;<br />
                        </a>
                        <a
                            href="/premium/"
                            target="_blank"
                            onClick={() => triggerTrackingEvent('hero_section_get_premium', 0.4, false)}
                        >
                            <div className="buy-option-action">
                                (Get Premium)
                            </div>
                        </a>

                    </div>

                    {/* <div className="hero-action">

            <div style={{
              position: 'relative',
              right: 0,
              float: 'right',
              marginTop: -37,
              top: 16,
              left: 33,
              transform: 'rotate(-20deg)'
            }}>
              <PriceTag price={STARTER_PACK_PRICE + ''} />
            </div>
            <div
              className="button"
              onClick={() => {
                triggerTrackingEvent('hero_section_buy_starter_pack', 0.4, false);
                setStarterPackOpen(true);
              }}
            >
              RxDB Starter Pack &#x27A4;<br />
              <span>(get expert guidance)</span>
            </div>
            <Modal
              className="modal-consulting-page"
              open={starterPackOpen}
              width={1000}
              onCancel={() => setStarterPackOpen(false)}
              closeIcon={null}
              footer={null}
            >
              <div style={{
                backgroundColor: 'var(--bg-color)',
                padding: 20,
                borderRadius: 10,
                color: 'white'
              }}>
                <div style={{
                  position: 'relative',
                  right: 0,
                  float: 'right',
                  marginTop: -37,
                  top: 16,
                  left: 33,
                  transform: 'rotate(-20deg)'
                }}>
                  <PriceTag price={STARTER_PACK_PRICE + ''} />
                </div>
                <h2>RxDB Starter Pack</h2>
                <p>Unlock the full potential of RxDB for your project with our Starter Pack! Whether you're just getting started or looking for expert guidance, this pack is designed to help you use RxDB efficiently and effectively. Here's what you'll get:</p>
                <ul>
                  <li>
                    <b>30-Minute Consulting Session:</b>
                    <p>Speak directly with the RxDB maintainer to discuss your specific use case, challenges, and goals. Receive personalized advice on how to implement RxDB to solve your problems efficiently.</p>
                  </li>
                  <li>
                    <b>Expert Email Support:</b>
                    <p>Get up to 5 follow-up emails with detailed answers to your additional questions, ensuring you have ongoing support as you work through your project.</p>
                  </li>
                </ul>
                <a href="https://buy.stripe.com/3cs4jr9wK1CkgQEbIL" target='_blank' className='button' style={{
                  width: 200,
                  display: 'block',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  marginTop: 30,
                  marginBottom: 30,
                  color: 'white'
                }}>Book Now</a>
              </div>

            </Modal>
          </div> */}

                    {/* <a
            href="/premium/#price-calculator-block"
            onClick={() => triggerTrackingEvent('request_premium_main_page', 3, false)}
            className='buy-premium-hero'
          >
            Buy Premium
          </a> */}
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
                    <img src="/img/hero.svg" className="hero-img" alt="rxdb-image" />
                </div>
                {/* <BrowserWindow opacity={0.3} iconUrl={props.sem ? props.sem.iconUrl : undefined} iconAlt={props.sem ? props.sem.metaTitle : undefined}>
            </BrowserWindow> */}
                {/* <img
      src="/files/logo/logo_text.svg"
      id="heartbeat-logo"
      alt="RxDB"
  /> */}
                <div className='clear'></div>
            </div>
        </div>
        <br />
        <br />
        <br />
        <br />
    </div >;
}
