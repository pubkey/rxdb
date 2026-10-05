import React, { useEffect, useRef } from 'react';
import { LogoParts, logoColorsCss, createRunner, prefersReducedMotion, POP, OUT } from './shared';
import { WORDMARK_LETTERS } from './wordmark-letters';

/**
 * The full RxDB wordmark lockup builds itself: the icon pops in layer by
 * layer, each letter of "RxDB" draws its outline and fills in, the x
 * flashes pink, an underline sweeps in and the tagline follows.
 */
export function WordmarkReveal() {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg || prefersReducedMotion() || typeof svg.animate !== 'function') {
            return;
        }
        const runner = createRunner(svg);
        const root = svg.querySelector('.wr-root') as SVGGElement;
        const icon = svg.querySelector('.wr-icon') as SVGGElement;
        const outline = icon.querySelector('.outline') as SVGPathElement;
        const bars = Array.from(icon.querySelectorAll('.bar'));
        const small = Array.from(icon.querySelectorAll('.corner, .foot'));
        const letters = Array.from(root.querySelectorAll('.wr-letter'));
        const uline = root.querySelector('.wr-uline') as SVGRectElement;
        const tag = root.querySelector('.wr-tagline') as SVGTextElement;

        (async () => {
            while (!runner.isStopped()) {
                root.getAnimations({ subtree: true }).forEach(a => a.cancel());
                outline.animate([{ transform: 'scale(0)' }, { transform: 'none' }], { duration: 520, easing: POP, fill: 'both' });
                bars.forEach((b, i) => {
                    b.animate(
                        [{ transform: 'translateX(-140%)', opacity: 0 }, { transform: 'none', opacity: 1 }],
                        { duration: 650, delay: 280 + i * 120, easing: POP, fill: 'both' }
                    );
                });
                small.forEach((el, i) => {
                    el.animate(
                        [{ transform: 'scale(0) rotate(-180deg)' }, { transform: 'none' }],
                        { duration: 520, delay: 640 + i * 110, easing: POP, fill: 'both' }
                    );
                });
                letters.forEach((l, i) => {
                    l.animate(
                        [
                            { strokeDashoffset: 1, fillOpacity: 0 },
                            { strokeDashoffset: 0, fillOpacity: 0, offset: .7 },
                            { strokeDashoffset: 0, fillOpacity: 1 }
                        ],
                        { duration: 900, delay: 950 + i * 190, easing: 'ease-in-out', fill: 'both' }
                    );
                });
                letters[1].animate(
                    [{ fill: '#FFFFFF' }, { fill: '#ED168F', offset: .4 }, { fill: '#FFFFFF' }],
                    { duration: 900, delay: 2300 }
                );
                uline.animate([{ transform: 'scaleX(0)' }, { transform: 'none' }], { duration: 600, delay: 2700, easing: OUT, fill: 'both' });
                tag.animate(
                    [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
                    { duration: 500, delay: 3000, easing: OUT, fill: 'both' }
                );
                const out = root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, delay: 5700, fill: 'forwards' });
                await out.finished.catch(() => { });
                if (runner.isStopped()) {
                    return;
                }
                await runner.wait(300);
            }
        })();

        return () => runner.stop();
    }, []);

    return (
        <div className="wordmark-reveal">
            <style>{`
                .wordmark-reveal { line-height: 0; padding: 5% 4%; }
                .wordmark-reveal > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .wordmark-reveal .part { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.wordmark-reveal')}
                .wordmark-reveal .wr-letter { fill: #FFFFFF; stroke: #FFFFFF; stroke-width: 1.2; stroke-dasharray: 1; stroke-dashoffset: 0; transform-box: fill-box; transform-origin: center; }
                .wordmark-reveal .wr-uline { fill: #ED168F; transform-box: fill-box; transform-origin: left center; }
                .wordmark-reveal .wr-tagline { fill: #A29DB6; font-size: 13px; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
            `}</style>
            <svg
                ref={svgRef}
                viewBox="0 0 400 172"
                role="img"
                aria-label="Animated RxDB wordmark: the icon builds, the letters R x D B draw in, and the tagline appears"
            >
                <g className="wr-root">
                    <g className="wr-icon"><LogoParts /></g>
                    {WORDMARK_LETTERS.map((d, i) => (
                        <path key={i} className="wr-letter" pathLength={1} d={d} />
                    ))}
                    <rect className="wr-uline" x="143.33" y="118" width="248.5" height="4" />
                    <text className="wr-tagline" x="143.33" y="150" textLength="248.5" lengthAdjust="spacingAndGlyphs">The local-first database for JavaScript</text>
                </g>
            </svg>
        </div>
    );
}
