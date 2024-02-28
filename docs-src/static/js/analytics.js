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

// detect scroll to bottom of landingpage
let scrollTriggerDone = false;
if (location.pathname === '/') {
    window.addEventListener('scroll', () => {
        if (!scrollTriggerDone) {
            /**
             * @link https://fjolt.com/article/javascript-check-if-user-scrolled-to-bottom
             */
            const documentHeight = document.body.scrollHeight;
            const currentScroll = window.scrollY + window.innerHeight;
            // When the user is [modifier]px from the bottom, fire the event.
            const modifier = 500;
            if (currentScroll + modifier > documentHeight) {
                console.log('You are at the bottom!');
                scrollTriggerDone = true;
                trigger('scroll_to_bottom', 0.12);
            }
        }
    });

}

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

