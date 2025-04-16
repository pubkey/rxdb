import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import {
  ensureNotFalsy,
  promiseWait,
  ucfirst,
  hashStringToNumber
} from '../../../';
import React, { useEffect, useRef, useState } from 'react';
import { triggerTrackingEvent } from '../components/trigger-event';

import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { ReviewsBlock } from '../components/review-block';
import { TagCloud } from 'react-tagcloud';
import useIsBrowser from '@docusaurus/useIsBrowser';
// import { SOCIAL_PROOF_VALUES, Trophy } from '../components/trophy';
import { VideoSection } from '../components/video-section';
import { HeroSection_B } from '../components/hero-section/T4_hero_b';
import { ABTestContent, getTestGroup } from '../components/a-b-tests';
// import { SyncSection } from '../components/sync-section';
// import { RealtimeSection } from '../components/realtime-section';
// import { OfflineSection } from '../components/offline-section';
// import { RuntimesSection } from '../components/runtimes-section';
// import PriceTag from '../components/price-tag';
// import { Modal } from 'antd';


export const colors = [
  '#e6008d',
  '#8d2089',
  '#5f2688'
];

// const STARTER_PACK_PRICE = 24;

let animationStarted = false;
function startLandingpageAnimation() {

  if (animationStarted) {
    return;
  }
  animationStarted = true;
  console.log('start animation');

  /**
   * Having blinking stuff can be annoying for people with
   * neuronal problems. So we disable it for everyone
   * who has set the reduced motions settings in the browser/OS
   * @link https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
   * @link https://web.dev/prefers-reduced-motion/
   * @link https://github.com/pubkey/rxdb/pull/3800
   * @link https://a11y-101.com/development/reduced-motion
   */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    console.log('reducedMotion is set to true');
    return;
  }

  startTiltToMouse();
  startEnlargeOnMousePos();


  /**
   * Pointers to html elements are prefixed with $
   * Lists of pointers have $$
   */
  const $$beating: any[] = document.getElementsByClassName('beating') as any;
  const $$beatingFirst: any[] = document.getElementsByClassName('beating-first') as any;
  const $$beatingSecond: any[] = document.getElementsByClassName('beating-second') as any;
  const $$beatingNumber = document.getElementsByClassName('beating-number');
  const $$beatingColor: any[] = document.getElementsByClassName('beating-color') as any;
  const $$beatingColorString: any[] = document.getElementsByClassName('beating-color-string') as any;

  // const $swapOutFirst = ensureNotFalsy(document.getElementById('swap-out-first'));
  // const $swapOutSecond = ensureNotFalsy(document.getElementById('swap-out-second'));


  const heartbeatListeners: any[] = [];
  let heartbeatIndex = 0;
  const heartbeatTimeToFirstBeat = 105;

  getBeatCurrentBeatInfo();

  (async () => {
    await promiseWait(HEARTBEAT_DURATION * 1);
    let lastPeriod = 0;
    while (animationStarted) {
      const beatInfo = getBeatCurrentBeatInfo();
      const nextBeatPromise = promiseWait(beatInfo.timeToNextPeriod);
      // only every second interval so we have a pause in between
      const period = beatInfo.period;
      if (period === lastPeriod) {
        await nextBeatPromise;
        continue;
      }
      lastPeriod = period;
      if (period % 2 === 0) {
        const color = colors[period % 3];
        window.dispatchEvent(new CustomEvent('heartbeat'));
        heartbeatListeners.forEach(function (listener) {
          listener(heartbeatIndex);
        });
        heartbeatIndex = heartbeatIndex + 1;
        Array.from($$beatingColor).forEach(function (element) {
          element.style.backgroundColor = color;
        });

        Array.from($$beatingColorString).forEach(function (element) {
          element.innerHTML = color;
        });
      }
      await nextBeatPromise;
    }
  })();

  /**
   * css animation of big logo on heartbeat
   * Notice that we have to trigger a reflow
   * when we want to restart the animation.
   * @link https://css-tricks.com/restart-css-animation/
   */
  heartbeatListeners.push(function () {
    Array.from($$beating).forEach(function (element) {
      element.style.animationDuration = HEARTBEAT_DURATION + 'ms';
      element.classList.remove('animation');
      void element.offsetWidth;
      element.classList.add('animation');
    });
    Array.from($$beatingFirst).forEach(function (element) {
      element.style.animationDuration = HEARTBEAT_DURATION + 'ms';
      element.classList.remove('animation');
      void element.offsetWidth;
      element.classList.add('animation');
    });
    Array.from($$beatingSecond).forEach(function (element) {
      element.style.animationDuration = HEARTBEAT_DURATION + 'ms';
      element.classList.remove('animation');
      void element.offsetWidth;
      element.classList.add('animation');
    });
  });

  // increase beating numbers
  heartbeatListeners.push(function () {
    Array.from($$beatingNumber).forEach(function (element) {
      // only increase randomly so it looks more natural.
      if (randomBoolean() && randomBoolean()) {
        setTimeout(function () {
          const value = parseFloat(element.innerHTML);
          const newValue = value + 1;
          element.innerHTML = newValue + '';
        }, heartbeatTimeToFirstBeat);
      }
    });
  });
}


