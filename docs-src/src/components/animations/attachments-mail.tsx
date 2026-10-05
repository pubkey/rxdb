import React, { useEffect, useRef } from 'react';
import { LogoParts, OUT, SVGNS, createRunner, prefersReducedMotion } from './shared';

const FILES: [string, string][] = [['cat.jpg', '#ED168F'], ['notes.pdf', '#B2218B'], ['song.mp3', '#752A8A']];

function createChip(index: number) {
    const [name, color] = FILES[index];
    const x = 76 + index * 58;
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'attachments-mail-chip');
    g.innerHTML = '<rect class="box" x="' + x + '" y="102" width="55" height="22" rx="3"/>' +
        '<path class="ficon" d="M' + (x + 5) + ' 107h6l3 3v9h-9z"/>' +
        '<rect x="' + (x + 6) + '" y="113" width="6" height="3" fill="' + color + '"/>' +
        '<text x="' + (x + 16) + '" y="116">' + name + '</text>';
    return g;
}

/**
 * Files get attached to an RxDocument the way attachments
 * get clipped to an email. Each putAttachment() call adds one more file.
 */
export function AttachmentsMail() {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svg = svgRef.current;
        const chips = svg?.querySelector('.attachments-mail-chips');
        if (!svg || !chips) {
            return;
        }
        chips.innerHTML = '';
        if (prefersReducedMotion() || typeof svg.animate !== 'function') {
            FILES.forEach((_f, i) => chips.appendChild(createChip(i)));
            return () => {
                chips.innerHTML = '';
            };
        }
        const runner = createRunner(svg);
        (async () => {
            while (!runner.isStopped()) {
                const list: SVGGElement[] = [];
                for (let i = 0; i < FILES.length; i++) {
                    const g = createChip(i);
                    chips.appendChild(g);
                    list.push(g);
                    await g.animate(
                        [
                            { transform: 'translate(60px, -80px) rotate(10deg)', opacity: 0 },
                            { opacity: 1, offset: .3 },
                            { transform: 'none', opacity: 1 }
                        ],
                        { duration: 700, easing: OUT }
                    ).finished.catch(() => { });
                    if (runner.isStopped()) {
                        return;
                    }
                    await runner.wait(700);
                }
                await runner.wait(1500);
                await Promise.all(list.map(c => c.animate(
                    [{ opacity: 1 }, { opacity: 0 }],
                    { duration: 400 }
                ).finished.catch(() => { })));
                list.forEach(c => c.remove());
                if (runner.isStopped()) {
                    return;
                }
                await runner.wait(500);
            }
        })();
        return () => {
            runner.stop();
            chips.innerHTML = '';
        };
    }, []);

    return (
        <div className="attachments-mail">
            <style>{`
                .attachments-mail { line-height: 0; }
                .attachments-mail > svg { display: block; width: 100%; height: auto; }
                .attachments-mail text { font-family: 'Atkinson Hyperlegible Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace; }
                .attachments-mail .part { transform-box: fill-box; transform-origin: center; }
                .attachments-mail .outline { fill: #FFFFFF; }
                .attachments-mail .b1, .attachments-mail .corner { fill: #ED168F; }
                .attachments-mail .b2 { fill: #B2218B; }
                .attachments-mail .b3, .attachments-mail .foot { fill: #752A8A; }
                .attachments-mail .mail { fill: #171A29; stroke: #A29DB6; stroke-width: 1.2; }
                .attachments-mail .rule { stroke: #262B40; stroke-width: 1; }
                .attachments-mail .hd { fill: #ECE9F2; font-size: 9px; }
                .attachments-mail .line { fill: #262B40; }
                .attachments-mail .paperclip { fill: none; stroke: #A29DB6; stroke-width: 1.4; stroke-linecap: round; }
                .attachments-mail .attachments-mail-chip rect.box { fill: #1E2236; stroke: #262B40; stroke-width: 1; }
                .attachments-mail .attachments-mail-chip text { font-size: 7px; fill: #ECE9F2; }
                .attachments-mail .attachments-mail-chip .ficon { fill: #FFFFFF; }
                .attachments-mail .attachments-mail-caption { font-size: 12px; fill: #ECE9F2; }
            `}</style>
            <svg
                ref={svgRef}
                viewBox="0 0 400 300"
                role="img"
                aria-label="Files get attached to an RxDocument like attachments to an email, one putAttachment call after another."
            >
                <svg x="24" y="43" width="352" height="188" viewBox="0 0 300 160" overflow="visible">
                    <rect className="mail" x="50" y="10" width="200" height="140" rx="6" />
                    <svg x="62" y="20" width="16" height="21.7" viewBox="0 0 103.33 140">
                        <LogoParts />
                    </svg>
                    <text className="hd" x="86" y="35">RxDocument alice</text>
                    <line className="rule" x1="58" y1="50" x2="242" y2="50" />
                    <rect className="line" x="64" y="62" width="120" height="5" rx="2.5" />
                    <rect className="line" x="64" y="74" width="90" height="5" rx="2.5" />
                    <line className="rule" x1="58" y1="92" x2="242" y2="92" />
                    <path className="paperclip" d="M66 116v-10a3 3 0 0 1 6 0v12a4.6 4.6 0 0 1-9.2 0v-8" />
                    <g className="attachments-mail-chips"></g>
                </svg>
                <text className="attachments-mail-caption" x="200" y="253" textAnchor="middle">doc.putAttachment(file)</text>
            </svg>
        </div>
    );
}
