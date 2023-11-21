function trigger(type, value) {
    console.log('window trigger: ' + type + ': ' + value);

    // reddit
    if (typeof window.rdt === 'function') {
        window.rdt('track', 'Lead', {
            transactionId: type + '-' + new Date().getTime(),
            value: value
        });
    }

    // google analytics
    if (typeof window.gtag === 'function') {
        window.gtag(
            'event',
            type,
            {
                value,
                currency: 'EUR'
            }
        );
    }
}
window.trigger = trigger;

console.log('load analytics code');



setTimeout(function () {
    trigger('spend_20_seconds_on_page', 0.01);
}, 20 * 1000);
setTimeout(function () {
    trigger('spend_60_seconds_on_page', 0.03);
}, 60 * 1000);


// Reddit Pixel
// ! function (w, d) {
//     if (!w.rdt) {
//         var p = w.rdt = function () {
//             p.sendEvent ? p.sendEvent.apply(p, arguments) : p.callQueue.push(arguments)
//         };
//         p.callQueue = [];
//         var t = d.createElement('script');
//         t.src = 'https://www.redditstatic.com/ads/pixel.js', t.async = !0;
//         var s = d.getElementsByTagName('script')[0];
//         s.parentNode.insertBefore(t, s)
//     }
// }(window, document);
// window.rdt('init', 't2_131k54', {
//     optOut: false,
//     useDecimalCurrencyValues: true
// });
// window.rdt('track', 'PageVisit');
// /Reddit Pixel


function parseQueryParams(url) {
    const urlSearchParams = new URL(url).searchParams;
    const queryParams = Object.fromEntries(urlSearchParams.entries());
    return queryParams;
}

/**
 * History hack,
 * show landingpage on back from somewhere else.
 */
function historyHack() {
    console.log('document.referrer: ' + document.referrer);
    console.log(' window.location.hostname: ' + window.location.hostname);
    const reloadWait = 100;
    const queryParamFlag = 'history-back';
    const originalUrl = location.href;
    const queryParams = parseQueryParams(window.location);
    let prePopstateUrl = location.href;
    window.addEventListener('popstate', function (_event) {
        const from = prePopstateUrl;
        const to = location.href;
        // console.log('from : ' + from);
        // console.log('to : ' + to);
        prePopstateUrl = location.href;

        if (
            parseQueryParams(from)[queryParamFlag] &&
            document.referrer &&
            parseQueryParams(document.referrer)[queryParamFlag]
        ) {
            return;
        }

        if (
            new URL(from).pathname === '/' &&
            parseQueryParams(to)[queryParamFlag]
        ) {
            history.forward();
            setTimeout(() => {
                location.reload();
            }, reloadWait);
            return;
        }

        if (
            new URL(from).pathname === new URL(to).pathname
        ) {
            return;
        }

        setTimeout(() => {
            location.reload();
        }, reloadWait);
    }, {
        passive: true
    });


    if (queryParams[queryParamFlag]) {
        history.back();
        setTimeout(function () {
            history.replaceState(null, document.title, '/');
        }, 200);
    } else if (
        document.referrer &&
        new URL(document.referrer).hostname !== window.location.hostname &&
        location.pathname !== '/'
    ) {
        history.pushState(null, document.title, '/?' + queryParamFlag + '=true');
        history.pushState(null, document.title, originalUrl);
    }
}
historyHack();



/**
 * Chat call-to-action button
 */
window.addEventListener('DOMContentLoaded', function () {
    const elemDiv = document.createElement('a');
    elemDiv.id = 'fixed-chat-button';
    elemDiv.href = '/chat';
    elemDiv.target = '_blank';
    elemDiv.innerHTML = 'Community Chat';
    elemDiv.onclick = function () {
        trigger('join_chat_action', 0.10);
    };

    const styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerText = '#fixed-chat-button {' +
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
        'margin-right: 21px;' +
        'font-weight: bold;' +
        'border-top-left-radius: 9px;' +
        'border-top-right-radius: 9px;' +
        '}' +
        '#fixed-chat-button:hover {' +
        'box-shadow: 2px 2px 13px #ca007c, -2px -1px 14px #ff009e;' +
        'text-decoration: underline;' +
        '}'
        ;
    document.head.appendChild(styleSheet);
    document.body.appendChild(elemDiv);

}, false);



/**
 * Add call to action button
 */

var callToActions = [
    {
        text: 'Follow',
        keyword: '@twitter',
        url: 'https://twitter.com/intent/user?screen_name=rxdbjs'
    },
    {
        text: 'Chat',
        keyword: '@discord',
        url: 'https://rxdb.info/chat'
    },
    {
        text: 'Star',
        keyword: '@github',
        url: 'https://rxdb.info/code'
    },
    {
        text: '',
        keyword: '@newsletter',
        url: 'https://rxdb.info/newsletter'
    }
];
function insertAfter(referenceNode, newNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}
var callToActionButtonId = 'rxdb-call-to-action-button';
function setCallToActionOnce() {
    var randId = Date.now() % callToActions.length;
    var callToAction = callToActions[randId];
    var alreadyThere = document.querySelector('#' + callToActionButtonId);
    if (alreadyThere) {
        alreadyThere.parentNode.removeChild(alreadyThere);
    }


    var positionReferenceElement = document.querySelector('.navbar__items');
    if (!positionReferenceElement) {
        // not loaded yet!
        return;
    }

    var newElementWrapper = document.createElement('div');
    newElementWrapper.classList.add('call-to-action');

    var newElement = document.createElement('a');
    newElement.classList.add('hover-shadow-top');
    newElement.id = callToActionButtonId;
    newElement.innerHTML = callToAction.text + ' <b>' + callToAction.keyword + '</b>';
    newElement.href = callToAction.url;
    newElement.target = '_blank';
    newElementWrapper.append(newElement);


    insertAfter(positionReferenceElement, newElementWrapper);
}
function runSettingCallToActionButton() {
    setCallToActionOnce();
    /**
     * Gitbook does a strange page change handling,
     * so we have to re-run the function
     * because listening to history changes did not work.
     */
    setInterval(function () {
        var alreadyThere = document.querySelector('#' + callToActionButtonId);
        // only add if not exists already, like on a page change.
        if (!alreadyThere) {
            setCallToActionOnce();
        }
    }, 100);
}
runSettingCallToActionButton();
