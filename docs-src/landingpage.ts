import {
    ensureNotFalsy
} from '../';




window.onload = function () {


    /**
     * Having blinking stuff can be annoying for people with
     * neuronal problems. So we disable it for everyone
     * who has set the reduced motions settings in the browser/OS
     * @link https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
     * @link https://web.dev/prefers-reduced-motion/
     * @link https://github.com/pubkey/rxdb/pull/3800
     * @link https://a11y-101.com/development/reduced-motion
     */
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
        console.log('reducedMotion is set to true');
        return;
    }


    /**
     * In the past we had this beating effect.
     * But it turned out that many people do not like that,
     * and in the 2022 user survey, most people opted for removing it.
     * So now it is disabled but can be turned on by passing the correct url parameter '?beating=true'
     * @link https://github.com/pubkey/rxdb/pull/3800
     */
    // const urlSearchParams = new URLSearchParams(window.location.search);
    // const urlParams = Object.fromEntries(urlSearchParams.entries());
    // if (!urlParams.beating) {
    //     return;
    // }


    /**
     * Pointers to html elements are prefixed with $
     * Lists of pointers have $$
     */
    const $heartbeatAudio: any = ensureNotFalsy(document.getElementById('heartbeat-audio'));
    const $$beating: any[] = document.getElementsByClassName('beating') as any;
    const $$beatingFirst: any[] = document.getElementsByClassName('beating-first') as any;
    const $$beatingSecond: any[] = document.getElementsByClassName('beating-second') as any;
    const $$beatingNumber = document.getElementsByClassName('beating-number');
    const $$beatingColor: any[] = document.getElementsByClassName('beating-color') as any;

    const $swapOutFirst = ensureNotFalsy(document.getElementById('swap-out-first'));
    const $swapOutSecond = ensureNotFalsy(document.getElementById('swap-out-second'));


    let audioVolume = 0.5;
    $heartbeatAudio.volume = audioVolume;
    const heartbeatListeners: any[] = [];
    let heartbeatIndex = 0;
    const heartbeatDuration = 851.088;
    const heartbeatTimeToFirstBeat = 105;
    const heartbeatTimeToSecondBeat = 324;

    console.log('heartbeatDuration: ' + heartbeatDuration);

    /**
     * For iOS we have to trigger the audio start on the first user interaction.
     * This will 'unlock' the audio element so we can later play() at any time.
     * @link https://www.py4u.net/discuss/287774
     */
    let touchStartDone = false;
    window.addEventListener('touchstart', function () {
        if (touchStartDone) {
            return;
        }
        touchStartDone = true;
        console.log('touchstart: START');
        $heartbeatAudio.volume = 0.01;
        $heartbeatAudio.play().catch(function () { /* Ignore erros */ });
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
    }, heartbeatDuration * 1.9);


    // swap out main text on every X heartbeat
    const swapOutTextEveryX = 1;
    let swapOutsDone = 0;
    function swapMainText(index: number) {
        const textsFirst = [
            'NoSQL',
            'OfflineFirst',
            'JavaScript',
            'observable',
            'reactive',
            'realtime'
        ];
        const textsSecond = [
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
    heartbeatListeners.push(function (index: number) {

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
            }).catch(function () {
                /**
                 * This might fail if the user has not already interaced with the UI
                 * and we are not allowed to play sound yet.
                 * Then we just do not play sound and ignore the error.
                 */
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
            // only increase randomly so it looks more natural.
            if (randomBoolean() && randomBoolean()) {
                setTimeout(function () {
                    const value = parseFloat(element.innerHTML);
                    const newValue = value + 1;
                    element.innerHTML = newValue + '';
                }, heartbeatTimeToFirstBeat);
            }
        });
    });

    // tablet swap color on heartbeat
    const colors = [
        '#e6008d',
        '#8d2089',
        '#5f2688'
    ];
    const lastColorByElementIndex: any = {};
    heartbeatListeners.push(function () {
        setTimeout(function () {
            Array.from($$beatingColor).forEach(function (element, idx) {
                let isColor = lastColorByElementIndex[idx];
                if (!isColor) {
                    isColor = colors[0];
                }
                const newColor = randomOfArray(colors, isColor);
                lastColorByElementIndex[idx] = newColor;
                element.style.backgroundColor = newColor;
            });
        }, heartbeatTimeToSecondBeat);
    });

};


// UTILS

function randomBoolean() {
    return Math.random() < 0.5;
}
function randomOfArray<T>(array: T[], mustNotBe?: T): T {
    let ret;
    while (!ret || ret === mustNotBe) {
        ret = array[Math.floor(Math.random() * array.length)];
    }
    return ret;
}
