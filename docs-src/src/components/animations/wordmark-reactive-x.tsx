import React from 'react';
import { LogoParts, logoColorsCss, POP } from './shared';
import { WORDMARK_LETTERS } from './wordmark-letters';

/**
 * A wave runs through the letters of the RxDB wordmark and into the
 * layers of the icon, which flash white. The x of Rx flashes pink.
 */
export function WordmarkReactiveX() {
    return (
        <div className="wordmark-reactive-x">
            <style>{`
                .wordmark-reactive-x { line-height: 0; padding: 4% 6%; }
                .wordmark-reactive-x > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .wordmark-reactive-x .part { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.wordmark-reactive-x')}
                .wordmark-reactive-x .b1 { --wrx-c: #ED168F; animation: wordmark-reactive-x-flash 3s .55s infinite; }
                .wordmark-reactive-x .b2 { --wrx-c: #B2218B; animation: wordmark-reactive-x-flash 3s .65s infinite; }
                .wordmark-reactive-x .b3 { --wrx-c: #752A8A; animation: wordmark-reactive-x-flash 3s .75s infinite; }
                .wordmark-reactive-x .wrx-letter { fill: #FFFFFF; transform-box: fill-box; transform-origin: center; animation: wordmark-reactive-x-wave 3s ${POP} infinite; }
                .wordmark-reactive-x .wrx-l2 { animation-name: wordmark-reactive-x-wave, wordmark-reactive-x-fill; animation-delay: .1s; }
                .wordmark-reactive-x .wrx-l3 { animation-delay: .2s; }
                .wordmark-reactive-x .wrx-l4 { animation-delay: .3s; }
                @keyframes wordmark-reactive-x-wave { 0%, 30%, 100% { transform: none; } 10% { transform: translateY(-10px); } 20% { transform: translateY(2px); } }
                @keyframes wordmark-reactive-x-fill { 0%, 42% { fill: #FFFFFF; } 50% { fill: #ED168F; } 70%, 100% { fill: #FFFFFF; } }
                @keyframes wordmark-reactive-x-flash { 0% { fill: #FFFFFF; } 40%, 100% { fill: var(--wrx-c); } }
                @media (prefers-reduced-motion: reduce) {
                    .wordmark-reactive-x .bar, .wordmark-reactive-x .wrx-letter { animation: none; }
                }
            `}</style>
            <svg viewBox="0 -14 394 160" role="img" aria-label="RxDB wordmark letters bouncing in a wave while the x flashes pink">
                <LogoParts />
                {WORDMARK_LETTERS.map((d, i) => (
                    <path key={i} className={'wrx-letter wrx-l' + (i + 1)} d={d} />
                ))}
            </svg>
        </div>
    );
}
