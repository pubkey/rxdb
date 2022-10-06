import {
    ensureNotFalsy,
    createRxDatabase,
    RxLocalDocument,
    now,
    addRxPlugin
} from '../';
import {
    getRxStorageDexie
} from '../plugins/dexie';
import {
    RxDBLocalDocumentsPlugin
} from '../plugins/local-documents';
addRxPlugin(RxDBLocalDocumentsPlugin);
import {
    RxDBLeaderElectionPlugin
} from '../plugins/leader-election';
addRxPlugin(RxDBLeaderElectionPlugin);
import {
    merge,
    fromEvent
} from 'rxjs';


type MousePositionType = {
    x: number;
    y: number;
    time: number;
};

type HeadingTextType = {
    text1: string;
    text2: string;
};



window.onload = async function () {

    const database = await createRxDatabase({
        name: 'rxdb-landingpage',
        localDocuments: true,
        storage: getRxStorageDexie()
    });

    const headingTextDoc = await database.upsertLocal<HeadingTextType>('headingtext', {
        text1: 'JavaScript',
        text2: 'you deserve'
    });


    // track mouse position
    const mousePointerDoc = await database.upsertLocal<MousePositionType>('mousepos', {
        x: 0,
        y: 0,
        time: 0
    });

    let currentMousePosition: number[] = [];
    window.addEventListener('mousemove', (ev) => {
        currentMousePosition = [ev.clientX, ev.clientY];
    });


    merge(
        fromEvent(window, 'mousemove'),
        fromEvent(window, 'scroll'),
        fromEvent(window, 'resize')
    ).subscribe(() => {
        mousePointerDoc.atomicPatch({
            x: currentMousePosition[0],
            y: currentMousePosition[1],
            time: now()
        });
    });





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



    startTiltToMouse(mousePointerDoc);
    startEnlargeOnMousePos(mousePointerDoc);


    /**
     * Pointers to html elements are prefixed with $
     * Lists of pointers have $$
     */
    const $$beating: any[] = document.getElementsByClassName('beating') as any;
    const $$beatingFirst: any[] = document.getElementsByClassName('beating-first') as any;
    const $$beatingSecond: any[] = document.getElementsByClassName('beating-second') as any;
    const $$beatingNumber = document.getElementsByClassName('beating-number');
    const $$beatingColor: any[] = document.getElementsByClassName('beating-color') as any;

    const $swapOutFirst = ensureNotFalsy(document.getElementById('swap-out-first'));
    const $swapOutSecond = ensureNotFalsy(document.getElementById('swap-out-second'));


    const heartbeatListeners: any[] = [];
    let heartbeatIndex = 0;
    const heartbeatDuration = 851.088;
    const heartbeatTimeToFirstBeat = 105;
    const heartbeatTimeToSecondBeat = 324;

    console.log('heartbeatDuration: ' + heartbeatDuration);


    headingTextDoc.$.subscribe(textDoc => {
        $swapOutFirst.innerHTML = textDoc.data.text1;
        $swapOutSecond.innerHTML = textDoc.data.text2;
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
        database.waitForLeadership().then(() => {
            setTimeout(function () {
                if (
                    index > 2 &&
                    index % swapOutTextEveryX === 0
                ) {
                    swapOutsDone = swapOutsDone + 1;
                    if (swapOutsDone % 2 === 0) {
                        headingTextDoc.atomicPatch({
                            text1: randomOfArray(textsFirst, $swapOutFirst.innerHTML)
                        });
                    } else {
                        headingTextDoc.atomicPatch({
                            text2: randomOfArray(textsSecond, $swapOutSecond.innerHTML)
                        });
                    }
                }
            }, heartbeatTimeToFirstBeat);
        });
    }

    // beat sound on heartbeat
    heartbeatListeners.push(function (index: number) {

        /**
         * Only swap out the main text when the audio was playing,
         * so we ensure that the user interacted with the site.
         */
        swapMainText(index);

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



/**
 * @link https://armandocanals.com/posts/CSS-transform-rotating-a-3D-object-perspective-based-on-mouse-position.html
 */
function startTiltToMouse(mousePosDoc: RxLocalDocument<any, MousePositionType>) {
    const $$tiltToMouse: any[] = document.getElementsByClassName('tilt-to-mouse') as any;

    const constrain = 100;
    function transforms(x: number, y: number, el: HTMLElement) {
        const box = el.getBoundingClientRect();
        const calcX = -(y - box.y - (box.height / 2)) / constrain;
        const calcY = (x - box.x - (box.width / 2)) / constrain;

        return `perspective(100px)    rotateX(${calcX}deg)    rotateY(${calcY}deg) `;
    }

    function transformElement(el: any, xyEl: number[]) {
        el.style.transform = transforms.apply(null, xyEl as any);
    }

    mousePosDoc.$.subscribe((mousePos) => {
        if (!mousePos.data.time) {
            return;
        }
        Array.from($$tiltToMouse).forEach($element => {
            const position = ensureNotFalsy([mousePos.data.x, mousePos.data.y]).concat([$element]);
            transformElement($element, position);
        });
    });
}

/**
 * @link https://stackoverflow.com/a/16225919/3443137
 */
function startEnlargeOnMousePos(mousePosDoc: RxLocalDocument<any, MousePositionType>) {
    const $$enlargeOnMouse: any[] = document.getElementsByClassName('enlarge-on-mouse') as any;

    function getElementPosition(el: HTMLElement) {
        const rect = el.getBoundingClientRect();

        const centerX = rect.left + (rect.width / 2);
        const centerY = rect.top + (rect.height / 2);

        return {
            centerX,
            centerY,
            width: rect.width,
            height: rect.height
        };
    }

    function enlargeElement(el: HTMLElement, scale: number) {
        const transform = `scale(${scale})`;
        el.style.transform = transform;
    }

    mousePosDoc.$.subscribe((mousePos) => {
        if (!mousePos.data.time) {
            return;
        }
        Array.from($$enlargeOnMouse).forEach($element => {
            const elementPosition = getElementPosition($element);

            const dx = mousePos.data.x - elementPosition.centerX;
            const dy = mousePos.data.y - elementPosition.centerY;

            const distance = Math.sqrt(dx * dx + dy * dy);

            function easeInQuint(x: number): number {
                return x ^ 1.9;
            }

            let scale = 1 + (elementPosition.width / 2) / (easeInQuint(distance + 300));
            if (scale > 1.5) {
                scale = 1.5;
            }
            if (scale < 1.01) {
                scale = 1;
            }

            enlargeElement($element, scale);

        });
    });

}


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
