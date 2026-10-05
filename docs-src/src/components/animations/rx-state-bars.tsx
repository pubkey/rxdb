import React, { useEffect, useRef } from 'react';
import { LogoParts, createRunner, logoColorsCss, prefersReducedMotion } from './shared';

const NAMES = ['pink', 'magenta', 'purple'];
const STEPS: [number, number][] = [
    [0, .45], [2, .8], [1, .3], [0, .9], [2, .55], [1, .7], [0, 1], [1, 1], [2, 1]
];

/**
 * Each layer of the RxDB logo is one field of a reactive RxState object.
 * Every state.set() call changes a value and the layer
 * follows it with an overshoot.
 */
export function RxStateBars() {
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const root = rootRef.current;
        if (!root || prefersReducedMotion()) {
            return;
        }
        const bars = Array.from(root.querySelectorAll<SVGElement>('.bar'));
        const call = root.querySelector('.rsb-call');
        if (bars.length < 3 || !call) {
            return;
        }
        const runner = createRunner(root);
        (async () => {
            let n = 0;
            while (!runner.isStopped()) {
                await runner.wait(1400);
                if (runner.isStopped()) {
                    return;
                }
                const [index, value] = STEPS[n % STEPS.length];
                n++;
                bars[index].style.transform = 'scaleX(' + value + ')';
                call.textContent = 'state.set(\'' + NAMES[index] + '\', ' + value.toFixed(2) + ')';
            }
        })();
        return () => runner.stop();
    }, []);

    return (
        <div className="rx-state-bars" ref={rootRef}>
            <style>{`
                .rx-state-bars { line-height: 0; }
                .rx-state-bars > svg { display: block; width: 100%; height: auto; }
                .rx-state-bars .part { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.rx-state-bars')}
                .rx-state-bars .bar { transform-origin: left center; transition: transform .7s cubic-bezier(.2, 1.4, .4, 1); }
                .rx-state-bars .rsb-call { fill: #ED168F; font-size: 9px; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
                @media (prefers-reduced-motion: reduce) {
                    .rx-state-bars .bar { transition: none; }
                }
            `}</style>
            <svg
                viewBox="0 0 240 180"
                role="img"
                aria-label="The three layers of the RxDB logo act as values of a reactive state object. Each state.set() call changes the width of one layer."
            >
                <svg x="72" y="14" width="96" height="130" viewBox="0 0 103.33 140" overflow="visible">
                    <LogoParts />
                </svg>
                <text className="rsb-call" x="120" y="166" textAnchor="middle">state.set('pink', 1.00)</text>
            </svg>
        </div>
    );
}
