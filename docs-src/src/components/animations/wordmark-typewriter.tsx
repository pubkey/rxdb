import React from 'react';
import { LogoParts, logoColorsCss } from './shared';
import { WORDMARK_LETTERS } from './wordmark-letters';

/**
 * The RxDB wordmark is typed letter by letter behind a blinking pink
 * cursor, like typing `npm install rxdb`, then it clears and starts over.
 */
export function WordmarkTypewriter() {
    return (
        <div className="wordmark-typewriter">
            <style>{`
                .wordmark-typewriter { line-height: 0; padding: 6% 6%; }
                .wordmark-typewriter > svg { display: block; width: 100%; height: auto; overflow: visible; }
                ${logoColorsCss('.wordmark-typewriter')}
                .wordmark-typewriter .wt-letter { fill: #FFFFFF; }
                .wordmark-typewriter .wt-l1 { animation: wordmark-typewriter-1 5s infinite; }
                .wordmark-typewriter .wt-l2 { animation: wordmark-typewriter-2 5s infinite; }
                .wordmark-typewriter .wt-l3 { animation: wordmark-typewriter-3 5s infinite; }
                .wordmark-typewriter .wt-l4 { animation: wordmark-typewriter-4 5s infinite; }
                .wordmark-typewriter .wt-cursor { fill: #ED168F; animation: wordmark-typewriter-cursor 5s infinite; }
                .wordmark-typewriter .wt-cursor rect { animation: wordmark-typewriter-blink .8s steps(1) infinite; }
                @keyframes wordmark-typewriter-1 { 0%, 12% { opacity: 0; } 12.1%, 88% { opacity: 1; } 92%, 100% { opacity: 0; } }
                @keyframes wordmark-typewriter-2 { 0%, 26% { opacity: 0; } 26.1%, 88% { opacity: 1; } 92%, 100% { opacity: 0; } }
                @keyframes wordmark-typewriter-3 { 0%, 40% { opacity: 0; } 40.1%, 88% { opacity: 1; } 92%, 100% { opacity: 0; } }
                @keyframes wordmark-typewriter-4 { 0%, 54% { opacity: 0; } 54.1%, 88% { opacity: 1; } 92%, 100% { opacity: 0; } }
                @keyframes wordmark-typewriter-cursor {
                    0%, 12% { transform: translateX(0); }
                    12.1%, 26% { transform: translateX(64px); }
                    26.1%, 40% { transform: translateX(119px); }
                    40.1%, 54% { transform: translateX(196px); }
                    54.1%, 90% { transform: translateX(250px); }
                    92%, 100% { transform: translateX(0); }
                }
                @keyframes wordmark-typewriter-blink { 0% { opacity: 1; } 50% { opacity: 0; } }
                @media (prefers-reduced-motion: reduce) {
                    .wordmark-typewriter .wt-letter, .wordmark-typewriter .wt-cursor rect { animation: none; }
                    .wordmark-typewriter .wt-cursor { animation: none; transform: translateX(250px); }
                }
            `}</style>
            <svg viewBox="0 0 404 140" role="img" aria-label="RxDB wordmark typed letter by letter with a blinking cursor">
                <LogoParts />
                {WORDMARK_LETTERS.map((d, i) => (
                    <path key={i} className={'wt-letter wt-l' + (i + 1)} d={d} />
                ))}
                <g className="wt-cursor"><rect x="145" y="33.33" width="7" height="73.34" /></g>
            </svg>
        </div>
    );
}
