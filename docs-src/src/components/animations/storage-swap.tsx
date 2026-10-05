import React, { useEffect, useRef } from 'react';
import { LogoParts, logoColorsCss, POP, createRunner, prefersReducedMotion } from './shared';

const STORAGES: [string, string][] = [
    ['IndexedDB', 'browser'],
    ['OPFS', 'browser, fastest'],
    ['SQLite', 'React Native, Capacitor'],
    ['Memory', 'tests, caches'],
    ['localStorage', 'small apps'],
    ['Filesystem Node', 'Node.js']
];

/**
 * Storage swap: the bottom layer of the RxDB logo slides out and a different
 * RxStorage slides in. Switching storages is a configuration change, not a rewrite.
 */
export function StorageSwap() {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg || prefersReducedMotion() || typeof svg.animate !== 'function') {
            return;
        }
        const b3 = svg.querySelector('.storage-swap-mark .b3');
        const name = svg.querySelector('.storage-swap-name');
        const env = svg.querySelector('.storage-swap-env');
        if (!b3 || !name || !env) {
            return;
        }
        const runner = createRunner(svg);
        (async () => {
            let i = 0;
            while (!runner.isStopped()) {
                await runner.wait(1400);
                if (runner.isStopped()) {
                    return;
                }
                const outBar = b3.animate(
                    [{ transform: 'none', opacity: 1 }, { transform: 'translateX(60%)', opacity: 0 }],
                    { duration: 320, easing: 'cubic-bezier(.7, 0, .84, 0)', fill: 'forwards' }
                );
                [name, env].forEach(t => t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }));
                await outBar.finished.catch(() => { });
                if (runner.isStopped()) {
                    return;
                }
                i = (i + 1) % STORAGES.length;
                name.textContent = STORAGES[i][0];
                env.textContent = STORAGES[i][1];
                [b3, name, env].forEach(el => el.getAnimations().forEach(a => a.cancel()));
                b3.animate(
                    [{ transform: 'translateX(-60%)', opacity: 0 }, { transform: 'none', opacity: 1 }],
                    { duration: 520, easing: POP }
                );
                [name, env].forEach(t => t.animate(
                    [{ opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1, transform: 'none' }],
                    { duration: 300, delay: 120, fill: 'backwards' }
                ));
            }
        })();
        return () => {
            runner.stop();
            name.textContent = STORAGES[0][0];
            env.textContent = STORAGES[0][1];
        };
    }, []);

    return (
        <div className="storage-swap">
            <style>{`
                .storage-swap { line-height: 0; }
                .storage-swap > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .storage-swap .part { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.storage-swap')}
                .storage-swap .lead { stroke: #A29DB6; stroke-width: 1; opacity: .6; }
                .storage-swap text { font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .storage-swap .slbl { fill: #ECE9F2; font-size: 11px; font-weight: 700; }
                .storage-swap .ssub { fill: #A29DB6; font-size: 8.5px; }
            `}</style>
            <svg
                ref={svgRef}
                viewBox="-15 -5 280 160"
                role="img"
                aria-label="The bottom storage layer of the RxDB logo slides out and a different RxStorage such as IndexedDB, OPFS, SQLite or Memory slides in while RxDatabase and the RxStorage API stay the same."
            >
                <svg className="storage-swap-mark" x="4" y="5" width="103.33" height="140" viewBox="0 0 103.33 140">
                    <LogoParts />
                </svg>
                <line className="lead" x1="112" y1="48" x2="124" y2="48" />
                <line className="lead" x1="112" y1="75" x2="124" y2="75" />
                <line className="lead" x1="112" y1="101.7" x2="124" y2="101.7" />
                <text className="slbl" x="130" y="46">RxDatabase</text>
                <text className="ssub" x="130" y="56">your app</text>
                <text className="slbl" x="130" y="73">RxStorage</text>
                <text className="ssub" x="130" y="83">one API</text>
                <text className="slbl storage-swap-name" x="130" y="100">{STORAGES[0][0]}</text>
                <text className="ssub storage-swap-env" x="130" y="110">{STORAGES[0][1]}</text>
            </svg>
        </div>
    );
}
