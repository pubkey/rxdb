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
import useIsBrowser from '@docusaurus/useIsBrowser';
// import { SOCIAL_PROOF_VALUES, Trophy } from '../components/trophy';
import { VideoSection } from '../components/video-section';
import { HeroSection_B } from '../components/hero-section/T4_hero_b';
// import { ABTestContent, getTestGroup } from '../components/a-b-tests';
import { RuntimesSection } from '../components/runtimes-section';
import { SyncSection } from '../components/sync-section';
import { OfflineSection } from '../components/offline-section';
import { RealtimeSection } from '../components/realtime-section';
import { SOCIAL_PROOF_VALUES, Trophy } from '../components/trophy';
import { VideoPlayButton } from '../components/video-button';
import { VideoBox } from '../components/video-box';
import { Tag } from '../components/tag';
import { IconAttachment } from '../components/icons/attachment';
import { IconServer } from '../components/icons/server';
import { IconCompression } from '../components/icons/compression';
import { IconReplication } from '../components/icons/replication';
import { IconEncryption } from '../components/icons/encryption';
import { IconNewsletter } from '../components/icons/newsletter';
import { Button } from '../components/button';
import { IconDiscord } from '../components/icons/discord';
import { IconPremium } from '../components/icons/premium';
import { IconTwitter } from '../components/icons/twitter';
import { IconCode } from '../components/icons/code';
import { IconQuickstart } from '../components/icons/quickstart';
import { PixelToggle } from '../components/toggle';
import { IconWifi } from '../components/icons/wifi';
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
  // getTestGroup(props.sem ? props.sem.id : '');
  const { siteConfig } = useDocusaurusContext();

  const [tags] = useState<{ value: string; url: string; count: number, img?: string | React.ReactNode; break?: boolean }[]>([



    {
      value: 'Logging',
      count: 38,
      url: '/logger.html'
    },
    {
      value: 'Attachments',
      count: 38,
      url: '/rx-attachment.html',
      img: <IconAttachment />
    },
    {
      value: 'ORM',
      count: 38,
      url: '/orm.html'
    },
    {
      value: 'Conflict Handling',
      count: 10,
      url: '/transactions-conflicts-revisions.html',
      break: true
    },
    {
      value: 'Middleware',
      count: 38,
      url: '/middleware.html'
    },
    {
      value: 'Signals',
      count: 38,
      url: '/reactivity.html'
    },
    {
      value: 'Server',
      count: 38,
      url: '/rx-server.html',
      img: <IconServer />
    },
    {
      value: 'Backup',
      count: 38,
      url: '/backup.html',
      break: true
    },

    {
      value: 'Storages',
      count: 10,
      url: '/rx-storage.html'
    },
    {
      value: 'Replication',
      count: 10,
      url: '/replication.html',
      img: <IconReplication />
    },
    {
      value: 'Local Documents',
      count: 38,
      url: '/rx-local-document.html'
    },
    {
      value: 'Schema Validation',
      count: 38,
      url: '/schema-validation.html'
    },
    {
      value: 'State',
      count: 38,
      url: '/rx-state.html',
      break: true
    },
    {
      value: 'Migration',
      count: 38,
      url: '/migration-schema.html'
    },
    {
      value: 'CRDT',
      count: 38,
      url: '/crdt.html'
    },
    {
      value: 'Compression',
      count: 38,
      url: '/key-compression.html',
      img: <IconCompression />
    },
    {
      value: 'Population',
      count: 38,
      url: '/population.html'
    },
    {
      value: 'Encryption',
      count: 38,
      url: '/encryption.html',
      img: <IconEncryption />
    },
  ]);

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
  // const refs = {
  //   reviewsRef,
  //   realtimeRef,
  //   replicationRef,
  //   offlineRef,
  //   runtimesRef
  // };

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

  const [online, setOnline] = useState(false);

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

          <Trophy
            href="/code/"
            title="GitHub"
            subTitle='Open Source'
            value={SOCIAL_PROOF_VALUES.github}
            imgUrl="/files/icons/github-star-with-logo.svg"
            valueTitle='stars'
          />
          <SyncSection sem={props.sem} replicationRef={replicationRef} dark={true} />

          <Trophy
            href="https://twitter.com/intent/user?screen_name=rxdbjs"
            title="Twitter"
            subTitle='Follow on'
            value={SOCIAL_PROOF_VALUES.twitter}
            imgUrl="/files/icons/twitter-blue.svg"
            valueTitle='followers'
          />

          <OfflineSection sem={props.sem} offlineRef={offlineRef} dark={false} />
          {/* <RealtimeSection sem={props.sem} realtimeRef={realtimeRef} dark={false} /> */}

          <Trophy
            href="/chat/"
            title="Discord"
            subTitle='Chat on'
            value={SOCIAL_PROOF_VALUES.discord}
            imgUrl="/files/icons/discord.svg"
            valueTitle='members'
          />



          <div className="block features dark">
            <div className="content">
              <h2 style={{ textAlign: 'center' }}>All the <b >Features</b> You'll Ever Need</h2>
              {/* <p>
                Since its creation in 2018,
                RxDB has evolved into a powerhouse of features and plugins, offering an all-inclusive,
                future-proof solution for any type of {getAppName(props)} application. Whatever you need now or might need down the road, is already built in.
                Giving you the confidence to create robust, scalable apps with ease.
              </p> */}
              <div style={{
                marginTop: 35,
                marginBottom: 0,
                width: '100%',
                maxWidth: 1200,
                padding: 10,
                textAlign: 'center'
              }}>
                {tags.map(tag => {

                  const el = <a href={tag.url} target="_blank" style={{ color: 'white' }}>
                    <Tag img={tag.img}>{tag.value}</Tag>
                  </a>;

                  if (tag.break) {
                    return <>
                      {el}
                      <div className="clear"></div>
                    </>
                  } else {
                    return el;
                  }

                })}
              </div>
            </div>
          </div>

          <div className="block reviews" id="reviews" ref={reviewsRef} style={{
            paddingTop: 50
          }}>
            <div className="content centered">
              <h2>
                Used by <b>Thousands Worldwide</b>
              </h2>
              <div className="inner">
                {/* <p>
                  RxDB is a proven, battle-tested solution used by countless developers across the globe.
                  With its flexibility, RxDB is used in a vast spectrum of {getAppName(props)} apps and services — from real-time collaboration tools to mission-critical enterprise systems:
                </p> */}
                <br /><br />
                <ReviewsBlock></ReviewsBlock>
              </div>
            </div>
          </div>


          <div className="block last dark">
            <div className="content">
              <h2>
                Start using <b >RxDB</b> today
              </h2>
              <div className="buttons full-width">
                <a
                  href="/quickstart.html"
                  rel="noopener"
                  target="_blank"
                  onClick={() => triggerTrackingEvent('start_now_main_bottom', 0.40)}
                >
                  <Button icon={<IconQuickstart />}
                    primary
                    style={{
                      left: '50%',
                      top: '23%',
                      marginLeft: '-93px',
                      position: 'absolute'
                    }}>
                    Quickstart
                  </Button>
                </a>
                <a
                  href="/newsletter"
                  rel="noopener"
                  target="_blank"
                  onClick={() => triggerTrackingEvent('newsletter_main_bottom', 0.40)}
                >
                  <Button icon={<IconNewsletter />} style={{
                    left: '24%',
                    marginLeft: '-90px',
                    position: 'absolute'
                  }}>
                    <span className='hide-on-mobile'>Subscribe to the</span> Newsletter
                  </Button>
                  {/* <div className="button" style={{ left: '25%', marginLeft: '-90px' }}>
                    <IconNewsletter />
                    <span className='hide-on-mobile'>Subscribe to the</span> Newsletter
                  </div> */}
                </a>
                <a
                  href="/chat/"
                  rel="noopener"
                  target="_blank"
                  onClick={() => triggerTrackingEvent('join_chat_main_bottom', 0.40)}
                >
                  <Button icon={<IconDiscord />} style={{
                    left: '85%',
                    top: '6%',
                    marginLeft: '-110.5px',
                    position: 'absolute'
                  }}>
                    <span className='hide-on-mobile'>Join the</span>Chat
                  </Button>
                </a>
                <a href="/premium/" onClick={() => triggerTrackingEvent('get_premium_main_bottom', 0.40)}>
                  <Button icon={<IconPremium />} style={{
                    top: '44%', left: '20%', marginLeft: '-70.5px',
                    position: 'absolute'
                  }}>
                    <span className='hide-on-mobile'>Get</span>Premium
                  </Button>
                </a>
                <a
                  href="https://twitter.com/intent/user?screen_name=rxdbjs"
                  rel="noopener"
                  target="_blank"
                  onClick={() => triggerTrackingEvent('follow_twitter_main_bottom', 0.40)}
                >
                  <Button icon={<IconTwitter />} style={{
                    top: '44%',
                    left: '83%',
                    marginLeft: '-129px',
                    position: 'absolute'
                  }}>
                    <span className='hide-on-mobile'>Follow on</span>Twitter
                  </Button>
                </a>
                <a
                  href="/code/"
                  rel="noopener"
                  target="_blank"
                  onClick={() => triggerTrackingEvent('get_code_main_bottom', 0.40)}
                >

                  <Button icon={<IconCode />} style={{
                    top: '64%', left: '43%', marginLeft: '-70px',
                    position: 'absolute'
                  }}>
                    <span className='hide-on-mobile'>Get the</span>Code
                  </Button>
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

