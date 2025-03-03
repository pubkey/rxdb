import React, { useEffect, useState } from 'react';
import { triggerTrackingEvent } from '../components/trigger-event';
import { randomNumber } from '../../../plugins/utils';


type CallToActionItem = {
    /**
     * Titles are an array, so we can do A-B tests
     * on the clickrate.
     */
    title: string[];
    text: string;
    keyword: string;
    url: string;
    icon: string;
};
const callToActions: CallToActionItem[] = [
    {
        title: [
            'Found RxDB useful? Let us know by leaving a star on GitHub!',
            'Help RxDB grow - your GitHub star means a lot to us!',
            'Support our open-source journey - star RxDB on GitHub today!'
            // 'If RxDB has helped you, please give us a star on GitHub! Your support means the world.',
            // 'Enjoying RxDB? Show your support with a quick star on GitHub.',
            // 'RxDB saved you time? Reward us with a star on GitHub!',
        ],
        text: 'Star',
        keyword: '@github',
        url: 'https://rxdb.info/code/',
        icon: '🐙💻',
    },
    {
        title: [
            'Enjoying RxDB? Follow us on Twitter to get the latest updates and news. Your support keeps us going!',
            'We\'re tweeting all things RxDB - join us on Twitter!',
            'Never miss an RxDB update - follow us on Twitter today!',
            // 'Stay updated - follow RxDB on Twitter for news, tips, and more!',
            // 'Love RxDB? Follow us on Twitter for the latest buzz!',
            // 'Connect with the RxDB community - follow our Twitter feed!'
        ],
        text: 'Follow',
        keyword: '@twitter',
        url: 'https://twitter.com/intent/user?screen_name=rxdbjs',
        icon: '🐦',
    },
    {
        title: [
            'Support RxDB by following our LinkedIn page for exclusive updates!',
            'Join RxDB\'s professional network - follow us on LinkedIn!'
            // 'Enjoying RxDB? Follow us on LinkedIn for updates, tips, and more! Your support keeps us going.',
            // 'Stay connected - follow RxDB on LinkedIn for the latest insights!',
            // 'Get tips, updates, and more - follow RxDB on LinkedIn today!',
            // 'Want more RxDB? Follow us on LinkedIn for deeper dives and news!',
        ],
        text: 'Follow',
        keyword: '@LinkedIn',
        url: 'https://www.linkedin.com/company/rxdb',
        icon: '[in]',
    },
    {
        title: [
            'Learn more about RxDB - connect with me on LinkedIn!',
            'Stay in the know - follow my LinkedIn profile for the latest RxDB news!',
            'Want more RxDB insights? Follow me on LinkedIn and let\'s connect!'
            // 'Enjoying RxDB? Follow me on LinkedIn for updates, tips, and more! Your support keeps us going.',
            // 'Join me on LinkedIn for RxDB insights and behind-the-scenes updates!',
            // 'Expand your network - follow my LinkedIn for RxDB updates and more!',
        ],
        text: 'Follow',
        keyword: '@LinkedIn',
        url: 'https://www.linkedin.com/in/danielmeyerdev/',
        icon: '[in]',
    },
    {
        title: [
            'Join our RxDB Discord community - your questions and ideas are welcome!',
            'Let\'s talk RxDB! Join our Discord server and connect with fellow developers.',
            'Got questions? Join us on Discord to get quick support and real-time interaction!',
            // 'Love RxDB? Connect with our community on Discord for support and lively chat. Your presence makes our community stronger!',
            // 'Share, learn, and grow - be part of our RxDB Discord community!',
            // 'Meet other RxDB enthusiasts on Discord - let\'s build great apps together!'
        ],
        text: 'Chat',
        keyword: '@discord',
        url: 'https://rxdb.info/chat/',
        icon: '💬',
    },
    {
        title: [
            'Love RxDB? Subscribe to our newsletter for the latest updates, tips, and news delivered straight to your inbox.',
            'Be the first to know - subscribe for RxDB updates, tricks, and more!',
            // 'Stay informed - subscribe to the RxDB newsletter for exclusive content!',
            // 'Don\'t miss a beat - get RxDB news and tips via our newsletter!',
            // 'Level up your RxDB knowledge - subscribe to our newsletter!',
            // 'Join our community - subscribe to the RxDB newsletter and never miss an update!'
        ],
        text: 'Subscribe',
        keyword: '@newsletter',
        url: 'https://rxdb.info/newsletter',
        icon: '📰',
    },
    // {
    //     title: 'RxDB needs your feedback, please take part in our user Survey',
    //     text: 'Take Part in the',
    //     keyword: 'User Survey 2024',
    //     url: 'https://rxdb.info/survey',
    //     icon: '📝'
    // }
];


