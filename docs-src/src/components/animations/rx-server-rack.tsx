import React, { useEffect, useRef } from 'react';
import { LogoParts, logoColorsCss, OUT, SVGNS, createRunner, prefersReducedMotion } from './shared';

type Point = [number, number];

const DEV: { phone: Point; laptop: Point; curl: Point; } = { phone: [27, 34], laptop: [34, 74], curl: [33, 112] };
const A: Point = [104, 56];
const B: Point = [104, 104];

/**
 * An RxServer rack serves one collection through a replication endpoint
 * and a REST endpoint. Apps replicate and get live updates when another
 * client writes, a curl call to the REST endpoint gets a plain answer.
 */
export function RxServerRack() {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg || prefersReducedMotion() || typeof svg.animate !== 'function') {
            return;
        }
        const pkts = svg.querySelector('.rsr-pkts') as SVGGElement;
        const db = svg.querySelector('.rsr-db') as SVGSVGElement;
        const runner = createRunner(svg);
        const { wait, isStopped } = runner;

        const flyPacket = (from: Point, to: Point, color: string, duration: number) => {
            const g = document.createElementNS(SVGNS, 'g');
            const rect = document.createElementNS(SVGNS, 'rect');
            rect.setAttribute('x', String(from[0] - 3));
            rect.setAttribute('y', String(from[1] - 2));
            rect.setAttribute('width', '6');
            rect.setAttribute('height', '4');
            rect.setAttribute('rx', '1');
            rect.setAttribute('fill', color);
            g.appendChild(rect);
            pkts.appendChild(g);
            const d = 'translate(' + (to[0] - from[0]) + 'px, ' + (to[1] - from[1]) + 'px)';
            const anim = g.animate(
                [
                    { transform: 'none', opacity: 0 },
                    { transform: 'none', opacity: 1, offset: .08 },
                    { transform: d, opacity: 1, offset: .92 },
                    { transform: d, opacity: 0 }
                ],
                { duration, easing: 'ease-in-out' }
            );
            return anim.finished.catch(() => { }).then(() => g.remove());
        };

        const hit = (unit: 'a' | 'b', bar: string) => {
            svg.querySelector('.rsr-led-' + unit)?.animate(
                [{ fill: '#ED168F' }, { fill: '#ED168F', offset: .6 }, { fill: '#4B4F66' }],
                { duration: 700 }
            );
            svg.querySelector('.rsr-link-' + unit)?.animate(
                [{ opacity: 0 }, { opacity: .9, offset: .2 }, { opacity: 0 }],
                { duration: 700 }
            );
            db.querySelector('.' + bar)?.animate(
                [{ transform: 'none' }, { transform: 'translateX(-4px)' }, { transform: 'none' }],
                { duration: 380, delay: 120, easing: OUT }
            );
        };

        const steps: (() => Promise<unknown>)[] = [
            async () => {
                await flyPacket(DEV.laptop, A, '#FFFFFF', 700);
                if (isStopped()) {
                    return;
                }
                hit('a', 'b2');
                await wait(350);
                await Promise.all([
                    flyPacket(A, DEV.phone, '#B2218B', 700),
                    flyPacket(A, DEV.laptop, '#B2218B', 700)
                ]);
            },
            async () => {
                await flyPacket(DEV.curl, B, '#FFFFFF', 700);
                if (isStopped()) {
                    return;
                }
                hit('b', 'b3');
                await wait(350);
                await flyPacket(B, DEV.curl, '#752A8A', 700);
            },
            async () => {
                await flyPacket(DEV.phone, A, '#FFFFFF', 700);
                if (isStopped()) {
                    return;
                }
                hit('a', 'b1');
                await wait(350);
                await Promise.all([
                    flyPacket(A, DEV.phone, '#ED168F', 700),
                    flyPacket(A, DEV.laptop, '#ED168F', 700)
                ]);
            }
        ];

        (async () => {
            for (let i = 0; !isStopped(); i++) {
                await wait(500);
                if (isStopped()) {
                    return;
                }
                await steps[i % steps.length]();
            }
        })();

        return () => {
            runner.stop();
            pkts.innerHTML = '';
        };
    }, []);

    return (
        <div className="rx-server-rack">
            <style>{`
                .rx-server-rack { line-height: 0; }
                .rx-server-rack > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .rx-server-rack text { font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .rx-server-rack .part { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.rx-server-rack .rsr-db')}
                .rx-server-rack .rsr-device { fill: none; stroke: #FFFFFF; stroke-width: 1.2; }
                .rx-server-rack .rsr-device-fill { fill: #FFFFFF; }
                .rx-server-rack .rsr-lane { stroke: #262B40; stroke-width: 1; stroke-dasharray: 2 3; }
                .rx-server-rack .rsr-chassis { fill: #171A29; stroke: #A29DB6; stroke-width: 1.2; }
                .rx-server-rack .rsr-unit { fill: #1E2236; stroke: #262B40; stroke-width: 1; }
                .rx-server-rack .rsr-screw { fill: #262B40; }
                .rx-server-rack .rsr-vent { stroke: #262B40; stroke-width: 1.4; }
                .rx-server-rack .rsr-led { fill: #4B4F66; }
                .rx-server-rack .rsr-power { fill: #FFFFFF; animation: rsr-power 2.4s ease-in-out infinite; }
                .rx-server-rack .rsr-slbl { fill: #A29DB6; font-size: 7px; letter-spacing: .04em; }
                .rx-server-rack .rsr-spath { fill: #ECE9F2; font-size: 8px; }
                .rx-server-rack .rsr-dlbl { fill: #A29DB6; font-size: 6.5px; }
                .rx-server-rack .rsr-link { stroke: #ED168F; stroke-width: 1; stroke-dasharray: 2 2; opacity: 0; }
                @keyframes rsr-power { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
                @media (prefers-reduced-motion: reduce) {
                    .rx-server-rack .rsr-power { animation: none; }
                }
            `}</style>
            <svg
                ref={svgRef}
                viewBox="0 0 300 150"
                role="img"
                aria-label="Client devices send requests to an RxServer rack with a replication endpoint and a REST endpoint, both backed by the RxDB database inside the rack."
            >
                <line className="rsr-lane" x1="27" y1="34" x2="104" y2="56" />
                <line className="rsr-lane" x1="34" y1="74" x2="104" y2="56" />
                <line className="rsr-lane" x1="33" y1="112" x2="104" y2="104" />
                <rect className="rsr-device" x="12" y="22" width="14" height="24" rx="2.5" />
                <rect className="rsr-device-fill" x="17" y="42" width="4" height="1.4" rx=".7" />
                <rect className="rsr-device" x="8" y="65" width="22" height="14" rx="1.5" />
                <rect className="rsr-device-fill" x="4" y="80" width="30" height="2.6" rx="1" />
                <rect className="rsr-device" x="8" y="102" width="24" height="18" rx="1.5" />
                <line className="rsr-device" x1="8" y1="106.5" x2="32" y2="106.5" />
                <text className="rsr-dlbl" x="11" y="116">&gt;_</text>
                <text className="rsr-dlbl" x="19" y="54" textAnchor="middle">app</text>
                <text className="rsr-dlbl" x="19" y="91" textAnchor="middle">app</text>
                <text className="rsr-dlbl" x="20" y="130" textAnchor="middle">curl</text>
                <rect className="rsr-chassis" x="98" y="8" width="194" height="134" rx="5" />
                <circle className="rsr-screw" cx="104" cy="14" r="1.6" />
                <circle className="rsr-screw" cx="286" cy="14" r="1.6" />
                <circle className="rsr-screw" cx="104" cy="136" r="1.6" />
                <circle className="rsr-screw" cx="286" cy="136" r="1.6" />
                <text className="rsr-slbl" x="112" y="23">RxServer · :80</text>
                <circle className="rsr-power" cx="278" cy="20" r="2" />
                <rect className="rsr-unit" x="104" y="32" width="96" height="46" rx="2.5" />
                <rect className="rsr-unit" x="104" y="84" width="96" height="46" rx="2.5" />
                <text className="rsr-slbl" x="112" y="48">replication</text>
                <text className="rsr-spath" x="112" y="62">/heroes/0</text>
                <text className="rsr-slbl" x="112" y="100">rest</text>
                <text className="rsr-spath" x="112" y="114">/rest/0/query</text>
                <circle className="rsr-led rsr-led-a" cx="192" cy="40" r="2.2" />
                <circle className="rsr-led rsr-led-b" cx="192" cy="92" r="2.2" />
                <path className="rsr-vent" d="M180 52v18M184 52v18M188 52v18M192 52v18M180 104v18M184 104v18M188 104v18M192 104v18" />
                <line className="rsr-link rsr-link-a" x1="200" y1="55" x2="216" y2="70" />
                <line className="rsr-link rsr-link-b" x1="200" y1="107" x2="216" y2="88" />
                <svg className="rsr-db" x="214" y="34" width="66" height="89.4" viewBox="0 0 103.33 140">
                    <LogoParts />
                </svg>
                <text className="rsr-slbl" x="247" y="134" textAnchor="middle">db.heroes</text>
                <g className="rsr-pkts"></g>
            </svg>
        </div>
    );
}
