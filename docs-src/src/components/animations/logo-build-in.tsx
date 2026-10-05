import React, { useEffect, useRef } from 'react';
import { LogoParts, createRunner, logoColorsCss, prefersReducedMotion } from './shared';

/**
 * The RxDB logo builds itself: the frame draws its outline,
 * then the three layers slide in like documents written to storage
 * and the corner and foot pop into place. Replays in a loop.
 */
export function LogoBuildIn() {
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const root = rootRef.current;
        if (!root || prefersReducedMotion()) {
            return;
        }
        const runner = createRunner(root);
        (async () => {
            while (!runner.isStopped()) {
                root.classList.remove('play');
                // forces a style flush so the CSS animations restart
                void root.getBoundingClientRect();
                root.classList.add('play');
                await runner.wait(4500);
            }
        })();
        return () => {
            runner.stop();
            root.classList.remove('play');
        };
    }, []);

    return (
        <div className="logo-build-in" ref={rootRef}>
            <style>{`
                .logo-build-in { line-height: 0; }
                .logo-build-in > svg { display: block; width: 100%; height: auto; }
                .logo-build-in .lbi-logo { overflow: visible; }
                .logo-build-in .part, .logo-build-in .lbi-settle { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.logo-build-in')}
                .logo-build-in .lbi-tag { fill: #A29DB6; font-size: 9.5px; letter-spacing: .04em; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .logo-build-in.play .outline {
                    stroke: #FFFFFF;
                    stroke-width: 1.4;
                    stroke-dasharray: 1;
                    animation: logo-build-in-draw 1.1s ease-in-out both, logo-build-in-fill .45s .85s both;
                }
                .logo-build-in.play .bar { animation: logo-build-in-slide .75s cubic-bezier(.2, 1.4, .4, 1) both; }
                .logo-build-in.play .b1 { animation-delay: .8s; }
                .logo-build-in.play .b2 { animation-delay: .92s; }
                .logo-build-in.play .b3 { animation-delay: 1.04s; }
                .logo-build-in.play .corner { animation: logo-build-in-pop .6s 1.25s cubic-bezier(.2, 1.4, .4, 1) both; }
                .logo-build-in.play .foot { animation: logo-build-in-pop .6s 1.38s cubic-bezier(.2, 1.4, .4, 1) both; }
                .logo-build-in.play .lbi-settle { animation: logo-build-in-settle .5s 1.75s cubic-bezier(.16, 1, .3, 1); }
                @keyframes logo-build-in-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
                @keyframes logo-build-in-fill { from { fill-opacity: 0; } to { fill-opacity: 1; } }
                @keyframes logo-build-in-slide { from { transform: translateX(-140%); opacity: 0; } to { transform: none; opacity: 1; } }
                @keyframes logo-build-in-pop { from { transform: scale(0) rotate(-180deg); } to { transform: none; } }
                @keyframes logo-build-in-settle { 0%, 100% { transform: none; } 45% { transform: scale(1.06); } }
                @media (prefers-reduced-motion: reduce) {
                    .logo-build-in .part, .logo-build-in .lbi-settle { animation: none !important; }
                }
            `}</style>
            <svg
                viewBox="0 0 300 225"
                role="img"
                aria-label="The RxDB logo draws its outline, then its three layers slide in and the corner and foot pop into place."
            >
                <g className="lbi-settle">
                    <svg className="lbi-logo" x="95.2" y="38.25" width="109.6" height="148.5" viewBox="0 0 103.33 140">
                        <LogoParts />
                    </svg>
                </g>
                <text className="lbi-tag" x="10.5" y="215">intro</text>
            </svg>
        </div>
    );
}
