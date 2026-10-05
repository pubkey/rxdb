import React from 'react';
import { LogoParts } from './shared';

/**
 * The layers of the RxDB logo emit one after another with a ripple,
 * while marbles travel along a stream line, like the results of an
 * observable query that delivers every change to its subscriber.
 */
export function ReactiveStream() {
    return (
        <div className="reactive-stream">
            <style>{`
                .reactive-stream { line-height: 0; }
                .reactive-stream > svg { display: block; width: 100%; height: auto; }
                .reactive-stream .rst-logo { overflow: visible; }
                .reactive-stream .part { transform-box: fill-box; transform-origin: center; }
                .reactive-stream .outline { fill: #FFFFFF; }
                .reactive-stream .b1 { --rst-c: #ED168F; }
                .reactive-stream .b2 { --rst-c: #B2218B; }
                .reactive-stream .b3 { --rst-c: #752A8A; }
                .reactive-stream .bar { fill: var(--rst-c); animation: reactive-stream-emit 2.4s cubic-bezier(.16, 1, .3, 1) infinite; }
                .reactive-stream .corner { fill: #ED168F; }
                .reactive-stream .foot { fill: #752A8A; animation: reactive-stream-emit-foot 2.4s .6s cubic-bezier(.16, 1, .3, 1) infinite; }
                .reactive-stream .rst-ghost { fill: var(--rst-c); opacity: 0; animation: reactive-stream-ripple 2.4s cubic-bezier(.16, 1, .3, 1) infinite; }
                .reactive-stream .b2 { animation-delay: .22s; }
                .reactive-stream .b3 { animation-delay: .44s; }
                .reactive-stream .rst-track { fill: #262B40; }
                .reactive-stream .rst-end { fill: #A29DB6; }
                .reactive-stream .rst-marble { opacity: 0; animation: reactive-stream-marble 2.4s linear infinite; }
                .reactive-stream .rst-m2 { animation-delay: -.8s; }
                .reactive-stream .rst-m3 { animation-delay: -1.6s; }
                .reactive-stream .rst-tag { fill: #A29DB6; font-size: 9.5px; letter-spacing: .04em; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                @keyframes reactive-stream-emit {
                    0% { fill: #FFFFFF; transform: translateX(5px); }
                    30%, 100% { fill: var(--rst-c); transform: none; }
                }
                @keyframes reactive-stream-emit-foot {
                    0% { transform: translateY(3px); }
                    30%, 100% { transform: none; }
                }
                @keyframes reactive-stream-ripple {
                    0% { opacity: .45; transform: scale(1); }
                    45%, 100% { opacity: 0; transform: scale(1.12, 1.6); }
                }
                @keyframes reactive-stream-marble {
                    from { transform: translateX(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    to { transform: translateX(200px); opacity: 0; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .reactive-stream .bar, .reactive-stream .foot, .reactive-stream .rst-ghost, .reactive-stream .rst-marble { animation: none; }
                    .reactive-stream .rst-marble { opacity: 1; }
                    .reactive-stream .rst-m2 { transform: translateX(66.7px); }
                    .reactive-stream .rst-m3 { transform: translateX(133.3px); }
                }
            `}</style>
            <svg
                viewBox="0 0 300 225"
                role="img"
                aria-label="The three layers of the RxDB logo light up one after another with a ripple while colored marbles flow along a stream line, like results emitted by an observable query."
            >
                <svg className="rst-logo" x="82.47" y="26.25" width="135.06" height="148.5" viewBox="-12 0 127.33 140">
                    <LogoParts />
                    <rect className="rst-ghost b1" x="6.66" y="33.34" width="90" height="20" />
                    <rect className="rst-ghost b2" x="6.67" y="60" width="90" height="20" />
                    <rect className="rst-ghost b3" x="6.66" y="86.66" width="90" height="20" />
                </svg>
                <rect className="rst-track" x="45" y="190.75" width="210" height="2" />
                <rect className="rst-end" x="254" y="185.75" width="2" height="12" />
                <circle className="rst-marble" cx="50" cy="191.75" r="5" fill="#ED168F" />
                <circle className="rst-marble rst-m2" cx="50" cy="191.75" r="5" fill="#B2218B" />
                <circle className="rst-marble rst-m3" cx="50" cy="191.75" r="5" fill="#752A8A" />
                <text className="rst-tag" x="10.5" y="215">query.$.subscribe()</text>
            </svg>
        </div>
    );
}
