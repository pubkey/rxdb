import React from 'react';

export const SVGNS = 'http://www.w3.org/2000/svg';
export const COLORS = ['#ED168F', '#B2218B', '#752A8A'];
export const POP = 'cubic-bezier(.2, 1.4, .4, 1)';
export const OUT = 'cubic-bezier(.16, 1, .3, 1)';

const OUTLINE = 'M98.33 10c-2.76 0-5-2.24-5-5s-2.24-5-5-5H75c-2.76 0-5 2.24-5 5v16.67c0 2.76-2.24 5-5 5H5c-2.76 0-5 2.24-5 5V125c0 2.76 2.24 5 5 5s5 2.24 5 5 2.24 5 5 5h13.33c2.76 0 5-2.24 5-5v-16.67c0-2.76 2.24-5 5-5h60c2.76 0 5-2.24 5-5V15c0-2.76-2.24-5-5-5';

/**
 * The parts of the RxDB logo for a viewBox of 0 0 103.33 140.
 * Every part has the class "part" plus one of
 * outline, b1, b2, b3, corner or foot.
 */
export function LogoParts() {
    return (
        <>
            <path className="part outline" pathLength={1} d={OUTLINE} />
            <rect className="part bar b1" x="6.66" y="33.34" width="90" height="20" />
            <rect className="part bar b2" x="6.67" y="60" width="90" height="20" />
            <rect className="part bar b3" x="6.66" y="86.66" width="90" height="20" />
            <path className="part corner" d="M86.67 6.67v10h10v10h-20v-20z" />
            <path className="part foot" d="M26.67 113.33v20h-10v-10h-10v-10z" />
        </>
    );
}

/**
 * CSS that colors the LogoParts inside an element with the given selector.
 */
export function logoColorsCss(scope: string) {
    return `
        ${scope} .outline { fill: #FFFFFF; }
        ${scope} .b1, ${scope} .corner { fill: #ED168F; }
        ${scope} .b2 { fill: #B2218B; }
        ${scope} .b3, ${scope} .foot { fill: #752A8A; }
    `;
}

export function prefersReducedMotion() {
    return typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export type AnimationRunner = {
    /**
     * Resolves after the given milliseconds.
     * Pending waits are dropped when the runner is stopped.
     */
    wait(ms: number): Promise<void>;
    isStopped(): boolean;
    stop(): void;
};

/**
 * Creates the timer bookkeeping for a JavaScript driven animation loop.
 * Call stop() in the cleanup function of the useEffect hook,
 * it clears all timers and cancels all animations inside of root.
 */
export function createRunner(root: Element): AnimationRunner {
    let stopped = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    return {
        wait(ms: number) {
            return new Promise<void>(res => {
                const t = setTimeout(() => {
                    timers.delete(t);
                    res();
                }, ms);
                timers.add(t);
            });
        },
        isStopped() {
            return stopped;
        },
        stop() {
            stopped = true;
            timers.forEach(t => clearTimeout(t));
            timers.clear();
            root.getAnimations?.({ subtree: true }).forEach(a => a.cancel());
        }
    };
}
