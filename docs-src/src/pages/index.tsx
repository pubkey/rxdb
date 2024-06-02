import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import {
  merge,
  fromEvent,
  map,
  distinctUntilChanged
} from 'rxjs';
import {
  ensureNotFalsy,
  RxLocalDocument,
  now,
  promiseWait,
  ucfirst,
  hashStringToNumber
} from '../../../';
import {
  colors,
  getDatabase,
  hasIndexedDB
} from '../components/database';
import React, { useEffect, useState } from 'react';
import { trigger } from '../components/trigger-event';

import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { ReviewsBlock } from '../components/review-block';
import { BrowserWindow } from '../components/browser-window';
import { TagCloud } from 'react-tagcloud';
import CountUp from 'react-countup';
import { SOCIAL_PROOF_VALUES } from '../components/social-proof-values';

type MousePositionType = {
  x: number;
  y: number;
  time: number;
};

type BeatingValuesType = {
  beatPeriod: number;
  text1: string;
  text2: string;
  color: string;
};


let animationStarted = false;
async function startLandingpageAnimation() {

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


  if (!hasIndexedDB()) {
    return;
  }
  const database = await getDatabase();


  // once insert if not exists
  try {
    await database.insertLocal<BeatingValuesType>('beatingvalues', {
      beatPeriod: 0,
      text1: 'JavaScript',
      text2: 'you deserve',
      color: colors[0]
    });
  } catch (err) { }

  const beatingValuesDoc = ensureNotFalsy(await database.getLocal<BeatingValuesType>('beatingvalues'));
  (async () => {
    await promiseWait(heartbeatDuration);
    while (animationStarted) {
      const beatInfo = getBeatCurrentBeatInfo();
      const nextBeatPromise = promiseWait(beatInfo.timeToNextPeriod);
      // only every second interval so we have a pause in between
      if (beatInfo.period % 2 === 0) {
        try {
          await beatingValuesDoc.incrementalModify(docData => {
            if (docData.beatPeriod >= beatInfo.period) {
              return docData;
            }
            docData.beatPeriod = beatInfo.period;
            docData.color = colors[beatInfo.period % 3];

            if (beatInfo.period % 4 === 0) {
              docData.text1 = shuffleWithSeed(textsFirst, beatInfo.period)[0];
            } else {
              docData.text2 = shuffleWithSeed(textsSecond, beatInfo.period)[0];
            }

            return docData;
          });
        } catch (err) { }
      }
      await nextBeatPromise;
    }
  })();


  // track mouse position
  const mousePointerDoc = await database.upsertLocal<MousePositionType>('mousepos', {
    x: 0,
    y: 0,
    time: 0
  });
  let currentMousePosition: number[] = [];
  window.addEventListener('mousemove', (ev) => {
    currentMousePosition = [ev.clientX, ev.clientY];
  });


  merge(
    fromEvent(window, 'mousemove'),
    fromEvent(window, 'scroll'),
    fromEvent(window, 'resize')
  ).subscribe(() => {
    mousePointerDoc.incrementalPatch({
      x: currentMousePosition[0],
      y: currentMousePosition[1],
      time: now()
    });
  });




  startTiltToMouse(mousePointerDoc);
  startEnlargeOnMousePos(mousePointerDoc);


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



  beatingValuesDoc.$
    .pipe(
      map(asdfasdfsdad => asdfasdfsdad._data.data),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    )
    .subscribe((beatingValuesDocInner: BeatingValuesType) => {

      heartbeatListeners.forEach(function (listener) {
        listener(heartbeatIndex);
      });
      heartbeatIndex = heartbeatIndex + 1;


      // $swapOutFirst.innerHTML = beatingValuesDocInner.text1;
      // $swapOutSecond.innerHTML = beatingValuesDocInner.text2;

      const color = beatingValuesDocInner.color;
      Array.from($$beatingColor).forEach(function (element) {
        element.style.backgroundColor = color;
      });

      Array.from($$beatingColorString).forEach(function (element) {
        element.innerHTML = color;
      });
    });

  /**
   * css animation of big logo on heartbeat
   * Notice that we have to trigger a reflow
   * when we want to restart the animation.
   * @link https://css-tricks.com/restart-css-animation/
   */
  heartbeatListeners.push(function () {
    Array.from($$beating).forEach(function (element) {
      element.style.animationDuration = heartbeatDuration + 'ms';
      element.classList.remove('animation');
      void element.offsetWidth;
      element.classList.add('animation');
    });
    Array.from($$beatingFirst).forEach(function (element) {
      element.style.animationDuration = heartbeatDuration + 'ms';
      element.classList.remove('animation');
      void element.offsetWidth;
      element.classList.add('animation');
    });
    Array.from($$beatingSecond).forEach(function (element) {
      element.style.animationDuration = heartbeatDuration + 'ms';
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

export default function Home(props) {
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

  useEffect(() => {
    startLandingpageAnimation();
    return () => {
      console.log('stop animation');
      animationStarted = false;
    };
  });
  return (
    <>
      <Head>
        <body className="homepage" />
      </Head>
      <Layout
        title={props.metaTitle ? props.metaTitle : siteConfig.title}
        description="RxDB is a fast, local-first NoSQL-database for JavaScript Applications like Websites, hybrid Apps, Electron-Apps, Progressive Web Apps and Node.js">
        <main>
          <div className="block first hero centered dark">
            <div className="content">
              <div className="inner">
                <div className="half left">
                  <h1 style={{
                  }}>
                    {
                      props.title ? props.title : <>The local <b className="underline">Database</b> for{' '}
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
                      props.text ? props.text : <>Store data locally to build high performance realtime applications that sync data with the backend and even work when offline.</>
                    }
                  </div>

                  <br />
                  <br />

                  <a
                    className="button"
                    href="/quickstart.html"
                    onClick={() => trigger('start_now', 0.4)}
                  >
                    Get Started &#x27A4;
                  </a>
                  <a
                    href="/premium#price-calculator-block"
                    onClick={() => trigger('request_premium_main_page', 3)}
                    className='buy-premium-hero'
                  >
                    Buy Premium
                  </a>
                  {/* <a
                    className="button light"
                    href="/code"
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
                    justifyContent: 'center'
                  }}
                >
                  <div style={{ paddingLeft: 80, paddingRight: 80 }}>
                    <BrowserWindow opacity={0.3}>
                      <img
                        // src="/img/hero.svg"
                        src="/files/logo/logo_text.svg"
                        className="hero-img"
                        style={{ padding: 40, paddingLeft: 80, paddingRight: 80 }}
                        alt="rxdb-image"
                      />
                    </BrowserWindow>
                  </div>
                  {/* <img
              src="/files/logo/logo_text.svg"
              id="heartbeat-logo"
              alt="RxDB"
          /> */}
                </div>
                <div className='clear'></div>
              </div>
            </div>
            <br />
            <br />
            <br />
            <br />
          </div >

          <a
            href="/code"
            target="_blank"
          >
            <div className="trophy github">
              <img
                loading="lazy" src="/files/icons/github-star-with-logo.svg"
                alt="RxDB github star"
              />
              <div style={{ flex: 1 }}>
                <div className="subtitle">Open Source on</div>
                <div className="title">GitHub</div>
              </div>
              <div>
                <div className="valuetitle">stars</div>
                <div className="value">
                  <CountUp
                    end={SOCIAL_PROOF_VALUES.github}
                    start={SOCIAL_PROOF_VALUES.github - 20}
                    duration={6}
                  ></CountUp>
                  <div className="arrow-up"> </div>
                </div>
              </div>
            </div>
          </a>




          <div className="block second dark">
            <div className="content">
              <h2>
                Realtime applications <b className="underline">made easy</b>
              </h2>
              <p>
                From the results of a query, to a single field of a document, with RxDB
                you can <b>observe everything</b>. This enables you to build realtime
                applications fast and reliable.{' '}
                {/* It does not matter if the data was changed by{' '}                <b>a user event</b>, <b>another browser tab</b> or by the<b> replication</b> */}
                Whenever your data changes, your UI reflects the new state.{' '}
                RxDB supports <b>RxJS</b> and <a href="/reactivity.html" target="_blank">any reactiveness libraries</a> like signals, hooks or vue.js-refs.
              </p>
              <div className="inner">
                {/*
          Use https://www.programiz.com/html/online-compiler/
          to craft html from code. (inspect the element)
      */}
                <div className="code half">
                  <fieldset
                    className="samp-wrapper"
                    style={{ backgroundColor: 'var(--bg-color)' }}
                  >
                    <legend>Write</legend>
                    <samp>
                      <span className="cm-keyword">await </span>
                      <span className="cm-variable">collection</span>.
                      <span className="cm-method">upsert</span>({'{'}
                      <br />
                      <span className="cm-property">&nbsp; id</span>: <span className="cm-string">'foobar'</span>,<br />
                      <span className="cm-property">&nbsp; color</span>: <span className="cm-string">
                        '
                        <span className="beating-color-string beating-color">
                          #e6008d
                        </span>
                        '
                      </span>
                      <br />
                      {'}'});
                    </samp>
                  </fieldset>
                  <br />
                  <br />
                  <fieldset
                    className="samp-wrapper"
                    style={{ backgroundColor: 'var(--bg-color)' }}
                  >
                    <legend>Observe</legend>
                    <samp style={{ backgroundColor: 'var(--bg-color)' }}>
                      <span className="cm-keyword">await </span>
                      <span className="cm-variable">collection</span>.
                      <span className="cm-method">
                        findOne(<span className="cm-string">'foobar'</span>)
                      </span>
                      <br />
                      &nbsp;.<span className="cm-property">$</span>
                      <span className="cm-comment"> // get observable</span>
                      <br />
                      &nbsp;.<span className="cm-method">subscribe</span>(
                      <span className="cm-def">d</span>
                      <span className="cm-operator"> =&gt;</span> {'{'}
                      <br />
                      <span className="cm-variable">&nbsp;&nbsp; screen</span>.
                      <span className="cm-property">backgroundColor</span>
                      <span className="cm-operator"> = </span>
                      <span className="cm-variable">d</span>.
                      <span className="cm-property beating-color">color</span>;<br />
                      &nbsp;{'}'});
                    </samp>
                  </fieldset>
                </div>
                <div className="canvas half">
                  <div className="content-canvas">
                    <div
                      className="device tablet"
                      style={{ marginLeft: 481, marginTop: 117 }}
                    >
                      <div className="beating-color">
                        <img
                          src="/files/logo/logo.svg"
                          className="beating logo"
                          alt="RxDB"
                        />
                      </div>
                    </div>
                    <div className="device desktop" style={{ marginTop: '0%' }}>
                      <div className="beating-color">
                        <img
                          src="/files/logo/logo.svg"
                          className="beating logo"
                          alt="RxDB"
                        />
                      </div>
                    </div>
                    <div
                      className="device server"
                      style={{ marginLeft: 0, marginTop: 168 }}
                    >
                      <div className="beating-color one"></div>
                      <div className="beating-color two"></div>
                      <div className="beating-color three"></div>
                    </div>
                    {/* <div class="left third centered">
                  <img
                      src="/files/logo/logo.svg"
                      class="beating logo"
                      alt="RxDB"
                  />
              </div>
              <div
                  class="third centered left"
                  style="padding-left: 0px;"
              >
                  <img
                      src="/files/icons/arrows/left-arrow.svg"
                      alt="left"
                      class="beating-first arrow"
                  />
                  <img
                      src="/files/icons/arrows/right-arrow.svg"
                      alt="right"
                      class="beating-second arrow arrow-right"
                  />
              </div>
              <div class="right third centered">
                  <div class="smartphone">
                      <div class="smartphone-color beating-color"></div>
                  </div>
              </div> */}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <a
            href="https://twitter.com/intent/user?screen_name=rxdbjs"
            onClick={() => trigger('twitter_trophy_click', 0.20)}
            target="_blank"
          >
            <div className="trophy twitter">
              <img loading="lazy" src="/files/icons/twitter-blue.svg" alt="RxDB Twitter" />
              <div style={{ flex: 1 }}>
                <div className="subtitle">Follow on</div>
                <div className="title">Twitter</div>
              </div>
              <div>
                <div className="valuetitle">followers</div>
                <div className="value">
                  <CountUp
                    end={SOCIAL_PROOF_VALUES.twitter}
                    start={SOCIAL_PROOF_VALUES.twitter - 30}
                    duration={2}
                  ></CountUp>
                  <div className="arrow-up"> </div>
                </div>
              </div>
            </div>
          </a>
          <div className="block replication">
            <div className="content">
              <div className="half left">
                <br />
                <br />
                <br />
                <br />
                <br />
                <h2>
                  Sync with <b>any backend</b>
                </h2>
                <p>

                  RxDB has a simple yet high performance <a href="/replication.html" target="_blank">replication protocol</a> that enables you to
                  run a realtime replication between clients and servers. While there are many plugins for specific endpoints like{' '}
                  <a href="/replication-couchdb.html" target="_blank">CouchDB</a>,{' '}
                  <a href="/replication-graphql.html" target="_blank">GraphQL</a>,{' '}
                  <a href="/replication-webrtc.html">P2P</a>,{' '}
                  <a href="/replication-firestore.html" target="_blank">Firestore</a> or <a href="/replication-nats.html" target="_blank">NATS</a>,{' '}
                  the protocol is not bound to a specific backend and can be used with any <a href="/replication-http.html" target="_blank">existing infrastructure</a>.
                </p>
              </div>
              <div className="half right">
                <div className="replication-icons">
                  <img
                    src="/files/logo/logo.svg"
                    alt="RxDB"
                    className="replicate-logo tilt-to-mouse"
                    loading="lazy"
                  />
                  <a href="/replication-graphql.html" target="_blank">
                    <div className="neumorphism-circle-xl centered replicate-graphql enlarge-on-mouse">
                      <img
                        src="/files/icons/graphql-text.svg"
                        alt="GraphQL"
                        className="protocol"
                        loading="lazy"
                      />
                    </div>
                  </a>
                  <a href="/replication-firestore.html" target="_blank">
                    <div className="neumorphism-circle-m centered replicate-firestore enlarge-on-mouse">
                      <img
                        src="/files/icons/firebase.svg"
                        alt="Firebase"
                        className="protocol"
                        loading="lazy"
                      />
                    </div>
                  </a>
                  <a href="https://github.com/pubkey/rxdb/tree/master/examples/supabase" target="_blank">
                    <div className="neumorphism-circle-m centered replicate-supabase enlarge-on-mouse">
                      <img
                        src="/files/icons/supabase.svg"
                        alt="supabase"
                        className="protocol"
                        loading="lazy"
                      />
                    </div>
                  </a>
                  <a href="/replication-couchdb.html" target="_blank">
                    <div className="neumorphism-circle-xl centered replicate-couchdb enlarge-on-mouse">
                      <img
                        src="/files/icons/couchdb-text.svg"
                        alt="CouchDB"
                        className="protocol"
                        loading="lazy"
                      />
                    </div>
                  </a>
                  <a href="/replication-http.html" target="_blank">
                    <div className="neumorphism-circle-xs centered replicate-rest enlarge-on-mouse">
                      {'{'} HTTP {'}'}
                    </div>
                  </a>
                  <a href="/replication-websocket.html" target="_blank">
                    <div className="neumorphism-circle-xs centered replicate-websocket enlarge-on-mouse">
                      websocket
                    </div>
                  </a>
                  <a href="/replication-webrtc.html" target="_blank">
                    <div className="neumorphism-circle-xs centered replicate-webrtc enlarge-on-mouse">
                      WebRTC
                    </div>
                  </a>
                </div>
              </div>
              <div className="clear" />
            </div>
          </div>

          <a
            href="/chat"
            target="_blank"
          >
            <div className="trophy discord">
              <img loading="lazy" src="/files/icons/discord.svg" alt="RxDB Discord chat" />
              <div style={{ flex: 1 }}>
                <div className="subtitle">Chat on</div>
                <div className="title">Discord</div>
              </div>
              <div>
                <div className="valuetitle">members</div>
                <div className="value">
                  <CountUp
                    end={SOCIAL_PROOF_VALUES.discord}
                    start={SOCIAL_PROOF_VALUES.discord - 30}
                    duration={2}
                  ></CountUp>
                  <div className="arrow-up"> </div>
                </div>
              </div>
            </div>
          </a>




          <div className="block offline-first dark">
            <div className="offline-image-wrapper">
              <img
                src="files/icons/wifi/wifi_1a202c.svg"
                className="offline-image beating-second"
                loading="lazy"
                alt="offline"
              />
            </div>
            <div className="content">
              <h2>
                Online <b className="underline">is optional</b>
              </h2>
              <div className="full-width">
                <div className="half left">
                  <p>
                    RxDB follows the{' '}
                    <a href="/offline-first.html" target="_blank">
                      Offline First
                    </a>{' '}
                    paradigm where an application must work as well offline as it does
                    online. This is done by persisting data locally on the client side and
                    replicating it in the background. RxDB can even be used solely on
                    the client side, with no backend at all.
                  </p>
                </div>
                <div className="half right">
                  <ul className="checked">
                    <li>
                      Your application still <b>works offline</b>
                    </li>
                    <li>
                      Increases <b>perceived performance</b>
                    </li>
                    <li>
                      Easier and <b>faster implementation</b>
                    </li>
                    <li>
                      Needs less backend resources and <b>scales better</b>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="block frameworks">
            <div className="content">
              <a
                href="https://github.com/pubkey/rxdb/tree/master/examples/angular"
                target="_blank"
              >
                <div
                  className="neumorphism-circle-m circle centered enlarge-on-mouse"
                  style={{ top: '-10%', left: '10%' }}
                >
                  <img loading="lazy" src="/files/icons/angular.svg" alt="angular" />
                  Angular
                </div>
              </a>
              <div
                className="neumorphism-circle-m circle centered enlarge-on-mouse"
                style={{ top: '10%', left: '58%' }}
              >
                <img loading="lazy" src="/files/icons/capacitor.svg" alt="capacitor" />
                Capacitor
              </div>
              <div
                className="neumorphism-circle-s circle centered enlarge-on-mouse"
                style={{ top: '-4%', left: '44%' }}
              >
                <img loading="lazy" src="/files/icons/deno.svg" alt="deno" />
                Deno
              </div>
              <a
                href="https://github.com/pubkey/rxdb/tree/master/examples/node"
                target="_blank"
              >
                <div
                  className="neumorphism-circle-m circle centered enlarge-on-mouse"
                  style={{ top: '-5%', left: '85%' }}
                >
                  <img loading="lazy" src="/files/icons/nodejs.svg" alt="Node.js" />
                  Node.js
                </div>
              </a>
              <a
                href="https://github.com/pubkey/rxdb/tree/master/examples/react"
                target="_blank"
              >
                <div
                  className="neumorphism-circle-m circle centered enlarge-on-mouse"
                  style={{ top: '4%', left: '26%' }}
                >
                  <img loading="lazy" src="/files/icons/react.svg" alt="React" />
                  React
                </div>
              </a>
              <div
                className="neumorphism-circle-s circle centered enlarge-on-mouse"
                style={{ top: '15%', left: '90%', marginLeft: '-35px' }}
              >
                <img loading="lazy" src="/files/icons/svelte.svg" alt="Svelte" />
                Svelte
              </div>
              <br />
              <br />
              <br />
              <br />
              <br />
              <h2>
                Flexible <b className="underline">storage layer</b>
              </h2>
              <p>
                RxDB is based on a storage interface that enables you to swap out the
                underlying storage engine. This increases code reuse because the same
                database code can be used in <b>any JavaScript runtime</b>{' '}
                by just switching out the storage settings.
                <br />
              </p>
              <div className="below-text">
                <a
                  href="https://github.com/pubkey/rxdb/tree/master/examples/electron"
                  target="_blank"
                >
                  <div
                    className="neumorphism-circle-s circle centered enlarge-on-mouse"
                    style={{ top: '2%', left: '18%' }}
                  >
                    <img loading="lazy" src="/files/icons/electron.svg" alt="electron" />
                    Electron
                  </div>
                </a>
                <a
                  href="https://github.com/pubkey/rxdb/tree/master/examples/vue"
                  target="_blank"
                >
                  <div
                    className="neumorphism-circle-s circle centered enlarge-on-mouse"
                    style={{ top: '3%', left: '45%' }}
                  >
                    <img loading="lazy" src="/files/icons/vuejs.svg" alt="Vue.js" />
                    Vue.js
                  </div>
                </a>
                <a
                  href="https://github.com/pubkey/rxdb/tree/master/examples/ionic2"
                  target="_blank"
                >
                  <div
                    className="neumorphism-circle-s circle centered enlarge-on-mouse"
                    style={{ top: '2%', left: '71%' }}
                  >
                    <img loading="lazy" src="/files/icons/ionic.svg" alt="ionic" />
                    Ionic
                  </div>
                </a>
                <div
                  className="neumorphism-circle-m circle centered enlarge-on-mouse"
                  style={{ top: '46%', left: '11%' }}
                >
                  <img loading="lazy" src="/files/icons/nativescript.svg" alt="NativeScript" />
                  NativeScript
                </div>
                <a
                  href="https://github.com/pubkey/rxdb/tree/master/examples/react-native"
                  target="_blank"
                >
                  <div
                    className="neumorphism-circle-m circle centered enlarge-on-mouse"
                    style={{ top: '45%', left: '35%' }}
                  >
                    <img loading="lazy" src="/files/icons/react.svg" alt="React Native" />
                    React Native
                  </div>
                </a>
                <div
                  className="neumorphism-circle-m circle centered enlarge-on-mouse"
                  style={{ top: '45%', left: '62%' }}
                >
                  <img loading="lazy" src="/files/icons/nextjs.svg" alt="Next.js" />
                  Next.js
                </div>
                <a
                  href="https://github.com/pubkey/rxdb/tree/master/examples/flutter"
                  target="_blank"
                >
                  <div
                    className="neumorphism-circle-s circle centered enlarge-on-mouse"
                    style={{ top: '40%', left: '86%' }}
                  >
                    <img loading="lazy" src="/files/icons/flutter.svg" alt="Flutter" />
                    Flutter
                  </div>
                </a>
              </div>
            </div>
          </div>

          <div className="block features dark">
            <div className="content">
              <h2>All the <b className="underline">features</b> that you need</h2>
              <p>
                Since its beginning in 2018, RxDB has gained a huge set of features and plugins which makes it a flexible full solution regardless of which type of application you are building.
                Every feature that you need now or might need in the future is already there.
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
                    href="/code"
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

          <div className="block reviews">
            <div className="content centered">
              <div className="inner">
                <h2>
                  Used by <b className="underline">many</b>
                </h2>
                <p>
                  RxDB is a proven technology used by thousands of developers worldwide. <br />
                  With its flexibility, RxDB is used in a diverse range of apps and services.
                </p>
                <br /><br />
              </div>
            </div>
            <ReviewsBlock></ReviewsBlock>
          </div>

          <div className="block sixth dark">
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
                          real-time applications like storages, replication and other plugins.
                          <br />
                          <br />
                          Our open-core approach encourages a vibrant community of developers,
                          fostering collaboration and innovation.
                        </p>
                      </div>
                      {/* <div className="buy-option-features">
                        <ul>
                          <li>Basic RxStorages</li>
                          <li>Realtime Replication</li>
                          <li>Live Queries</li>
                          <li>Schema Validation</li>
                          <li>Multi-Tab Support</li>
                          <li>Encryption</li>
                          <li>Compression</li>
                        </ul>
                      </div> */}
                      <a
                        href="/code"
                        target="_blank"
                        rel="noopener"
                        onClick={() => trigger('get_the_code_main_page', 0.8)}
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
                      </div>
                      {/* <div className="buy-option-features">
                        <ul>
                          <li>
                            <a
                              href="https://rxdb.info/rx-storage-sqlite.html"
                              target="_blank"
                            >
                              SQLite RxStorage
                            </a>
                          </li>
                          <li>
                            <a
                              href="https://rxdb.info/rx-storage-opfs.html"
                              target="_blank"
                            >
                              OPFS RxStorage
                            </a>
                          </li>
                          <li>
                            <a
                              href="https://rxdb.info/rx-storage-indexeddb.html"
                              target="_blank"
                            >
                              IndexedDB RxStorage
                            </a>
                          </li>
                          <li>
                            <a
                              href="https://rxdb.info/rx-storage-memory-synced.html"
                              target="_blank"
                            >
                              Memory-Synced RxStorage
                            </a>
                          </li>
                          <li>
                            <a
                              href="https://rxdb.info/rx-storage-sharding.html"
                              target="_blank"
                            >
                              Sharding Plugin
                            </a>
                          </li>
                          <li>
                            <a
                              href="https://rxdb.info/query-optimizer.html"
                              target="_blank"
                            >
                              Query Optimizer
                            </a>
                          </li>
                          <li>
                            <a
                              href="https://rxdb.info/migration-storage.html"
                              target="_blank"
                            >
                              Storage Migrator
                            </a>
                          </li>
                          <li>
                            <a
                              href="https://rxdb.info/rx-storage-localstorage-meta-optimizer.html"
                              target="_blank"
                            >
                              RxStorage Localstorage Meta Optimizer
                            </a>
                          </li>
                          <li>
                            <a
                              href="https://rxdb.info/rx-storage-shared-worker.html"
                              target="_blank"
                            >
                              Shared Worker
                            </a>
                          </li>
                          <li>
                            <a
                              href="https://rxdb.info/rx-storage-worker.html"
                              target="_blank"
                            >
                              Worker
                            </a>
                          </li>
                        </ul>
                      </div> */}
                      <a
                        href="/premium"
                        onClick={() => trigger('request_premium_main_page', 3)}
                      >
                        <div className="buy-option-action bg-middle hover-shadow-middle">
                          Request Premium
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
                          Unlock the full potential of RxDB with our tailored consulting services.
                          Our experts collaborate directly with your team to optimize your use of RxDB,
                          ensuring seamless integration and peak performance.<br />
                          <br />
                          From quick <b>one-time support sessions</b> to <b>full project</b> development and <b>custom feature</b> implementation,
                          we're here to accelerate your project's success. Let's build something incredible together.
                        </p>

                      </div>
                      <a
                        href="/consulting"
                        onClick={() => trigger('consulting_session_request_main_page', 4)}
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
                  onClick={() => trigger('start_now_main_bottom', 0.40)}
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
                  onClick={() => trigger('newsletter_main_bottom', 0.40)}
                >
                  <div className="button" style={{ left: '25%', marginLeft: '-90px' }}>
                    Get the Newsletter
                  </div>
                </a>
                <a
                  href="/chat"
                  rel="noopener"
                  target="_blank"
                  onClick={() => trigger('join_chat_main_bottom', 0.40)}
                >
                  <div
                    className="button"
                    style={{ left: '77%', top: '6%', marginLeft: '-70.5px' }}
                  >
                    Join the Chat
                  </div>
                </a>
                <a href="/premium" onClick={() => trigger('get_premium_main_bottom', 0.40)}>
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
                  onClick={() => trigger('follow_twitter_main_bottom', 0.40)}
                >
                  <div
                    className="button"
                    style={{ top: '44%', left: '73%', marginLeft: '-85px' }}
                  >
                    Follow on Twitter
                  </div>
                </a>
                <a
                  href="/code"
                  rel="noopener"
                  target="_blank"
                  onClick={() => trigger('get_code_main_bottom', 0.40)}
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
function startTiltToMouse(mousePosDoc: RxLocalDocument<any, MousePositionType>) {
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

  mousePosDoc.$.subscribe((mousePos) => {
    if (!mousePos._data.data.time) {
      return;
    }
    Array.from($$tiltToMouse).forEach($element => {
      if (!isInViewport($element)) {
        return;
      }
      const position = ensureNotFalsy([mousePos._data.data.x, mousePos._data.data.y]).concat([$element]);
      transformElement($element, position);
    });
  });
}

/**
 * @link https://stackoverflow.com/a/16225919/3443137
 */
function startEnlargeOnMousePos(mousePosDoc: RxLocalDocument<any, MousePositionType>) {
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

  mousePosDoc.$
    .pipe(
      map(d => d._data)
    )
    .subscribe((mousePos) => {
      if (
        !mousePos.data.time ||
        !mousePos.data.x ||
        !mousePos.data.y
      ) {
        return;
      }

      Array.from($$enlargeOnMouse).forEach($element => {
        if (!isInViewport($element)) {
          return;
        }
        const elementPosition = getElementPosition($element);

        const dx = mousePos.data.x - elementPosition.centerX;
        const dy = mousePos.data.y - elementPosition.centerY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        function easeInQuint(x: number): number {
          return x ^ 1.9;
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

const textsFirst = [
  'NoSQL',
  'OfflineFirst',
  'JavaScript',
  'observable',
  'reactive',
  'realtime',
  'client side',
  'fast'
];
const textsSecond = [
  'for the Web',
  'for Node.js',
  'for Browsers',
  'for Capacitor',
  'for Electron',
  'for hybrid apps',
  'for PWAs',
  'for React Native',
  'for NativeScript',
  'for UI apps',
  'you deserve',
  'that syncs',
];

const heartbeatDuration = 851;

function getBeatCurrentBeatInfo() {
  // remove a big chunk so we do not have a large number for better precision.
  const time = new Date().getTime() - 1960000000;
  const ratio = time / heartbeatDuration;
  const period = Math.floor(ratio);
  const timeToNextPeriod = (ratio - period) * heartbeatDuration;
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
* @link https://stackoverflow.com/questions/16801687/javascript-random-ordering-with-seed
*/
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  array = array.slice(0);
  let m = array.length;
  let t;
  let i;

  // While there remain elements to shuffle…
  while (m) {

    // Pick a remaining element…
    i = Math.floor(random(seed) * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
    ++seed;
  }

  return array;
}

function random(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
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

