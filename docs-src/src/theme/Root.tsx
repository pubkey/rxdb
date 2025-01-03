import useIsBrowser from '@docusaurus/useIsBrowser';
import React, { useEffect } from 'react';
import { getDatabase } from '../components/database';

// Default implementation, that you can customize
export default function Root({ children }) {
    const isBrowser = useIsBrowser();
    useEffect(() => {
        if (!isBrowser) {
            return;
        }

        // addCommunityChatButton();

        addCallToActionButton();
        triggerClickEventWhenFromCode();
    });
    return <>{children}</>;
}

function addCallToActionButton() {
    // do only show on docs-pages, not on landingpages like premium or consulting page.
    if (!location.pathname.includes('.html')) {
        return;
    }

    const callToActions = [
        {
            text: 'Follow',
            keyword: '@twitter',
            url: 'https://twitter.com/intent/user?screen_name=rxdbjs',
            icon: '🐦',
        },
        {
            text: 'Follow',
            keyword: '@LinkedIn',
            url: 'https://www.linkedin.com/company/rxdb',
            icon: '[in]',
        },
        {
            text: 'Follow',
            keyword: '@LinkedIn',
            url: 'https://www.linkedin.com/in/danielmeyerdev/',
            icon: '[in]',
        },
        {
            text: 'Chat',
            keyword: '@discord',
            url: 'https://rxdb.info/chat',
            icon: '💬',
        },
        {
            text: 'Star',
            keyword: '@github',
            url: 'https://rxdb.info/code',
            icon: '🐙💻',
        },
        {
            text: 'Subscribe',
            keyword: '@newsletter',
            url: 'https://rxdb.info/newsletter',
            icon: '📰',
        },
        // {
        //     text: 'Take Part in the',
        //     keyword: 'User Survey 2024',
        //     url: 'https://rxdb.info/survey',
        //     icon: '📝'
        // }
    ];
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
            window.trigger('call-to-action', 0.35);
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
async function triggerClickEventWhenFromCode() {
    const TRIGGER_CONSOLE_EVENT_ID = 'console-log-click';
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('console')) {
        return;
    }
    const database = await getDatabase();
    const flagDoc = await database.getLocal(TRIGGER_CONSOLE_EVENT_ID);
    if (flagDoc) {
        console.log('# already tracked ' + TRIGGER_CONSOLE_EVENT_ID);
    } else {
        window.trigger(
            TRIGGER_CONSOLE_EVENT_ID + '_' + urlParams.get('console'),
            10
        );
        await database.upsertLocal(TRIGGER_CONSOLE_EVENT_ID, {});
    }
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
    elemDiv.href = '/chat';
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
