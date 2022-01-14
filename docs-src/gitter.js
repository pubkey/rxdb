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



// overwrite some css rules
var styleSheet = document.createElement('style');
styleSheet.type = 'text/css';
styleSheet.innerText = '.gitter-open-chat-button {background-color: #e6008d !important; font-weight: bold;}';
document.head.appendChild(styleSheet);
