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
! function (w, d) {
    if (!w.rdt) {
        var p = w.rdt = function () {
            p.sendEvent ? p.sendEvent.apply(p, arguments) : p.callQueue.push(arguments)
        };
        p.callQueue = [];
        var t = d.createElement('script');
        t.src = 'https://www.redditstatic.com/ads/pixel.js', t.async = !0;
        var s = d.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(t, s)
    }
}(window, document);
window.rdt('init', 't2_131k54', {
    optOut: false,
    useDecimalCurrencyValues: true
});
window.rdt('track', 'PageVisit');

setTimeout(function () {
    window.trigger('10-seconds-on-page', 0.01);
}, 10 * 1000);
setTimeout(function () {
    window.trigger('30-seconds-on-page', 0.03);
}, 30 * 1000);
// /Reddit Pixel
