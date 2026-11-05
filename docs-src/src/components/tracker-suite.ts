import { onCopy, triggerTrackingEvent } from './trigger-event';

/**
 * Starts the trackers that measure engagement (time on page, scroll depth,
 * visited urls, copy events, returning visitors, clicks from the console logs
 * and from discord). This module is lazy loaded by the Root component after
 * the visitor granted the tracking consent, so it is not part of the main bundle.
 */
export function startTrackerSuite() {
    startAnalytics();
    trackReturnAfter3to14Days();
    trackCopy();
    trackUrlChanges();
    triggerClickEventWhenFromCode();
    triggerClickEventWhenFromDiscord();
}

/**
 * There are some logs that RxDB prints out to the console of the developers.
 * These logs can contain links with the query param ?console=foobar
 * which allows us to detect that a user has really installed and started RxDB.
 */
function triggerClickEventWhenFromCode() {
    const EVENT_ID = 'console-log-click';
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('console')) {
        return;
    }
    triggerTrackingEvent(EVENT_ID, 10, 1, 'Lead');
    triggerTrackingEvent(EVENT_ID + '_' + urlParams.get('console'), 10, 1);
}

/**
 * All links that we post on discord have this
 * discord param so we can conversion-track people who
 * joined the discord
 */
function triggerClickEventWhenFromDiscord() {
    const EVENT_ID = 'via-discord';
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('discord')) {
        return;
    }
    triggerTrackingEvent(EVENT_ID, 3, 1, 'Lead');
    triggerTrackingEvent(EVENT_ID + '_' + urlParams.get('discord'), 0, 1);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function addCommunityChatButton() {
    const chatButtonId = 'fixed-chat-button';
    const elementExists = document.getElementById(chatButtonId);
    if (elementExists) {
        return;
    }

    const elemDiv = document.createElement('a');
    elemDiv.id = chatButtonId;
    elemDiv.href = '/chat/';
    elemDiv.target = '_blank';
    elemDiv.innerHTML = '💬 Community Chat';

    const styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerText =
        '#' +
        chatButtonId +
        ' {' +
        'color: white;' +
        'position: fixed;' +
        'right: 0;' +
        'bottom: 0;' +
        'background-color: var(--color-top);' +
        'padding-left: 14px;' +
        'padding-right: 14px;' +
        'padding-top: 2px;' +
        'padding-bottom: 2px;' +
        'text-align: center;' +
        'margin-right: 0px;' +
        'font-weight: bold;' +
        'border-top-left-radius: 9px;' +
        'border-top-right-radius: 9px;' +
        'z-index: 11;' +
        '}' +
        '#fixed-chat-button:hover {' +
        'box-shadow: 2px 2px 13px #ca007c, -2px -1px 14px #ff009e;' +
        'text-decoration: underline;' +
        '}';
    document.head.appendChild(styleSheet);
    document.body.appendChild(elemDiv);
}


/**
 * Loads the marketing pixels that are not aware of Google Consent Mode.
 * Only called after the visitor granted the "marketing" category (or for
 * non-EU visitors, where marketing is granted by default).
 */
export function loadMarketingPixels() {
    // // reddit pixel TODO move into google tag manager
    // // @ts-ignore eslint-disable-next-line
    // (function (w, d) {
        // if (!(w as any).rdt) {
            // // @ts-ignore
            // const rdt: any = (w as any).rdt = function () {
                // // @ts-ignore
                // if (rdt.sendEvent) {
                    // rdt.sendEvent.apply(rdt, arguments);
                // } else {
                    // rdt.callQueue.push(arguments);
                // }
            // };
            // rdt.callQueue = [];
            // const t = d.createElement('script');
            // t.src = 'https://www.redditstatic.com/ads/pixel.js';
            // t.async = true;
            // const s: any = d.getElementsByTagName('script')[0];
            // s.parentNode.insertBefore(t, s);
        // }

        // // Initialize pixel and track page visit
        // (w as any).rdt('init', 'a2_irjdz88999o9');
        // (w as any).rdt('track', 'PageVisit');
    // })(window, document);
    // // /reddit pixel


    // pipedrive chat
    (window as any).pipedriveLeadboosterConfig = {
        base: 'leadbooster-chat.pipedrive.com', companyId: 11404711, playbookUuid:
            '16a8caba-6b26-4bb1-a1fa-434c4171d542', version: 2
    }; (function () {
        const w = window; if ((w as any).LeadBooster) {
            console.warn('LeadBooster already exists');
        } else {
            (w as any).LeadBooster = {
                q: [], on: function (n, h) {
                    this.q.push({ t: 'o', n: n, h: h });
                }, trigger: function (n) {
                    this.q.push({ t: 't', n: n });
                },
            };
        }
    })();
    // /pipedrive chat
}