/**
 * Will be filled into landingpage text whenever
 * the App words appear.
 * Like having "sync data in Capacitor Apps" instead of "sync data in Apps".
 * This improves the google-ads landingpage relevance.
 */
export type AppName = |
  'Capacitor' |
  'React' |
  'Angular' |
  'JavaScript' |
  'Browser' |
  'Electron' |
  'Ionic' |
  'Node.js' |
  'React Native' |
  'Expo' |
  'Svelte' |
  'Vue.js';

export function getAppName(props: {
  sem?: SemPage;
}) {
  return props.sem && props.sem.appName ? props.sem.appName + ' ' : '';
}


export type Section = 'reviews' | 'replication' | 'realtime' | 'runtimes' | 'offline';
export type ScrollToSection = (section: Section) => void;

/**
 * For custom pages for search engine marketing,
 * we can swap out titles texts and icons.
 */
export type SemPage = {
  id: string;
  metaTitle: string;
  iconUrl?: string;
  title: any;
  text?: any;
  appName?: AppName;
  /**
   * Additional blocks to be shown
   */
  blocks?: React.JSX.Element[];
};

export default function Home(props: {
  sem?: SemPage;
}) {
  getTestGroup(props.sem ? props.sem.id : '');
  const { siteConfig } = useDocusaurusContext();

  const [tags] = useState([
    {
      value: 'attachments',
      count: 38,
      url: '/rx-attachment.html'
    },
    {
      value: 'server',
      count: 38,
      url: '/rx-server.html'
    },
    {
      value: 'migration',
      count: 38,
      url: '/migration-schema.html'
    },
    {
      value: 'schema Validation',
      count: 38,
      url: '/schema-validation.html'
    },
    {
      value: 'signals',
      count: 38,
      url: '/reactivity.html'
    },
    {
      value: 'state',
      count: 38,
      url: '/rx-state.html'
    },
    {
      value: 'local Documents',
      count: 38,
      url: '/rx-local-document.html'
    },
    {
      value: 'encryption',
      count: 38,
      url: '/encryption.html'
    },
    {
      value: 'compression',
      count: 38,
      url: '/key-compression.html'
    },
    {
      value: 'backup',
      count: 38,
      url: '/backup.html'
    },
    {
      value: 'middleware',
      count: 38,
      url: '/middleware.html'
    },
    {
      value: 'CRDT',
      count: 38,
      url: '/crdt.html'
    },
    {
      value: 'population',
      count: 38,
      url: '/population.html'
    },
    {
      value: 'ORM',
      count: 38,
      url: '/orm.html'
    },
    {
      value: 'logging',
      count: 38,
      url: '/logger.html'
    },
    {
      value: 'conflict Handling',
      count: 10,
      url: '/transactions-conflicts-revisions.html'
    },
    {
      value: 'replication',
      count: 10,
      url: '/replication.html'
    },
    {
      value: 'storages',
      count: 10,
      url: '/rx-storage.html'
    }
  ].map((i: any) => {
    i.count = hashStringToNumber(i.value) % 54;
    return i;
  }));

  const isBrowser = useIsBrowser();
  useEffect(() => {
    if (isBrowser) {
      startLandingpageAnimation();
    }
    return () => {
      console.log('stop animation');
      animationStarted = false;
    };
  });

  // const [starterPackOpen, setStarterPackOpen] = useState(false);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const realtimeRef = useRef<HTMLDivElement>(null);
  const replicationRef = useRef<HTMLDivElement>(null);
  const offlineRef = useRef<HTMLDivElement>(null);
  const runtimesRef = useRef<HTMLDivElement>(null);
  const refs = {
    reviewsRef,
    realtimeRef,
    replicationRef,
    offlineRef,
    runtimesRef
  };

  function scrollToSection(section: Section) {
    switch (section) {
      case 'reviews':
        reviewsRef.current?.scrollIntoView({
          behavior: 'smooth'
        });
        break;
      case 'realtime':
        realtimeRef.current?.scrollIntoView({
          behavior: 'smooth'
        });
        break;
      case 'replication':
        replicationRef.current?.scrollIntoView({
          behavior: 'smooth'
        });
        break;
      case 'runtimes':
        runtimesRef.current?.scrollIntoView({
          behavior: 'smooth'
        });
        break;
      case 'offline':
        offlineRef.current?.scrollIntoView({
          behavior: 'smooth'
        });
        break;
    }

  }

  return (
    <>
      <Head>
        <body className="homepage" />
        <link rel="canonical" href="https://rxdb.info/" />
      </Head>
      <Layout
        title={props.sem ? props.sem.metaTitle : siteConfig.title}
        description="RxDB is a fast, local-first NoSQL-database for JavaScript Applications like Websites, hybrid Apps, Electron-Apps, Progressive Web Apps and Node.js">
        <main>

          <HeroSection_B sem={props.sem} scrollToSection={scrollToSection} />
          {/* <HeroSection_C sem={props.sem} scrollToSection={scrollToSection} />
          <HeroSection_B sem={props.sem} scrollToSection={scrollToSection} />
          <HeroSection_A sem={props.sem} scrollToSection={scrollToSection} /> */}

          {
            props.sem && props.sem.blocks ?
              <>
                {props.sem.blocks}
              </> : ''
          }


          <VideoSection sem={props.sem} />

          <ABTestContent sem={props.sem} refs={refs} scrollToSection={scrollToSection} />

          {/* <div className="" style={{
            display: 'flex',
            flexDirection: 'column'
          }}>


            <RealtimeSection sem={props.sem} realtimeRef={realtimeRef} dark={getABTestDark('realtime')} order={getABTestOrder('realtime')} />
            <SyncSection sem={props.sem} replicationRef={replicationRef} dark={getABTestDark('sync')} order={getABTestOrder('sync')} />
            <OfflineSection sem={props.sem} offlineRef={offlineRef} dark={getABTestDark('offline')} order={getABTestOrder('offline')} />
            <RuntimesSection sem={props.sem} runtimesRef={runtimesRef} dark={getABTestDark('runtimes')} order={getABTestOrder('runtimes')} />

            <Trophy
              href="/code/"
              title="GitHub"
              subTitle='Open Source on'
              value={SOCIAL_PROOF_VALUES.github}
              imgUrl="/files/icons/github-star-with-logo.svg"
              valueTitle='stars'
              order={1}
            />



            <Trophy
              href="/chat/"
              title="Discord"
              subTitle='Chat on'
              value={SOCIAL_PROOF_VALUES.discord}
              imgUrl="/files/icons/discord.svg"
              valueTitle='members'
              order={2}
            />



            <Trophy
              href="https://twitter.com/intent/user?screen_name=rxdbjs"
              title="Twitter"
              subTitle='Follow on'
              value={SOCIAL_PROOF_VALUES.twitter}
              imgUrl="/files/icons/twitter-blue.svg"
              valueTitle='followers'
              order={3}
            />
          </div> */}

          <div className="block features dark">
            <div className="content">
              <h2>All the <b className="underline">Features</b> You'll Ever Need</h2>
              <p>
                Since its creation in 2018,
                RxDB has evolved into a powerhouse of features and plugins, offering an all-inclusive,
                future-proof solution for any type of {getAppName(props)} application. Whatever you need now or might need down the road, is already built in.
                Giving you the confidence to create robust, scalable apps with ease.
              </p>
              <div style={{
                marginTop: 65,
                marginBottom: 5,
                width: '100%',
                maxWidth: 1200,
                padding: 10
              }}>

                <TagCloud
                  minSize={18}
                  maxSize={55}
                  tags={tags}
                  randomSeed={145}
                  renderer={(tag, size, _color) => {
                    return (
                      <a key={tag.value}
                        style={{
                          color: 'white',
                          fontSize: size,
                          margin: '0px ' + size + 'px',
                          verticalAlign: 'middle',
                          display: 'inline-block'
                        }}
                        className="tag-cloud-tag"
                        href={tag.url}
                      >
                        {ucfirst(tag.value)}
                      </a>
                    );
                  }}
                />
              </div>
            </div>
          </div>

          <div className="block reviews" id="reviews" ref={reviewsRef}>
            <div className="content centered">
              <div className="inner">
                <h2>
                  Used by <b className="underline">Thousands Worldwide</b>
                </h2>
                <p>
                  RxDB is a proven, battle-tested solution used by countless developers across the globe.
                  With its flexibility, RxDB is used in a vast spectrum of {getAppName(props)} apps and services — from real-time collaboration tools to mission-critical enterprise systems:
                </p>
                <br /><br />
              </div>
            </div>
            <ReviewsBlock></ReviewsBlock>
          </div>

          {/* <div className="block fifth dark">
            <div className="content centered">
              <div className="inner">
                <h2>
                  Trusted and <b className="underline">open source</b>
                </h2>
                <div className="box dark">
                  <img loading="lazy" src="files/icons/github-star.svg" alt="github star" />
                  <div className="label">Github Stars</div>
                  <a
                    className="value"
                    href="/code/"
                    rel="noopener"
                    target="_blank"
                  >
                    20172
                  </a>
                  <div className="clear" />
                </div>
                <div className="box dark">
                  <img loading="lazy" src="files/icons/download.svg" alt="npm downloads" />
                  <div className="label">npm downloads</div>
                  <a
                    className="value beating-number"
                    href="https://www.npmjs.com/package/rxdb"
                    rel="noopener"
                    target="_blank"
                  >
                    238572
                  </a>
                  <div className="clear" />
                </div>
                <div className="clear" />
                <div className="box dark">
                  <img loading="lazy" src="files/icons/person.svg" alt="contributor" />
                  <div className="label">Contributors</div>
                  <a
                    className="value"
                    href="https://github.com/pubkey/rxdb/graphs/contributors"
                    rel="noopener"
                    target="_blank"
                  >
                    211
                  </a>
                  <div className="clear" />
                </div>
                <div className="box dark">
                  <img loading="lazy" src="files/icons/commit.svg" alt="commit" />
                  <div className="label">Commits</div>
                  <a
                    className="value"
                    href="https://github.com/pubkey/rxdb/commits/master"
                    rel="noopener"
                    target="_blank"
                  >
                    10409
                  </a>
                  <div className="clear" />
                </div>
                <div className="clear" />
                <div className="box dark">
                  <img loading="lazy" src="files/icons/gear.svg" alt="gear" />
                  <div className="label">RxDB made Projects</div>
                  <a
                    className="value"
                    href="https://github.com/pubkey/rxdb/network/dependents?package_id=UGFja2FnZS0xODM0NzAyMw%3D%3D"
                    rel="noopener"
                    target="_blank"
                  >
                    1402
                  </a>
                  <div className="clear" />
                </div>
                <div className="box dark">
                  <img loading="lazy" src="files/icons/twitter.svg" alt="twitter" />
                  <div className="label">Twitter followers</div>
                  <a
                    className="value"
                    href="https://twitter.com/intent/user?screen_name=rxdbjs"
                    rel="noopener"
                    target="_blank"
                  >
                    2925
                  </a>
                  <div className="clear" />
                </div>
                <div className="clear" />
              </div>
            </div>
          </div> */}

          <div className="block dark sixth">
            <div className="content">
              <h2>Free <b className='underline'>Open Core</b> Model</h2>
              <br />
              <div className="inner">
                <div className="buy-options">
                  <div className="buy-option bg-gradient-left-top">
                    <div className="buy-option-inner">
                      <div className="buy-option-title">
                        <h2>Open Source Core</h2>
                        <div className="price">for Hobbyists and Prototypes</div>
                      </div>
                      <div className="buy-option-features">
                        <p>
                          The RxDB Open Core provides a robust and reliable database engine
                          that's freely accessible to everyone.
                          <br />
                          This core includes all the essential features you need to develop efficient,
                          real-time {getAppName(props)} applications like storages, replication and other plugins.
                          <br />
                          <br />
                          Our open-core approach encourages a vibrant community of developers,
                          fostering collaboration and innovation.
                        </p>
                        <br />

                      </div>
                      <a
                        href="/code/"
                        target="_blank"
                        rel="noopener"
                        onClick={() => triggerTrackingEvent('get_the_code_main_page', 0.8)}
                      >
                        <div className="buy-option-action bg-top hover-shadow-top">
                          Get the Code
                        </div>
                      </a>
                    </div>
                  </div>
                  <div className="buy-option bg-gradient-right-top">
                    <div className="buy-option-inner">
                      <div className="buy-option-title">
                        <h2>Premium Plugins</h2>
                        <div className="price">
                          for professional Developers
                        </div>
                      </div>
                      <div className="buy-option-features">
                        <p>
                          Our Premium Plugins are essential for professionals using RxDB.
                          They boost the basic features of RxDB with significant performance improvements and reduced bundle size.
                        </p>
                        <ul>
                          <li>
                            <b>Enhanced Storage Plugins</b> to speed up data processing significantly.
                          </li>
                          <li>
                            <b>Robust Encryption</b> secures your data with state-of-the-art encryption methods.
                          </li>
                          <li>
                            <b>Advanced Metrics Logging</b> provides detailed insights for performance monitoring.
                          </li>
                        </ul>
                        <br />

                      </div>
                      <a
                        href="/premium/"
                        onClick={() => triggerTrackingEvent('request_premium_main_page', 3)}
                      >
                        <div className="buy-option-action bg-middle hover-shadow-middle">
                          Get Premium
                        </div>
                      </a>
                    </div>
                  </div>
                  <div className="buy-option bg-gradient-left-top">
                    <div className="buy-option-inner">
                      <div className="buy-option-title">
                        <h2>Consulting</h2>
                        <div className="price">Get Professional Support</div>
                      </div>
                      <div className="buy-option-features">
                        <p>
                          Using new technologies can be hard. If you lack the capacity or skill to build your application, we are here to help.
                          <br />
                          <br />
                          From quick <b>one-time support sessions</b> to <b>full project</b> development and <b>custom feature</b> implementation,
                          we're here to ensure your project's success. Let's build something incredible together.
                          <br />
                          <br />
                        </p>
                      </div>
                      <a
                        href="/consulting/"
                        onClick={() => triggerTrackingEvent('consulting_session_request_main_page', 4)}
                      >
                        <div className="buy-option-action bg-bottom hover-shadow-bottom">
                          Get in Contact
                        </div>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="block last">
            <div className="content">
              <h2>
                Start using <b className="underline">RxDB</b> today
              </h2>
              <div className="buttons full-width">
                <a
                  href="/quickstart.html"
                  rel="noopener"
                  target="_blank"
                  onClick={() => triggerTrackingEvent('start_now_main_bottom', 0.40)}
                >
                  <div
                    className="button get-premium"
                    style={{ left: '50%', top: '20%', marginLeft: '-122px' }}
                  >
                    Quickstart
                  </div>
                </a>
                <a
                  href="/newsletter"
                  rel="noopener"
                  target="_blank"
                  onClick={() => triggerTrackingEvent('newsletter_main_bottom', 0.40)}
                >
                  <div className="button" style={{ left: '25%', marginLeft: '-90px' }}>
                    Get the Newsletter
                  </div>
                </a>
                <a
                  href="/chat/"
                  rel="noopener"
                  target="_blank"
                  onClick={() => triggerTrackingEvent('join_chat_main_bottom', 0.40)}
                >
                  <div
                    className="button"
                    style={{ left: '77%', top: '6%', marginLeft: '-70.5px' }}
                  >
                    Join the Chat
                  </div>
                </a>
                <a href="/premium/" onClick={() => triggerTrackingEvent('get_premium_main_bottom', 0.40)}>
                  <div
                    className="button"
                    style={{ top: '40%', left: '20%', marginLeft: '-70.5px' }}
                  >
                    Get Premium
                  </div>
                </a>
                <a
                  href="https://twitter.com/intent/user?screen_name=rxdbjs"
                  rel="noopener"
                  target="_blank"
                  onClick={() => triggerTrackingEvent('follow_twitter_main_bottom', 0.40)}
                >
                  <div
                    className="button"
                    style={{ top: '44%', left: '73%', marginLeft: '-85px' }}
                  >
                    Follow on Twitter
                  </div>
                </a>
                <a
                  href="/code/"
                  rel="noopener"
                  target="_blank"
                  onClick={() => triggerTrackingEvent('get_code_main_bottom', 0.40)}
                >
                  <div
                    className="button"
                    style={{ top: '54%', left: '32%', marginLeft: '-70px' }}
                  >
                    Get the Code
                  </div>
                </a>
              </div>
            </div>
          </div>
        </main >
      </Layout >
    </>
  );
}



