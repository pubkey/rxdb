import {
    ensureNotFalsy,
    RxLocalDocument,
    now,
    promiseWait
} from '../';
import {
    merge,
    fromEvent,
    map,
    distinctUntilChanged
} from 'rxjs';
import { getDatabase } from './database';


type MousePositionType = {
    x: number;
    y: number;
    time: number;
};

type BeatingValuesType = {
    beatPeriod: number;
    text1: string;
    text2: string;
    color: string;
};

const dbPromise = getDatabase();


window.onload = async function () {



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


    const database = await dbPromise;


    // once insert if not exists
    try {
        await database.insertLocal<BeatingValuesType>('beatingvalues', {
            beatPeriod: 0,
            text1: 'JavaScript',
            text2: 'you deserve',
            color: colors[0]
        });
    } catch (err) { }

    const beatingValuesDoc = ensureNotFalsy(await database.getLocal<BeatingValuesType>('beatingvalues'));
    (async () => {
        await promiseWait(heartbeatDuration);
        while (true) {
            const beatInfo = getBeatCurrentBeatInfo();
            const nextBeatPromise = promiseWait(beatInfo.timeToNextPeriod);
            // only every second interval so we have a pause in between
            if (beatInfo.period % 2 === 0) {
                try {
                    await beatingValuesDoc.atomicUpdate(docData => {
                        if (docData.beatPeriod >= beatInfo.period) {
                            return docData;
                        }
                        docData.beatPeriod = beatInfo.period;
                        docData.color = colors[beatInfo.period % 3];

                        if (beatInfo.period % 4 === 0) {
                            docData.text1 = shuffleWithSeed(textsFirst, beatInfo.period)[0];
                        } else {
                            docData.text2 = shuffleWithSeed(textsSecond, beatInfo.period)[0];
                        }

                        return docData;
                    });
                } catch (err) { }
            }
            await nextBeatPromise;
        }
    })();


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
    const $$beatingColorString: any[] = document.getElementsByClassName('beating-color-string') as any;

    // const $swapOutFirst = ensureNotFalsy(document.getElementById('swap-out-first'));
    // const $swapOutSecond = ensureNotFalsy(document.getElementById('swap-out-second'));


    const heartbeatListeners: any[] = [];
    let heartbeatIndex = 0;
    const heartbeatTimeToFirstBeat = 105;

    getBeatCurrentBeatInfo();



    beatingValuesDoc.$
        .pipe(
            map(d => d.data),
            distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
        )
        .subscribe((beatingValuesDocInner: BeatingValuesType) => {

            heartbeatListeners.forEach(function (listener) {
                listener(heartbeatIndex);
            });
            heartbeatIndex = heartbeatIndex + 1;


            // $swapOutFirst.innerHTML = beatingValuesDocInner.text1;
            // $swapOutSecond.innerHTML = beatingValuesDocInner.text2;

            const color = beatingValuesDocInner.color;
            Array.from($$beatingColor).forEach(function (element) {
                element.style.backgroundColor = color;
            });

            Array.from($$beatingColorString).forEach(function (element) {
                element.innerHTML = color;
            });
        });

    // css animation of big logo on heartbeat
    heartbeatListeners.push(function () {
        Array.from($$beating).forEach(function (element) {
            element.style.animationDuration = heartbeatDuration + 'ms';
            element.classList.remove('animation');
            element.classList.add('animation');
        });
        Array.from($$beatingFirst).forEach(function (element) {
            element.style.animationDuration = heartbeatDuration + 'ms';
            element.classList.remove('animation');
            element.classList.add('animation');
        });
        Array.from($$beatingSecond).forEach(function (element) {
            element.style.animationDuration = heartbeatDuration + 'ms';
            element.classList.remove('animation');
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
        if (
            !mousePos.data.time ||
            !mousePos.data.x ||
            !mousePos.data.y
        ) {
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

const heartbeatDuration = 851;

function getBeatCurrentBeatInfo() {
    // remove a big chunk so we do not have a large number for better precision.
    const time = new Date().getTime() - 1960000000;
    const ratio = time / heartbeatDuration;
    const period = Math.floor(ratio);
    const timeToNextPeriod = (ratio - period) * heartbeatDuration;
    return {
        ratio,
        period,
        timeToNextPeriod
    };
}

const colors = [
    '#e6008d',
    '#8d2089',
    '#5f2688'
];


const textsFirst = [
    'NoSQL',
    'OfflineFirst',
    'JavaScript',
    'observable',
    'reactive',
    'realtime',
    'client side',
    'fast'
];
const textsSecond = [
    'for the Web',
    'for Node.js',
    'for Browsers',
    'for Capacitor',
    'for Electron',
    'for hybrid apps',
    'for PWAs',
    'for React Native',
    'for NativeScript',
    'for UI apps',
    'you deserve',
    'that syncs',
];


// UTILS

function randomBoolean() {
    return Math.random() < 0.5;
}


/**
 * @link https://stackoverflow.com/questions/16801687/javascript-random-ordering-with-seed
 */
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
    array = array.slice(0);
    let m = array.length;
    let t;
    let i;

    // While there remain elements to shuffle…
    while (m) {

        // Pick a remaining element…
        i = Math.floor(random(seed) * m--);

        // And swap it with the current element.
        t = array[m];
        array[m] = array[i];
        array[i] = t;
        ++seed;
    }

    return array;
}

function random(seed: number) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}
