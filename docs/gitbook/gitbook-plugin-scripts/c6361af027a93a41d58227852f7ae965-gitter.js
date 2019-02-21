console.log('load gitter widget');
var script = document.createElement('script');
script.src = 'https://sidecar.gitter.im/dist/sidecar.v1.js';
script.onload = function () {
    ((window.gitter = {}).chat = {}).options = {
        room: 'pubkey/rxdb'
    };
    console.dir(window.gitter);
};
document.head.appendChild(script);