/**
 * @link https://armandocanals.com/posts/CSS-transform-rotating-a-3D-object-perspective-based-on-mouse-position.html
 */
function startTiltToMouse() {
  const $$tiltToMouse: any[] = document.getElementsByClassName('tilt-to-mouse') as any;

  const constrain = 100;
  function transforms(x: number, y: number, el: HTMLElement) {
    const box = el.getBoundingClientRect();
    const calcX = -(y - box.y - (box.height / 2)) / constrain;
    const calcY = (x - box.x - (box.width / 2)) / constrain;

    return `perspective(150px)    rotateX(${ensureInRange(calcX)}deg)    rotateY(${ensureInRange(calcY)}deg) `;
  }

  function transformElement(el: any, xyEl: number[]) {
    el.style.transform = transforms.apply(null, xyEl as any);
  }

  window.addEventListener('mousemove', (ev) => {
    const x = ev.clientX;
    const y = ev.clientY;
    Array.from($$tiltToMouse).forEach($element => {
      if (!isInViewport($element)) {
        return;
      }
      const position = ensureNotFalsy([x, y]).concat([$element]);
      transformElement($element, position);
    });
  });
}

/**
 * @link https://stackoverflow.com/a/16225919/3443137
 */
function startEnlargeOnMousePos() {
  const $$enlargeOnMouse: any[] = document.getElementsByClassName('enlarge-on-mouse') as any;

  function getElementPosition(el: HTMLElement) {
    const rect = el.getBoundingClientRect();

    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);

    return {
      centerX,
      centerY,
      width: rect.width,
      height: rect.height
    };
  }

  function enlargeElement(el: HTMLElement, scale: number) {
    const transform = `scale(${scale})`;
    el.style.transform = transform;
  }

  window.addEventListener('mousemove', (ev) => {
    const x = ev.clientX;
    const y = ev.clientY;
    Array.from($$enlargeOnMouse).forEach($element => {
      if (!isInViewport($element)) {
        return;
      }
      const elementPosition = getElementPosition($element);

      const dx = x - elementPosition.centerX;
      const dy = y - elementPosition.centerY;

      const distance = Math.sqrt(dx * dx + dy * dy);

      function easeInQuint(xx: number): number {
        return xx ^ 1.9;
      }

      let scale = 1 + (elementPosition.width / 2) / (easeInQuint(distance + 300));
      if (scale > 1.5) {
        scale = 1.5;
      }
      if (scale < 1.01) {
        scale = 1;
      }

      enlargeElement($element, scale);

    });
  });
}

export const HEARTBEAT_DURATION = 851;

function getBeatCurrentBeatInfo() {
  // remove a big chunk so we do not have a large number for better precision.
  const time = new Date().getTime() - 1960000000;
  const ratio = time / HEARTBEAT_DURATION;
  const period = Math.floor(ratio);
  const timeToNextPeriod = (ratio - period) * HEARTBEAT_DURATION;
  return {
    ratio,
    period,
    timeToNextPeriod
  };
}

const maxDegree = 22;
const minDegree = -1 * maxDegree;
// use max values to ensure it never looks broken, even on big screens.
function ensureInRange(val: number): number {
  if (val < minDegree) {
    return minDegree;
  }
  if (val > maxDegree) {
    return maxDegree;
  }
  return val;
}


// UTILS

function randomBoolean() {
  return Math.random() < 0.5;
}


/**
* @link https://www.javascripttutorial.net/dom/css/check-if-an-element-is-visible-in-the-viewport/
*/
function isInViewport(el: any) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

