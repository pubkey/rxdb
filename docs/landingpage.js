window.onload = function () {

    /**
     * Pointers to html elements are prefixed with $
     * Lists of pointers have $$
     */
    var $heartbeatAudio = document.getElementById('heartbeat-audio');
    var $$beating = document.getElementsByClassName('beating');
    var $$beatingFirst = document.getElementsByClassName('beating-first');
    var $$beatingSecond = document.getElementsByClassName('beating-second');
    var $$beatingNumber = document.getElementsByClassName('beating-number');

    var $swapOutFirst = document.getElementById('swap-out-first');
    var $swapOutSecond = document.getElementById('swap-out-second');
    var $smartphoneColor = document.getElementById('smartphone-color');


    var audioVolume = 0.5;
    $heartbeatAudio.volume = audioVolume;
    var heartbeatListeners = [];
    var heartbeatIndex = 0;
    var heartbeatDuration = 851.088;
    var heartbeatTimeToFirstBeat = 105;
    var heartbeatTimeToSecondBeat = 324;

    console.log('heartbeatDuration: ' + heartbeatDuration);

    /**
     * For iOS we have to trigger the audio start on the first user interaction.
     * This will 'unlock' the audio element so we can later play() at any time.
     * @link https://www.py4u.net/discuss/287774
     */
    window.addEventListener('touchstart', () => {
        console.log('touchstart: START');
        $heartbeatAudio.volume = 0.01;
        $heartbeatAudio.play();
        setTimeout(function () {
            $heartbeatAudio.pause();
            $heartbeatAudio.currentTime = 0;
            console.log('touchstart: END');
        }, 1);
    });


    setInterval(function () {
        /**
         * Only run when browser tab is active
         * to not annoy the user with background sound otherwise.
         */
        if (!document.hidden) {
            heartbeatListeners.forEach(function (listener) {
                listener(heartbeatIndex);
            });
            heartbeatIndex = heartbeatIndex + 1;
        }
    }, heartbeatDuration * 2);


    // swap out main text on every X heartbeat
    var swapOutTextEveryX = 1;
    var swapOutsDone = 0;
    function swapMainText(index) {
        var textsFirst = [
            'NoSQL',
            'OfflineFirst',
            'JavaScript',
            'observable',
            'reactive',
            'realtime'
        ];
        var textsSecond = [
            'for the Web',
            'for Node.js',
            'for Browsers',
            'for Capacitor',
            'for Electron',
            'for PWAs',
            'for UI apps',
            'you deserve',
            'that syncs',

        ];
        /**
         * Do not directly change the text on the audio start,
         * but wait a bit for the first beat sound.
         */
        setTimeout(function () {
            if (
                index > 2 &&
                index % swapOutTextEveryX === 0
            ) {
                swapOutsDone = swapOutsDone + 1;
                if (swapOutsDone % 2 === 0) {
                    $swapOutFirst.innerHTML = randomOfArray(textsFirst, $swapOutFirst.innerHTML);
                } else {
                    $swapOutSecond.innerHTML = randomOfArray(textsSecond, $swapOutSecond.innerHTML);
                }
            }
        }, heartbeatTimeToFirstBeat);
    }

    // beat sound on heartbeat
    heartbeatListeners.push(function (index) {

        /**
         * This might throw because we cannot play audio when the user
         * has not interacted with the dom yet. 
         **/
        $heartbeatAudio.play()
            .then(function () {

                /**
                 * Only swap out the main text when the audio was playing,
                 * so we ensure that the user interacted with the site.
                 */
                swapMainText(index);

                /**
                 * If play() did not error,
                 * we decrease the volume to
                 * ensure we do not piss of people that are looking
                 * for which browser tab is playing audio.
                 */
                audioVolume = audioVolume * 0.9;
                $heartbeatAudio.volume = audioVolume;
            });
    });

    // css animation of big logo on heartbeat
    heartbeatListeners.push(function () {
        Array.from($$beating).forEach(function (element) {
            element.style.animationDuration = heartbeatDuration + 'ms';
            element.classList.remove('animation');
            element.offsetWidth
            element.classList.add('animation');
        });
        Array.from($$beatingFirst).forEach(function (element) {
            element.style.animationDuration = heartbeatDuration + 'ms';
            element.classList.remove('animation');
            element.offsetWidth
            element.classList.add('animation');
        });
        Array.from($$beatingSecond).forEach(function (element) {
            element.style.animationDuration = heartbeatDuration + 'ms';
            element.classList.remove('animation');
            element.offsetWidth
            element.classList.add('animation');
        });
    });

    // increase beating numbers
    heartbeatListeners.push(function () {
        Array.from($$beatingNumber).forEach(function (element) {
            setTimeout(function () {
                var value = parseFloat(element.innerHTML, 10);
                var newValue = value + 1;
                element.innerHTML = newValue + '';
            }, heartbeatTimeToFirstBeat);
        });
    });

    // tablet swap color on heartbeat
    var colors = [
        '#e6008d',
        '#8d2089',
        '#5f2688'
    ];
    var lastSmartphoneColor = colors[0];
    heartbeatListeners.push(function () {
        setTimeout(function () {
            lastSmartphoneColor = randomOfArray(colors, lastSmartphoneColor);
            $smartphoneColor.style.backgroundColor = lastSmartphoneColor;
        }, heartbeatTimeToSecondBeat);
    });

};


// UTILS


function randomOfArray(array, mustNotBe) {
    var ret;
    while (!ret || ret === mustNotBe) {
        ret = array[Math.floor(Math.random() * array.length)];
    }
    return ret;
}
