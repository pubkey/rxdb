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
