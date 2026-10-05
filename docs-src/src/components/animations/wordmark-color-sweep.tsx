import React, { useEffect, useId, useRef } from 'react';
import { LogoParts, logoColorsCss, prefersReducedMotion } from './shared';
import { WORDMARK_LETTERS } from './wordmark-letters';

/**
 * The three layer colors of the RxDB logo sweep through the letters of
 * the wordmark from left to right while the icon stays still.
 */
export function WordmarkColorSweep() {
    const svgRef = useRef<SVGSVGElement>(null);
    const gradientId = 'wordmark-color-sweep-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');

    useEffect(() => {
        const svg = svgRef.current;
        if (svg && prefersReducedMotion()) {
            svg.pauseAnimations?.();
        }
    }, []);

    return (
        <div className="wordmark-color-sweep">
            <style>{`
                .wordmark-color-sweep { line-height: 0; padding: 6% 6%; }
                .wordmark-color-sweep > svg { display: block; width: 100%; height: auto; overflow: visible; }
                ${logoColorsCss('.wordmark-color-sweep')}
            `}</style>
            <svg ref={svgRef} viewBox="0 0 394 140" role="img" aria-label="RxDB wordmark with a brand color gradient sweeping through the letters">
                <defs>
                    <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="400" y2="0" spreadMethod="repeat">
                        <stop offset="0" stopColor="#FFFFFF" />
                        <stop offset=".35" stopColor="#FFFFFF" />
                        <stop offset=".5" stopColor="#ED168F" />
                        <stop offset=".6" stopColor="#B2218B" />
                        <stop offset=".7" stopColor="#752A8A" />
                        <stop offset=".85" stopColor="#FFFFFF" />
                        <stop offset="1" stopColor="#FFFFFF" />
                        <animateTransform attributeName="gradientTransform" type="translate" from="-400 0" to="400 0" dur="3.2s" repeatCount="indefinite" />
                    </linearGradient>
                </defs>
                <LogoParts />
                {WORDMARK_LETTERS.map((d, i) => (
                    <path key={i} fill={'url(#' + gradientId + ')'} d={d} />
                ))}
            </svg>
        </div>
    );
}
