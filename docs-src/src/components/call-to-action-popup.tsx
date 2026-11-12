import React, { useEffect, useState } from 'react';
import { triggerTrackingEvent } from './trigger-event';
import { randomNumber } from '../../../plugins/utils';
import { IconClose } from './icons/close';
import { Button } from './button';
import LinkedInLogo from '@site/static/img/community-links/linkedin-logo.svg';
import { IconNewsletter } from './icons/newsletter';
import { IconGoogle } from './icons/google';

type CallToActionItem = {
    /**
     * Titles are an array, so we can do A-B tests
     * on the clickrate.
     */
    title: string[];
    text: string;
    keyword: string;
    url: string;
    icon: any;
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
        icon: <span className="navbar-icon-github" style={{ width: 22, height: 22, display: 'inline-block' }}></span>,
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
        icon: '/files/icons/twitter-blue.svg',
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
        icon: <LinkedInLogo style={{ width: 20, height: 20 }}></LinkedInLogo>,
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
        icon: <LinkedInLogo style={{ width: 20, height: 20 }}></LinkedInLogo>,
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
        icon: <span className="navbar-icon-discord" style={{ width: 22, height: 22, display: 'inline-block' }}></span>,
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
        icon: <IconNewsletter />,
    },
    {
        title: [
            'Want more RxDB articles in your Google results? Add rxdb.info as a preferred source on Google!',
            'See RxDB news first in Google Top Stories - add rxdb.info as a preferred source!'
        ],
        text: 'Add as preferred source on',
        keyword: '@Google',
        url: 'https://www.google.com/preferences/source?q=rxdb.info',
        icon: <IconGoogle />,
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

/**
 * The call-to-action popup that asks visitors to star the repo,
 * follow on social media and so on. It is lazy loaded by the Root
 * component so that it does not end up in the main bundle.
 */
export default function CallToActionPopup() {
    const [showPopup, setShowPopup] = useState<{
        callToAction: CallToActionItem;
        callToActionId: number;
        titleId: number;
        direction: 'top' | 'bottom' | 'mid';
    }>();
    const DOC_TITLE_PREFIX = '(1) ';
    useEffect(() => {
        const showTime = location.pathname.includes('.html') ? 30 : 60;
        // const showTime = 1;
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
                const weeklyCloseCountKey = getWeeklyCloseCountKey();
                const closedCountThisWeek = Number(localStorage.getItem(weeklyCloseCountKey) || '0');

                if (
                    // more than 5 times in a week => do not show again for that week
                    closedCountThisWeek > 3 ||
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

        // weekly close counter
        const key = getWeeklyCloseCountKey();
        const prev = Number(localStorage.getItem(key) || '0');
        localStorage.setItem(key, String(prev + 1));
    }
    return <>
        <div className={'call-to-action-popup ' + (showPopup ? 'active ' + showPopup.direction : '')}>
            {
                showPopup ? <>
                    <h3>{showPopup.callToAction.title[showPopup.titleId]}</h3>
                    <Button
                        primary
                        href={showPopup.callToAction.url}
                        icon={showPopup.callToAction.icon}
                        target="_blank"
                        onClick={() => {
                            triggerTrackingEvent('notification_call_to_action', 0.40);
                            // track the ids also so we can delete the ones with a low clickrate.
                            triggerTrackingEvent(
                                'noti_' + NOTIFICATION_SPLIT_TEST_VERSION + '_CTA_cid_' + showPopup.callToActionId + '_tid_' + showPopup.titleId,
                                0.01
                            );
                            closePopup();
                        }}
                    >{showPopup.callToAction.text} {showPopup.callToAction.keyword}</Button>
                </> : ''
            }
            <div className='close-popup' onClick={() => closePopup()}>
                <IconClose clickable />
            </div>
        </div>
    </>;
}

export function addCallToActionButton() {
    return;
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
        const tenMinutes = 1000 * 60 * 10;
        const now = Date.now();
        const timeSlot = (now - (now % tenMinutes)) / tenMinutes;
        const randId = timeSlot % callToActions.length;
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
            triggerTrackingEvent('call-to-action', 0.35);
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
 * Returns a unique-per-week identifier
 * that looks like 2026_24 (year+week)
 */
function getWeekKey(date: Date = new Date()): string {
    const d = new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    ));

    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));

    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

    const weekNo = Math.ceil(
        ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );

    return `${d.getUTCFullYear()}_${weekNo}`;
}

function getWeeklyCloseCountKey() {
    return `notification_popup_closed_count_${getWeekKey()}`;
}
