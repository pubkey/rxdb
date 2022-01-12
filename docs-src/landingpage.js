var heartbeatAudio = document.getElementById('heartbeat-audio');
var heartbeatListeners = [];
var heartbeatIndex = 0;

heartbeatAudio.addEventListener('loadedmetadata', function () {
    var heartbeatDuration = heartbeatAudio.duration * 1000;
    console.log('heartbeatDuration: ' + heartbeatDuration);


    window.onload = function () {
        setInterval(function () {
            heartbeatListeners.forEach(function (listener) {
                listener(heartbeatIndex);
            });
            heartbeatIndex = heartbeatIndex + 1;
        }, heartbeatDuration * 2);
    };


    // beat sound on heartbeat
    heartbeatListeners.push(function () {
        try {
            /**
             * This might throw because we cannot play audio when the user
             * has not interacted with the dom yet. 
             **/
            heartbeatAudio.play();
        } catch (err) { }
    });

    // css animation of big logo on heartbeat
    var heartbeatLogo = document.getElementById('heartbeat-logo');
    heartbeatLogo.style.animationDuration = heartbeatDuration + 'ms';
    heartbeatListeners.push(function () {
        heartbeatLogo.classList.remove('animation');
        heartbeatLogo.offsetWidth
        heartbeatLogo.classList.add('animation');
    });
});
