console.log('load gitter widget');
((window.gitter = {}).chat = {}).options = {
    room: 'pubkey/rxdb'
};
console.dir(window.gitter);
var script = document.createElement('script');
script.src = 'https://sidecar.gitter.im/dist/sidecar.v1.js';
script.onload = function () {
};
document.head.appendChild(script);
