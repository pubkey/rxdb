import React, { useEffect, useRef } from 'react';
import { LogoParts, OUT, POP, createRunner, logoColorsCss, prefersReducedMotion } from './shared';

const TABS = [20, 115, 210];
const CROWN_X = [45, 140, 235];

/**
 * Three browser tabs share one RxDB database. When the leader tab closes,
 * the leader crown moves to the next tab, so only one tab talks to the server.
 */
export function LeaderElectionTabs() {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg || prefersReducedMotion() || typeof svg.animate !== 'function') {
            return;
        }
        const tabs = Array.from(svg.querySelectorAll<SVGGElement>('.tab'));
        const crown = svg.querySelector<SVGPathElement>('.crown');
        if (!crown || tabs.length !== CROWN_X.length) {
            return;
        }
        const runner = createRunner(svg);
        (async () => {
            let leader = 0;
            while (!runner.isStopped()) {
                await runner.wait(1400);
                if (runner.isStopped()) {
                    return;
                }
                const closing = tabs[leader];
                closing.animate(
                    [{ opacity: 1, transform: 'none' }, { opacity: .18, transform: 'translateY(6px) scale(.94)' }],
                    { duration: 380, easing: OUT, fill: 'forwards' }
                );
                await runner.wait(300);
                if (runner.isStopped()) {
                    return;
                }
                const next = (leader + 1) % tabs.length;
                const mid = (CROWN_X[leader] + CROWN_X[next]) / 2;
                await crown.animate([
                    { transform: 'translate(' + CROWN_X[leader] + 'px, 0)' },
                    { transform: 'translate(' + mid + 'px, -14px)' },
                    { transform: 'translate(' + CROWN_X[next] + 'px, 0)' }
                ], { duration: 560, easing: 'ease-in-out', fill: 'forwards' }).finished.catch(() => { });
                if (runner.isStopped()) {
                    return;
                }
                crown.getAnimations().forEach(a => a.cancel());
                crown.style.transform = 'translate(' + CROWN_X[next] + 'px, 0)';
                crown.animate(
                    [{ transform: 'translate(' + CROWN_X[next] + 'px, 0) scale(1.15, .8)' }, { transform: 'translate(' + CROWN_X[next] + 'px, 0)' }],
                    { duration: 260, easing: POP }
                );
                tabs[next].animate(
                    [{ transform: 'none' }, { transform: 'translateY(-4px)' }, { transform: 'none' }],
                    { duration: 360, easing: OUT }
                );
                runner.wait(700).then(() => {
                    closing.getAnimations().forEach(a => a.cancel());
                    closing.animate(
                        [{ opacity: .18, transform: 'translateY(6px) scale(.94)' }, { opacity: 1, transform: 'none' }],
                        { duration: 420, easing: POP }
                    );
                });
                leader = next;
            }
        })();
        return () => runner.stop();
    }, []);

    return (
        <div className="leader-election-tabs">
            <style>{`
                .leader-election-tabs { line-height: 0; }
                .leader-election-tabs > svg { display: block; width: 100%; height: auto; }
                .leader-election-tabs .part { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.leader-election-tabs')}
                .leader-election-tabs .tab-label {
                    fill: #A29DB6;
                    font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
                    font-size: 9px;
                    letter-spacing: .06em;
                }
                .leader-election-tabs .crown { fill: #ED168F; stroke: #FFFFFF; stroke-width: 3; stroke-linejoin: round; paint-order: stroke; }
                .leader-election-tabs .tab { transform-box: fill-box; transform-origin: center bottom; }
            `}</style>
            <svg
                ref={svgRef}
                viewBox="0 -8 300 162"
                role="img"
                aria-label="Three browser tabs share one RxDB database. When the leader tab closes, the leader crown moves to the next tab."
            >
                {TABS.map(x => (
                    <g key={x} className="tab">
                        <svg x={x} y="36" width="70" height="95" viewBox="0 0 103.33 140">
                            <LogoParts />
                        </svg>
                    </g>
                ))}
                {TABS.map((x, i) => (
                    <text key={x} className="tab-label" x={x + 35} y="146" textAnchor="middle">{'tab ' + (i + 1)}</text>
                ))}
                <g transform="translate(0 12)">
                    <path className="crown" d="M0 16 V3 l5 5 5 -8 5 8 5 -5 V16z" style={{ transform: 'translate(45px, 0)' }} />
                </g>
            </svg>
        </div>
    );
}