function startAnalytics() {
    console.log('load analytics code');

    /**
     * The timers are measured from the navigation start, because this
     * module is loaded when the page is idle and not directly on page load.
     */
    [10, 20, 60].forEach(time => {
        setTimeout(function () {
            const value = 0.002 * time;
            if (time === 60) {
                triggerTrackingEvent(time + '_sec_on_page', value, 1, 'ViewContent');
            } else {
                triggerTrackingEvent(time + '_sec_on_page', value);
            }
        }, Math.max(0, time * 1000 - performance.now()));
    });

    /**
     * detect scroll to bottom of landingpage
     * but only run trigger these once per page load
     */
    let trackScrollPercentages = new Set([25, 50, 75, 90]);
    if ((window as any).navigation) {
        (window as any).navigation.addEventListener('navigate', () => {
            // reset if url changes
            trackScrollPercentages = new Set([25, 50, 75, 90]);
        });
    }
    let nextScrollTimestamp = 0;
    if (location.pathname === '/' || location.pathname.includes('/sem/')) {
        window.addEventListener('scroll', (event) => {

            /**
             * Only do this each 250 milliseconds
             * to not block the process too much.
             */
            const newTimestamp = event.timeStamp;
            if (nextScrollTimestamp < newTimestamp) {
                nextScrollTimestamp = newTimestamp + 250;
            } else {
                return;
            }

            /**
             * @link https://fjolt.com/article/javascript-check-if-user-scrolled-to-bottom
             */
            const documentHeight = document.body.scrollHeight;

            const scrollPercentage = (window.scrollY / (documentHeight - window.innerHeight)) * 100;
            // console.log(`Scroll position: ${scrollPercentage.toFixed(2)}% of the page height`);

            trackScrollPercentages.forEach(percent => {
                if (scrollPercentage > percent) {
                    trackScrollPercentages.delete(percent);
                    const value = parseFloat((0.10 * (percent / 100)).toFixed(2));
                    if (percent === 90) {
                        triggerTrackingEvent('scroll_to_' + percent, value, 1, 'ViewContent');
                    } else {
                        triggerTrackingEvent('scroll_to_' + percent, value);
                    }
                }
            });
        });
    }


    // track dev_mode_tracking_iframe event
    const DEV_MODE_EVENT_ID = 'dev_mode_tracking_iframe';
    function checkDevModeEvent() {
        const hasCookie = document.cookie
            .split(';')
            .map(str => str.trim())
            .find(v => v.startsWith(DEV_MODE_EVENT_ID));
        if (!hasCookie) {
            console.log(DEV_MODE_EVENT_ID + ': no cookie');
            return;
        }
        const version = hasCookie.split('=')[1];
        console.log(DEV_MODE_EVENT_ID + ': track me version ' + version);
        triggerTrackingEvent(DEV_MODE_EVENT_ID, 10, 1, 'Purchase');
        triggerTrackingEvent(DEV_MODE_EVENT_ID + '_' + version, 10, 1);
    }
    checkDevModeEvent();
    // also listen for upcoming events
    // DISABLED because it kill the google metric "Page prevented back/forward cache restoration"
    // const bc = new BroadcastChannel(DEV_MODE_EVENT_ID);
    // bc.onmessage = () => checkDevModeEvent();
    // /track dev_mode_tracking_iframe event


    /**
     * History hack,
     * show landingpage on back from somewhere else.
     */
    // function parseQueryParams(url) {
    //     const urlSearchParams = new URL(url).searchParams;
    //     const queryParams = Object.fromEntries(urlSearchParams.entries());
    //     return queryParams;
    // }
    // function historyHack() {
    //     console.log('document.referrer: ' + document.referrer);
    //     console.log(' window.location.hostname: ' + window.location.hostname);
    //     const reloadWait = 100;
    //     const queryParamFlag = 'history-back';
    //     const originalUrl = location.href;
    //     const queryParams = parseQueryParams(window.location);
    //     let prePopstateUrl = location.href;
    //     window.addEventListener('popstate', function (_event) {
    //         const from = prePopstateUrl;
    //         const to = location.href;
    //         // console.log('from : ' + from);
    //         // console.log('to : ' + to);
    //         prePopstateUrl = location.href;

    //         if (
    //             parseQueryParams(from)[queryParamFlag] &&
    //             document.referrer &&
    //             parseQueryParams(document.referrer)[queryParamFlag]
    //         ) {
    //             return;
    //         }

    //         if (
    //             new URL(from).pathname === '/' &&
    //             parseQueryParams(to)[queryParamFlag]
    //         ) {
    //             history.forward();
    //             setTimeout(() => {
    //                 location.reload();
    //             }, reloadWait);
    //             return;
    //         }

    //         if (
    //             new URL(from).pathname === new URL(to).pathname
    //         ) {
    //             return;
    //         }

    //         setTimeout(() => {
    //             location.reload();
    //         }, reloadWait);
    //     }, {
    //         passive: true
    //     });


    //     if (queryParams[queryParamFlag]) {
    //         history.back();
    //         setTimeout(function () {
    //             history.replaceState(null, document.title, '/');
    //         }, 200);
    //     } else if (
    //         document.referrer &&
    //         new URL(document.referrer).hostname !== window.location.hostname &&
    //         location.pathname !== '/'
    //     ) {
    //         history.pushState(null, document.title, '/?' + queryParamFlag + '=true');
    //         history.pushState(null, document.title, originalUrl);
    //     }
    // }
    // historyHack();

}


