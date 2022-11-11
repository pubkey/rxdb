console.log('load analytics code');
var script = document.createElement('script');
script.src = 'https://www.googletagmanager.com/gtag/js?id=G-62D63SY3S0';
script.onload = function () {
};
document.head.appendChild(script);

window.dataLayer = window.dataLayer || [];
function gtag() {
    window.dataLayer.push(arguments);
}
gtag('js', new Date());

gtag('config', 'G-62D63SY3S0');



window.trigger = function (type, value) {
    console.log('window trigger: ' + type + ': ' + value);
    window.rdt('track', 'Lead', {
        transactionId: type + '-' + new Date().getTime(),
        value: value
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

// setTimeout(function () {
//     window.trigger('10-seconds-on-page', 0.01);
// }, 10 * 1000);
// setTimeout(function () {
//     window.trigger('30-seconds-on-page', 0.03);
// }, 30 * 1000);
// /Reddit Pixel


function parseQueryParams(url) {
    var urlSearchParams = new URL(url).searchParams;
    var queryParams = Object.fromEntries(urlSearchParams.entries());
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
        location.href.pathname !== '/'
    ) {
        history.pushState(null, document.title, '/?' + queryParamFlag + '=true');
        history.pushState(null, document.title, originalUrl);
    }
}
historyHack();
