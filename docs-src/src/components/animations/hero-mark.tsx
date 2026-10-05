import React, { useEffect, useRef } from 'react';
import { LogoParts, logoColorsCss, createRunner, prefersReducedMotion, POP, OUT } from './shared';

const RUNTIMES = ['Browsers', 'Node.js', 'Electron', 'React Native', 'Capacitor', 'Deno', 'Bun'];
const TEXT_X = 110;

/**
 * The RxDB logo whose three layers extend out of the frame into rails
 * that name the features: works offline, syncs with any backend and
 * observable realtime queries. Below the foot piece the supported
 * JavaScript runtimes cycle.
 */
export function HeroMark() {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) {
            return;
        }
        const runner = createRunner(svg);
        const rails = Array.from(svg.querySelectorAll<SVGRectElement>('.hm-rail'));
        const texts = Array.from(svg.querySelectorAll<SVGTextElement>('.hm-rail-text'));
        const runtimeEl = svg.querySelector('.hm-rt') as SVGTSpanElement;

        const fitRails = () => {
            texts.forEach((t, i) => {
                const end = TEXT_X + t.getComputedTextLength() + 12;
                rails[i].setAttribute('width', (end - Number(rails[i].getAttribute('x'))).toFixed(2));
            });
        };
        fitRails();
        document.fonts?.ready.then(() => {
            if (!runner.isStopped()) {
                fitRails();
            }
        }).catch(() => { });

        if (prefersReducedMotion() || typeof svg.animate !== 'function') {
            return () => runner.stop();
        }

        const setRuntime = (name: string) => {
            if (runtimeEl.firstChild) {
                runtimeEl.firstChild.nodeValue = name;
            } else {
                runtimeEl.textContent = name;
            }
        };

        (async () => {
            let i = 0;
            while (!runner.isStopped()) {
                await runner.wait(1500);
                if (runner.isStopped()) {
                    return;
                }
                await runtimeEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }).finished.catch(() => { });
                if (runner.isStopped()) {
                    return;
                }
                i = (i + 1) % RUNTIMES.length;
                setRuntime(RUNTIMES[i]);
                runtimeEl.getAnimations().forEach(a => a.cancel());
                runtimeEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
            }
        })();

        (async () => {
            const els: Element[] = [...rails, ...texts];
            while (!runner.isStopped()) {
                els.forEach(el => el.getAnimations().forEach(a => a.cancel()));
                let t = 300;
                rails.forEach((rail, i) => {
                    rail.animate(
                        [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
                        { duration: 700, delay: t, easing: POP, fill: 'both' }
                    );
                    texts[i].animate(
                        [{ opacity: 0, transform: 'translateX(-8px)' }, { opacity: 1, transform: 'none' }],
                        { duration: 380, delay: t + 260, easing: OUT, fill: 'both' }
                    );
                    t += 850;
                });
                t += 3200;
                let last: Animation | undefined;
                for (let i = rails.length - 1; i >= 0; i--) {
                    texts[i].animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: t, fill: 'forwards' });
                    last = rails[i].animate(
                        [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
                        { duration: 420, delay: t + 120, easing: 'cubic-bezier(.7,0,.84,0)', fill: 'forwards' }
                    );
                    t += 140;
                }
                await last?.finished.catch(() => { });
                if (runner.isStopped()) {
                    return;
                }
                await runner.wait(500);
            }
        })();

        return () => runner.stop();
    }, []);

    return (
        <div className="hero-mark">
            <style>{`
                .hero-mark { line-height: 0; padding: 4% 4%; }
                .hero-mark > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .hero-mark .part { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.hero-mark')}
                .hero-mark text { font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .hero-mark .hm-rail { transform-box: fill-box; transform-origin: left center; }
                .hero-mark .hm-rail.b1 { fill: #ED168F; }
                .hero-mark .hm-rail.b2 { fill: #B2218B; }
                .hero-mark .hm-rail.b3 { fill: #752A8A; }
                .hero-mark .hm-rail-text { fill: #FFFFFF; font-size: 11px; font-weight: 700; }
                .hero-mark .hm-runtime { fill: #A29DB6; font-size: 10px; }
                .hero-mark .hm-rt { fill: #ECE9F2; font-weight: 700; }
            `}</style>
            <svg
                ref={svgRef}
                viewBox="0 0 360 150"
                role="img"
                aria-label="Animated RxDB logo whose three layers extend into the features: works offline, syncs with any backend, observable realtime queries. Below it the supported JavaScript runtimes cycle."
            >
                <g transform="translate(4 5)">
                    <LogoParts />
                    <rect className="hm-rail b1" x="95.66" y="33.34" height="20" width="120" />
                    <rect className="hm-rail b2" x="95.67" y="60" height="20" width="180" />
                    <rect className="hm-rail b3" x="95.66" y="86.66" height="20" width="220" />
                    <text className="hm-rail-text" x={TEXT_X} y="47.3">works offline</text>
                    <text className="hm-rail-text" x={TEXT_X} y="74">syncs with any backend</text>
                    <text className="hm-rail-text" x={TEXT_X} y="100.7">observable realtime queries</text>
                    <text className="hm-runtime" x="40" y="127.5">runs in <tspan className="hm-rt">{RUNTIMES[0]}</tspan></text>
                </g>
            </svg>
        </div>
    );
}