/**
 * Tracks if a user copies anything on the page.
 * Useful because normal devs often copy parts of the
 * code from the docs, so we have a good way to measure real
 * engagement.
 */
function trackCopy() {
    if (typeof document === 'undefined') {
        return;
    }
    document.addEventListener('copy', onCopy);
}


/**
 * Tracks the already visited urls on the page.
 * Useful because normal devs browse multiple docs pages
 * so we can track "real" engagement.
 */
function trackUrlChanges() {
    if (typeof window === 'undefined') {
        return;
    }

    const STORAGE_KEY = 'visited_urls';
    const URL_EVENT_COUNT = 3;
    const stored = localStorage.getItem(STORAGE_KEY);
    const visitedUrls = new Set<string>(stored ? JSON.parse(stored) : []);

    function normalizeUrl(url: string) {
        try {
            const u = new URL(url);
            return u.origin + u.pathname;
        } catch {
            return url.split('?')[0].split('#')[0];
        }
    }

    function rememberAndLog() {
        const normalized = normalizeUrl(location.href);

        if (!visitedUrls.has(normalized)) {
            visitedUrls.add(normalized);
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(Array.from(visitedUrls))
            );
            console.log('New URL visited:', normalized);

            if (visitedUrls.size >= URL_EVENT_COUNT) {
                triggerTrackingEvent('visit_x_urls', 1.5, 1, 'Lead');
                triggerTrackingEvent('visit_' + URL_EVENT_COUNT + '_urls', 0, 1);
            }
        }
    }

    rememberAndLog();

    window.addEventListener('popstate', rememberAndLog);

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
        originalPushState.apply(this, args);
        rememberAndLog();
    };

    history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        rememberAndLog();
    };
}


/**
 * Tracks if a user returns after at least 3 days but not more than 14 days.
 */
function trackReturnAfter3to14Days() {
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 72 hours
    const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000; // 336 hours

    if (typeof localStorage === 'undefined') {
        return;
    }

    const now = Date.now();
    const key = 'first_visit_time';
    const saved = localStorage.getItem(key);


    if (!saved) {
        localStorage.setItem(key, now.toString());
        return;
    }

    const firstVisit = Number(saved);
    if (isNaN(firstVisit)) {
        // Reset if corrupted
        localStorage.setItem(key, now.toString());
        return;
    }

    const diff = now - firstVisit;

    // Only trigger conversion if between 3 and 14 days
    if (diff >= THREE_DAYS_MS && diff <= FOURTEEN_DAYS_MS) {
        /**
         * This must not be a primary event because
         * when we retarget, we do no want
         * to count these as conversion just because
         * they clicked the ad some days later again.
         */
        triggerTrackingEvent('revisit_3_days', 3.5, 1);
    }
}
