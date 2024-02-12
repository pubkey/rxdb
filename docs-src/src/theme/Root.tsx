import useIsBrowser from '@docusaurus/useIsBrowser';
import React, { useEffect } from 'react';

// Default implementation, that you can customize
export default function Root({ children }) {
    const isBrowser = useIsBrowser();
    useEffect(() => {
        if (!isBrowser) {
            return;
        }
        addCommunityChatButton();
        addCallToActionButton();

    });
    return <>{children}</>;
}


function addCallToActionButton() {

    // do not show on landingpage
    if(location.pathname === '/'){
        return;
    }

    const callToActions = [
        {
            text: 'Follow',
            keyword: '@twitter',
            url: 'https://twitter.com/intent/user?screen_name=rxdbjs',
            icon: '🐦'
        },
        {
            text: 'Follow',
            keyword: '@LinkedIn',
            url: 'https://www.linkedin.com/company/rxdb',
            icon: '[in]'
        },
        {
            text: 'Chat',
            keyword: '@discord',
            url: 'https://rxdb.info/chat',
            icon: '💬'
        },
        {
            text: 'Star',
            keyword: '@github',
            url: 'https://rxdb.info/code',
            icon: '🐙💻'
        },
        {
            text: 'Subscribe',
            keyword: '@newsletter',
            url: 'https://rxdb.info/newsletter',
            icon: '📰'
        }
    ];
    function insertAfter(referenceNode, newNode) {
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    }
    const callToActionButtonId = 'rxdb-call-to-action-button';
    function setCallToActionOnce() {
        console.log('set call to action button');

        const tenMinutes = 1000 * 60*10;
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


        const positionReferenceElement = document.querySelector('.navbar__items');
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
        newElement.innerHTML = callToAction.text + ' <b class="call-to-action-keyword">' + callToAction.keyword + '</b>' +
            '<b class="call-to-action-icon">' + callToAction.icon + '</b>';
        newElement.href = callToAction.url;
        newElement.target = '_blank';
        newElementWrapper.append(newElement);


        insertAfter(positionReferenceElement, newElementWrapper);
    }
    setCallToActionOnce();
}

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
    styleSheet.innerText = '#' + chatButtonId + ' {' +
        'color: white;' +
        'position: fixed;' +
        'right: 0;' +
        'bottom: 0;' +
        'background-color: var(--color-top);' +
        'padding-left: 17px;' +
        'padding-right: 17px;' +
        'padding-top: 10px;' +
        'padding-bottom: 5px;' +
        'text-align: center;' +
        'margin-right: 50px;' +
        'font-weight: bold;' +
        'border-top-left-radius: 9px;' +
        'border-top-right-radius: 9px;' +
        'z-index: 11;' +
        '}' +
        '#fixed-chat-button:hover {' +
        'box-shadow: 2px 2px 13px #ca007c, -2px -1px 14px #ff009e;' +
        'text-decoration: underline;' +
        '}'
        ;
    document.head.appendChild(styleSheet);
    document.body.appendChild(elemDiv);
}
