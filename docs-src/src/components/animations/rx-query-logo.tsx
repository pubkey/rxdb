import React, { useEffect, useRef } from 'react';
import { LogoParts, OUT, createRunner, prefersReducedMotion } from './shared';

const PART_NAMES = ['b1', 'b2', 'b3', 'corner', 'foot'];
const QUERIES: [string, string[], number][] = [
    ['find({ color: \'pink\' })', ['b1', 'corner'], 1],
    ['find({ color: \'purple\' })', ['b3', 'foot'], 1],
    ['find({ color: { $ne: \'magenta\' } })', ['b1', 'corner', 'b3', 'foot'], 2],
    ['find({ color: \'magenta\' })', ['b2'], 1],
    ['find({})', PART_NAMES, 3]
];

/**
 * MongoDB-style queries run against the parts of the RxDB logo.
 * Parts that match the selector stay lit, the rest dims
 * and the result count below updates.
 */
export function RxQueryLogo() {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg || prefersReducedMotion() || typeof svg.animate !== 'function') {
            return;
        }
        const runner = createRunner(svg);
        const qText = svg.querySelector('.rx-query-logo-code');
        const qCount = svg.querySelector('.rx-query-logo-count');
        (async () => {
            let i = QUERIES.length - 1;
            while (!runner.isStopped()) {
                await runner.wait(1800);
                if (runner.isStopped()) {
                    return;
                }
                i = (i + 1) % QUERIES.length;
                const [text, hits, count] = QUERIES[i];
                if (qText) {
                    qText.textContent = text;
                }
                if (qCount) {
                    qCount.textContent = count + (count === 1 ? ' doc' : ' docs');
                }
                PART_NAMES.forEach(name => {
                    const el = svg.querySelector('.rx-query-logo-mark .' + name);
                    if (!el) {
                        return;
                    }
                    const hit = hits.includes(name);
                    el.classList.toggle('dim', !hit);
                    if (hit && el.classList.contains('bar')) {
                        el.animate(
                            [{ transform: 'none' }, { transform: 'translateX(5px)' }, { transform: 'none' }],
                            { duration: 420, easing: OUT }
                        );
                    }
                });
            }
        })();
        return () => runner.stop();
    }, []);

    return (
        <div className="rx-query-logo">
            <style>{`
                .rx-query-logo { line-height: 0; }
                .rx-query-logo > svg { display: block; width: 100%; height: auto; }
                .rx-query-logo text { font-family: 'Atkinson Hyperlegible Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace; }
                .rx-query-logo .part { transform-box: fill-box; transform-origin: center; transition: opacity .45s cubic-bezier(.16, 1, .3, 1); }
                .rx-query-logo .outline { fill: #FFFFFF; }
                .rx-query-logo .b1, .rx-query-logo .corner { fill: #ED168F; }
                .rx-query-logo .b2 { fill: #B2218B; }
                .rx-query-logo .b3, .rx-query-logo .foot { fill: #752A8A; }
                .rx-query-logo .dim { opacity: .14; }
                .rx-query-logo .rx-query-logo-caption { font-size: 11px; fill: #A29DB6; }
                .rx-query-logo .rx-query-logo-code { fill: #ECE9F2; }
                .rx-query-logo .rx-query-logo-count { fill: #ED168F; }
                @media (prefers-reduced-motion: reduce) {
                    .rx-query-logo .part { transition: none; }
                }
            `}</style>
            <svg
                ref={svgRef}
                viewBox="0 0 400 300"
                role="img"
                aria-label="RxDB logo parts that match a MongoDB-style query stay lit while the rest dims and the result count updates."
            >
                <svg className="rx-query-logo-mark" x="24" y="38" width="352" height="198" viewBox="0 0 103.33 140" overflow="visible">
                    <LogoParts />
                </svg>
                <text className="rx-query-logo-caption" x="200" y="257" textAnchor="middle">
                    <tspan className="rx-query-logo-code">find({'{}'})</tspan>
                    {' '}
                    <tspan className="rx-query-logo-count">3 docs</tspan>
                </text>
            </svg>
        </div>
    );
}
