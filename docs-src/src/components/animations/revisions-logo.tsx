import React, { useEffect, useRef } from 'react';
import { LogoParts, OUT, createRunner, prefersReducedMotion } from './shared';

function hex4() {
    return Math.floor(Math.random() * 65536).toString(16).padStart(4, '0');
}

/**
 * Every write to a layer of the RxDB logo flashes the layer
 * and increments its revision height and hash.
 */
export function RevisionsLogo() {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg || prefersReducedMotion() || typeof svg.animate !== 'function') {
            return;
        }
        const runner = createRunner(svg);
        const bars = Array.from(svg.querySelectorAll('.revisions-logo-mark .bar'));
        const vals = Array.from(svg.querySelectorAll('.revisions-logo-rev .v'));
        const heights = [1, 1, 1];
        (async () => {
            while (!runner.isStopped()) {
                await runner.wait(900);
                if (runner.isStopped()) {
                    return;
                }
                const i = Math.floor(Math.random() * 3);
                heights[i]++;
                const bar = bars[i];
                const val = vals[i];
                if (!bar || !val) {
                    continue;
                }
                bar.classList.remove('hit');
                void bar.getBoundingClientRect();
                bar.classList.add('hit');
                val.textContent = heights[i] + '-' + hex4();
                const line = val.parentElement;
                if (line) {
                    line.animate(
                        [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }],
                        { duration: 300, easing: OUT }
                    );
                }
            }
        })();
        return () => runner.stop();
    }, []);

    return (
        <div className="revisions-logo">
            <style>{`
                .revisions-logo { line-height: 0; }
                .revisions-logo > svg { display: block; width: 100%; height: auto; }
                .revisions-logo text { font-family: 'Atkinson Hyperlegible Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace; }
                .revisions-logo .part { transform-box: fill-box; transform-origin: center; }
                .revisions-logo .outline { fill: #FFFFFF; }
                .revisions-logo .b1 { --c: #ED168F; }
                .revisions-logo .b2 { --c: #B2218B; }
                .revisions-logo .b3 { --c: #752A8A; }
                .revisions-logo .bar { fill: var(--c); }
                .revisions-logo .corner { fill: #ED168F; }
                .revisions-logo .foot { fill: #752A8A; }
                .revisions-logo .bar.hit { animation: revisions-logo-flash .6s; }
                .revisions-logo .revisions-logo-rev { fill: #ECE9F2; font-size: 10px; font-weight: 700; font-variant-numeric: tabular-nums; }
                .revisions-logo .revisions-logo-rev .k { fill: #A29DB6; font-weight: 400; }
                @keyframes revisions-logo-flash {
                    0% { fill: #FFFFFF; }
                    40%, 100% { fill: var(--c); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .revisions-logo .bar.hit { animation: none; }
                }
            `}</style>
            <svg
                ref={svgRef}
                viewBox="0 0 400 300"
                role="img"
                aria-label="Each write to a layer of the RxDB logo increments the revision of that layer."
            >
                <svg x="24" y="51" width="352" height="198" viewBox="0 0 230 140" overflow="visible">
                    <svg className="revisions-logo-mark" x="0" y="0" width="103.33" height="140" viewBox="0 0 103.33 140">
                        <LogoParts />
                    </svg>
                    <text className="revisions-logo-rev" x="114" y="46.3"><tspan className="k">_rev </tspan><tspan className="v">1-a3f2</tspan></text>
                    <text className="revisions-logo-rev" x="114" y="73"><tspan className="k">_rev </tspan><tspan className="v">1-c81e</tspan></text>
                    <text className="revisions-logo-rev" x="114" y="99.7"><tspan className="k">_rev </tspan><tspan className="v">1-07bd</tspan></text>
                </svg>
            </svg>
        </div>
    );
}