const NOTIFICATION_SPLIT_TEST_VERSION = 'B';
const POPUP_DISABLED_IF_CLOSED_TIME = 1000 * 60 * 10; // 10 minutes

// Default implementation, that you can customize
export default function Root({ children }) {
    const [showPopup, setShowPopup] = useState<{
        callToAction: CallToActionItem;
        callToActionId: number;
        titleId: number;
        direction: 'top' | 'bottom' | 'mid';
    }>();
    const DOC_TITLE_PREFIX = '(1) ';
    useEffect(() => {

        // addCommunityChatButton();

        setTimeout(() => {
            startAnalytics();
            addCallToActionButton();
            triggerClickEventWhenFromCode();
        }, 0);

        const showTime = location.pathname.includes('.html') ? 30 : 60;
        // const showTime = 10;
        const intervalId = setInterval(() => {
            if (location.pathname.includes('premium')) {
                return;
            }
            setShowPopup(prevValue => {

                if (prevValue) {
                    return prevValue;
                }

                /**
                 * When the popup was closed once,
                 * we do not show it again for the POPUP_DISABLED_IF_CLOSED_TIME
                 * to ensure it does not annoy people.
                 */
                const closedAt = localStorage.getItem('notification_popup_closed_at');
                const closedToday = localStorage.getItem('notification_popup_closed_today');
                if (
                    (closedAt && (Date.now() - Number(closedAt)) < POPUP_DISABLED_IF_CLOSED_TIME) ||
                    /**
                     * If it was closed today, only show it when the browser tab is not active.
                     * This makes it less annoying and does not disturb the visitor.
                     */
                    (new Date().getDay() + '' === closedToday && !document.hidden)
                ) {
                    return null;
                }

                const callToActionId = randomNumber(0, callToActions.length - 1);
                const callToAction = callToActions[callToActionId];
                const titleId = randomNumber(0, callToAction.title.length - 1);

                const dayKey = new Date().toISOString().split('T')[0] + '_' + new Date().getHours();
                const localStorageItemId = 'notification_popup_title_ping_' + dayKey;
                const pinged = localStorage.getItem(localStorageItemId);
                if (!pinged) {
                    /**
                     * Also prepend (1) to the browser tab title
                     * so people reopen the tab and see the notification.
                     * (only once per hour)
                     */
                    if (!document.title.includes(DOC_TITLE_PREFIX)) {
                        document.title = DOC_TITLE_PREFIX + document.title;
                    }
                    localStorage.setItem(localStorageItemId, '1');
                }
                return {
                    callToAction,
                    callToActionId,
                    titleId,
                    direction: 'bottom' // Math.random() < 0.5 ? 'bottom' : 'mid'
                };
            });
        }, showTime * 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, []);
    function closePopup() {
        setShowPopup(undefined);
        document.title = document.title.replace(DOC_TITLE_PREFIX, '');
        localStorage.setItem('notification_popup_closed_at', Date.now().toString());
        localStorage.setItem('notification_popup_closed_today', new Date().getDay() + '');
    }
    return <>
        {children}
        <div className={'call-to-action-popup ' + (showPopup ? 'active ' + showPopup.direction : '')}>
            {
                showPopup ? <>
                    <h3>{showPopup.callToAction.title[showPopup.titleId]}</h3>
                    <a
                        href={showPopup.callToAction.url}
                        className='hover-shadow-top'
                        id="rxdb-call-to-action-button"
                        target="_blank"
                        onClick={() => {
                            triggerTrackingEvent('notification_call_to_action', 0.40, false);
                            // track the ids also so we can delete the ones with a low clickrate.
                            triggerTrackingEvent(
                                'notification_' + NOTIFICATION_SPLIT_TEST_VERSION + '_call_to_action_cid_' + showPopup.callToActionId + '_tid_' + showPopup.titleId,
                                0.01,
                                false
                            );
                            closePopup();
                        }}
                    >
                        {showPopup.callToAction.text} {showPopup.callToAction.keyword}
                    </a>
                </> : ''
            }
            <div className='close' onClick={() => closePopup()}>
                <div className='text'>&#x2715;</div>
            </div>
        </div>
    </>;
}

function addCallToActionButton() {
    // do only show on docs-pages, not on landingpages like premium or consulting page.
    if (!location.pathname.includes('.html')) {
        return;
    }

    function insertAfter(referenceNode, newNode) {
        referenceNode.parentNode.insertBefore(
            newNode,
            referenceNode.nextSibling
        );
    }
    const callToActionButtonId = 'rxdb-call-to-action-button';
    function setCallToActionOnce() {
        console.log('set call to action button');

        const tenMinutes = 1000 * 60 * 10;
        const now = Date.now();
        const timeSlot = (now - (now % tenMinutes)) / tenMinutes;
        console.log('timeslot ' + timeSlot);
        const randId = timeSlot % callToActions.length;
        console.log('randid: ' + randId);
        const callToAction = callToActions[randId];
        const alreadyThere = document.querySelector('.call-to-action');
        if (alreadyThere) {
            alreadyThere.parentNode.removeChild(alreadyThere);
        }

        const positionReferenceElement =
            document.querySelector('.navbar__items');
        if (!positionReferenceElement) {
            // not loaded yet!
            return;
        }

        const newElementWrapper = document.createElement('div');
        newElementWrapper.classList.add('call-to-action');

        const newElement = document.createElement('a');
        newElement.onclick = () => {
            triggerTrackingEvent('call-to-action', 0.35, false);
        };
        newElement.classList.add('hover-shadow-top');
        newElement.id = callToActionButtonId;
        newElement.innerHTML =
            '<div class="call-to-action-text">' +
            callToAction.text +
            '</div>' +
            ' <b class="call-to-action-keyword">' +
            callToAction.keyword +
            '</b>' +
            '<b class="call-to-action-icon">' +
            callToAction.icon +
            '</b>';
        newElement.href = callToAction.url;
        newElement.target = '_blank';
        newElementWrapper.append(newElement);

        insertAfter(positionReferenceElement, newElementWrapper);
    }
    setCallToActionOnce();
}

/**
 * There are some logs that RxDB prints out to the console of the developers.
 * These logs can contain links with the query param ?console=foobar
 * which allows us to detect that a user has really installed and started RxDB.
 */
function triggerClickEventWhenFromCode() {
    const TRIGGER_CONSOLE_EVENT_ID = 'console-log-click';
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('console')) {
        return;
    }
    triggerTrackingEvent(TRIGGER_CONSOLE_EVENT_ID + '_' + urlParams.get('console'), 10, false);
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



function startAnalytics() {
    console.log('load analytics code');

    setTimeout(function () {
        triggerTrackingEvent('spend_20_seconds_on_page', 0.01, false);
    }, 20 * 1000);
    setTimeout(function () {
        triggerTrackingEvent('spend_60_seconds_on_page', 0.03, false);
    }, 60 * 1000);

    // detect scroll to bottom of landingpage
    let scrollTriggerDone = false;
    let nextScrollTimestamp = 0;
    if (location.pathname === '/' || location.pathname.includes('/sem/')) {
        window.addEventListener('scroll', (event) => {
            const newTimestamp = event.timeStamp;
            if (!scrollTriggerDone && nextScrollTimestamp < newTimestamp) {
                nextScrollTimestamp = newTimestamp + 250;
            } else {
                return;
            }
            /**
             * @link https://fjolt.com/article/javascript-check-if-user-scrolled-to-bottom
             */
            const documentHeight = document.body.scrollHeight;
            const currentScroll = window.scrollY + window.innerHeight;
            // When the user is [modifier]px from the bottom, fire the event.
            const modifier = 800;
            if (currentScroll + modifier > documentHeight) {
                console.log('You are at the bottom!');
                scrollTriggerDone = true;
                triggerTrackingEvent('scroll_to_bottom', 0.12, false);
            }
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
        triggerTrackingEvent(DEV_MODE_EVENT_ID, 10, true);
        triggerTrackingEvent(DEV_MODE_EVENT_ID + '_' + version, 10, true);
    }
    checkDevModeEvent();
    // also listen for upcoming events
    // DISABLED because it kill the google metric "Page prevented back/forward cache restoration"
    // const bc = new BroadcastChannel(DEV_MODE_EVENT_ID);
    // bc.onmessage = () => checkDevModeEvent();
    // /track dev_mode_tracking_iframe event


    // reddit pixel TODO move into google tag manager
    // @ts-ignore eslint-disable-next-line
    (function (w, d) {
        if (!(w as any).rdt) {
            // @ts-ignore
            const p: any = w.rdt = function () {
                // @ts-ignore
                if (p.sendEvent) {
                    p.sendEvent.apply(p, arguments);
                } else {
                    p.callQueue.push(arguments);
                }
            };
            p.callQueue = [];
            const t = d.createElement('script');
            t.src = 'https://www.redditstatic.com/ads/pixel.js';
            t.async = true;
            const s: any = d.getElementsByTagName('script')[0];
            s.parentNode.insertBefore(t, s);
        }
    })(window, document);
    (window as any).rdt('init', 't2_131k54', {
        'aaid': '<AAID-HERE>', 'email': '<EMAIL-HERE>', 'externalId': '<EXTERNAL-ID-HERE>', 'idfa': '<IDFA-HERE>'
    });
    (window as any).rdt('track', 'PageVisit');
    // /reddit pixel



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
