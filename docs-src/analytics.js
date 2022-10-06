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
window.rdt('track', 'Lead', {
    transactionId: 'docs-or-main-visit-' + new Date().getTime(),
    value: 0.1
});
// /Reddit Pixel
