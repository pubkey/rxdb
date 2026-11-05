"use strict";(self.webpackChunkrxdb=self.webpackChunkrxdb||[]).push([["6651"],{62544(e,t,a){a.d(t,{M:()=>n});var r=a(74848),i=a(96540),o=a(76037);let s=[["cat.jpg","#ED168F"],["notes.pdf","#B2218B"],["song.mp3","#752A8A"]];function l(e){let[t,a]=s[e],r=76+58*e,i=document.createElementNS(o.gm,"g");return i.setAttribute("class","attachments-mail-chip"),i.innerHTML='<rect class="box" x="'+r+'" y="102" width="55" height="22" rx="3"/><path class="ficon" d="M'+(r+5)+' 107h6l3 3v9h-9z"/><rect x="'+(r+6)+'" y="113" width="6" height="3" fill="'+a+'"/><text x="'+(r+16)+'" y="116">'+t+"</text>",i}function n(){let e=(0,i.useRef)(null);return(0,i.useEffect)(()=>{let t=e.current,a=t?.querySelector(".attachments-mail-chips");if(!t||!a)return;if(a.innerHTML="",(0,o.Oe)()||"function"!=typeof t.animate)return s.forEach((e,t)=>a.appendChild(l(t))),()=>{a.innerHTML=""};let r=(0,o.ji)(t);return(async()=>{for(;!r.isStopped();){let e=[];for(let t=0;t<s.length;t++){let i=l(t);if(a.appendChild(i),e.push(i),await i.animate([{transform:"translate(60px, -80px) rotate(10deg)",opacity:0},{opacity:1,offset:.3},{transform:"none",opacity:1}],{duration:700,easing:o.Po}).finished.catch(()=>{}),r.isStopped())return;await r.wait(700)}if(await r.wait(1500),await Promise.all(e.map(e=>e.animate([{opacity:1},{opacity:0}],{duration:400}).finished.catch(()=>{}))),e.forEach(e=>e.remove()),r.isStopped())return;await r.wait(500)}})(),()=>{r.stop(),a.innerHTML=""}},[]),(0,r.jsxs)("div",{className:"attachments-mail",children:[(0,r.jsx)("style",{children:`
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
            `}),(0,r.jsxs)("svg",{ref:e,viewBox:"0 0 400 300",role:"img","aria-label":"Files get attached to an RxDocument like attachments to an email, one putAttachment call after another.",children:[(0,r.jsxs)("svg",{x:"24",y:"43",width:"352",height:"188",viewBox:"0 0 300 160",overflow:"visible",children:[(0,r.jsx)("rect",{className:"mail",x:"50",y:"10",width:"200",height:"140",rx:"6"}),(0,r.jsx)("svg",{x:"62",y:"20",width:"16",height:"21.7",viewBox:"0 0 103.33 140",children:(0,r.jsx)(o.a0,{})}),(0,r.jsx)("text",{className:"hd",x:"86",y:"35",children:"RxDocument alice"}),(0,r.jsx)("line",{className:"rule",x1:"58",y1:"50",x2:"242",y2:"50"}),(0,r.jsx)("rect",{className:"line",x:"64",y:"62",width:"120",height:"5",rx:"2.5"}),(0,r.jsx)("rect",{className:"line",x:"64",y:"74",width:"90",height:"5",rx:"2.5"}),(0,r.jsx)("line",{className:"rule",x1:"58",y1:"92",x2:"242",y2:"92"}),(0,r.jsx)("path",{className:"paperclip",d:"M66 116v-10a3 3 0 0 1 6 0v12a4.6 4.6 0 0 1-9.2 0v-8"}),(0,r.jsx)("g",{className:"attachments-mail-chips"})]}),(0,r.jsx)("text",{className:"attachments-mail-caption",x:"200",y:"253",textAnchor:"middle",children:"doc.putAttachment(file)"})]})]})}},10188(e,t,a){a.d(t,{K:()=>o});var r=a(74848);a(96540);var i=a(76037);function o(){return(0,r.jsxs)("div",{className:"backup-copy",children:[(0,r.jsx)("style",{children:`
                .backup-copy { line-height: 0; }
                .backup-copy > svg { display: block; width: 100%; height: auto; }
                ${(0,i.z3)(".backup-copy")}
                .backup-copy .part { transform-box: fill-box; transform-origin: center; }
                .backup-copy .ghost .part { fill: none; stroke: #A29DB6; stroke-width: 1.2; stroke-dasharray: 3 3; }
                .backup-copy .ghost, .backup-copy .blbl { animation: backup-copy-ghost 4.4s infinite; }
                .backup-copy .blbl { fill: #A29DB6; font-size: 8.5px; font-family: var(--ifm-font-family-monospace, ui-monospace, monospace); }
                .backup-copy .fly { animation: backup-copy-fly 4.4s cubic-bezier(.2, 1.4, .4, 1) infinite both; }
                .backup-copy .fly.b2 { animation-delay: .18s; }
                .backup-copy .fly.b3 { animation-delay: .36s; }
                @keyframes backup-copy-ghost { 0%, 4% { opacity: 0; } 12%, 88% { opacity: 1; } 96%, 100% { opacity: 0; } }
                @keyframes backup-copy-fly {
                    0%, 16% { opacity: 0; transform: none; }
                    18% { opacity: 1; transform: none; }
                    40%, 88% { opacity: 1; transform: translateX(125px); }
                    96%, 100% { opacity: 0; transform: translateX(125px); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .backup-copy .ghost, .backup-copy .blbl, .backup-copy .fly { animation: none; }
                    .backup-copy .fly { transform: translateX(125px); }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"-28.8 -31 291 218",role:"img","aria-label":"The layers of the RxDB logo are copied one after another into a backup file.",children:[(0,r.jsx)(i.a0,{}),(0,r.jsx)("g",{className:"ghost",transform:"translate(125 0)",children:(0,r.jsx)(i.a0,{})}),(0,r.jsx)("rect",{className:"bar b1 fly",x:"6.66",y:"33.34",width:"90",height:"20"}),(0,r.jsx)("rect",{className:"bar b2 fly",x:"6.67",y:"60",width:"90",height:"20"}),(0,r.jsx)("rect",{className:"bar b3 fly",x:"6.66",y:"86.66",width:"90",height:"20"}),(0,r.jsx)("text",{className:"blbl",x:"176.66",y:"156",textAnchor:"middle",children:"backup/2026-09-29.json"})]})]})}},47591(e,t,a){a.d(t,{t:()=>o});var r=a(74848);a(96540);var i=a(76037);function o(){return(0,r.jsxs)("div",{className:"cleanup-sweep",children:[(0,r.jsx)("style",{children:`
                .cleanup-sweep { line-height: 0; }
                .cleanup-sweep > svg { display: block; width: 100%; height: auto; }
                ${(0,i.z3)(".cleanup-sweep")}
                .cleanup-sweep .part { transform-box: fill-box; transform-origin: center; }
                .cleanup-sweep .b2 { --c: #B2218B; }
                .cleanup-sweep .b3 { --c: #752A8A; }
                .cleanup-sweep .b2, .cleanup-sweep .b3 { transform-origin: right center; animation: cleanup-sweep-tomb 5s cubic-bezier(.16, 1, .3, 1) infinite both; }
                .cleanup-sweep .b3 { animation-delay: .1s; }
                .cleanup-sweep .sweep { fill: #FFFFFF; opacity: 0; animation: cleanup-sweep-sweep 5s linear infinite; }
                .cleanup-sweep .tlbl { fill: #A29DB6; font-size: 8px; opacity: 0; animation: cleanup-sweep-tlbl 5s infinite; font-family: var(--ifm-font-family-monospace, ui-monospace, monospace); }
                @keyframes cleanup-sweep-tomb {
                    0%, 12% { fill: var(--c); transform: none; }
                    20%, 46% { fill: #2A2E45; transform: none; }
                    62%, 78% { fill: #2A2E45; transform: scaleX(0); }
                    90%, 100% { fill: var(--c); transform: none; }
                }
                @keyframes cleanup-sweep-sweep {
                    0%, 44% { opacity: 0; transform: none; }
                    46% { opacity: 1; transform: none; }
                    62% { opacity: 1; transform: translateX(90px); }
                    64%, 100% { opacity: 0; transform: translateX(90px); }
                }
                @keyframes cleanup-sweep-tlbl { 0%, 18% { opacity: 0; } 24%, 46% { opacity: 1; } 52%, 100% { opacity: 0; } }
                @media (prefers-reduced-motion: reduce) {
                    .cleanup-sweep .b2, .cleanup-sweep .b3, .cleanup-sweep .sweep, .cleanup-sweep .tlbl { animation: none; }
                    .cleanup-sweep .b2, .cleanup-sweep .b3 { fill: #2A2E45; }
                    .cleanup-sweep .tlbl { opacity: 1; }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"-72.8 -23.3 248.9 186.7",role:"img","aria-label":"Deleted documents in the RxDB logo stay as dark tombstones until a cleanup sweep removes them and new documents take their slots.",children:[(0,r.jsx)(i.a0,{}),(0,r.jsx)("text",{className:"tlbl",x:"12",y:"73",children:"_deleted: true"}),(0,r.jsx)("text",{className:"tlbl",x:"12",y:"99.7",children:"_deleted: true"}),(0,r.jsx)("rect",{className:"sweep",x:"5",y:"30",width:"2.5",height:"80"})]})]})}},31184(e,t,a){a.d(t,{m:()=>o});var r=a(74848);a(96540);var i=a(76037);function o(){return(0,r.jsxs)("div",{className:"conflict-handling",children:[(0,r.jsx)("style",{children:`
                .conflict-handling { line-height: 0; }
                .conflict-handling > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .conflict-handling .part { transform-box: fill-box; transform-origin: center; }
                ${(0,i.z3)(".conflict-handling")}
                .conflict-handling .b2 { animation: conflict-handling-resolved 4s cubic-bezier(.16, 1, .3, 1) infinite; }
                .conflict-handling .ca, .conflict-handling .cb { transform-box: fill-box; opacity: 0; }
                .conflict-handling .ca { fill: #ED168F; animation: conflict-handling-edit-a 4s cubic-bezier(.16, 1, .3, 1) infinite; }
                .conflict-handling .cb { fill: #752A8A; animation: conflict-handling-edit-b 4s cubic-bezier(.16, 1, .3, 1) infinite; }
                .conflict-handling .alert { transform-box: fill-box; transform-origin: center; opacity: 0; animation: conflict-handling-alert 4s cubic-bezier(.2, 1.4, .4, 1) infinite; }
                .conflict-handling .alert circle { fill: #FFFFFF; }
                .conflict-handling .alert text { fill: #0D0F18; font-size: 11px; font-weight: 800; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                @keyframes conflict-handling-resolved {
                    0%, 54% { opacity: 0; transform: none; fill: #FFFFFF; }
                    58% { opacity: 1; transform: scaleX(1.08); fill: #FFFFFF; }
                    70%, 88% { opacity: 1; transform: none; fill: #B2218B; }
                    96%, 100% { opacity: 0; fill: #B2218B; }
                }
                @keyframes conflict-handling-edit-a {
                    0% { opacity: 0; transform: translateX(-50%); }
                    10% { opacity: .85; }
                    32% { transform: translateX(-8%); }
                    36% { transform: translateX(-3%); }
                    40% { transform: translateX(-7%); }
                    44% { transform: translateX(-2%); }
                    48% { transform: translateX(-6%); }
                    54% { opacity: .85; transform: none; }
                    60%, 100% { opacity: 0; transform: none; }
                }
                @keyframes conflict-handling-edit-b {
                    0% { opacity: 0; transform: translateX(50%); }
                    10% { opacity: .85; }
                    32% { transform: translateX(8%); }
                    36% { transform: translateX(3%); }
                    40% { transform: translateX(7%); }
                    44% { transform: translateX(2%); }
                    48% { transform: translateX(6%); }
                    54% { opacity: .85; transform: none; }
                    60%, 100% { opacity: 0; transform: none; }
                }
                @keyframes conflict-handling-alert {
                    0%, 36% { opacity: 0; transform: scale(0); }
                    40%, 52% { opacity: 1; transform: none; }
                    56%, 100% { opacity: 0; transform: scale(.5); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .conflict-handling .b2, .conflict-handling .ca, .conflict-handling .cb, .conflict-handling .alert { animation: none; }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"-70 -20 243.33 180",role:"img","aria-label":"Two conflicting edits of the middle layer of the RxDB logo collide, shake, and merge into one revision.",children:[(0,r.jsx)(i.a0,{}),(0,r.jsx)("rect",{className:"ca",x:"6.67",y:"60",width:"90",height:"20"}),(0,r.jsx)("rect",{className:"cb",x:"6.67",y:"60",width:"90",height:"20"}),(0,r.jsxs)("g",{className:"alert",children:[(0,r.jsx)("circle",{cx:"116",cy:"70",r:"8"}),(0,r.jsx)("text",{x:"116",y:"74",textAnchor:"middle",children:"!"})]})]})]})}},34426(e,t,a){a.d(t,{a:()=>o});var r=a(74848);a(96540);var i=a(76037);function o(){return(0,r.jsxs)("div",{className:"crdt-merge",children:[(0,r.jsx)("style",{children:`
                .crdt-merge { line-height: 0; }
                .crdt-merge > svg { display: block; width: 100%; height: auto; }
                .crdt-merge text { font-family: 'Atkinson Hyperlegible Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace; }
                .crdt-merge .part { transform-box: fill-box; transform-origin: center; }
                .crdt-merge .outline { fill: #FFFFFF; }
                .crdt-merge .b1 { --c: #ED168F; }
                .crdt-merge .b2 { --c: #B2218B; }
                .crdt-merge .b3 { --c: #752A8A; }
                .crdt-merge .bar { fill: var(--c); }
                .crdt-merge .corner { fill: #ED168F; }
                .crdt-merge .foot { fill: #752A8A; }
                .crdt-merge .op { transform-box: fill-box; transform-origin: center; opacity: 0; }
                .crdt-merge .op text { fill: #FFFFFF; font-size: 8px; font-weight: 800; }
                .crdt-merge .op-a rect { fill: #ED168F; }
                .crdt-merge .op-b rect { fill: #752A8A; }
                .crdt-merge .op-a { animation: crdt-merge-a 4.4s cubic-bezier(.16, 1, .3, 1) infinite; }
                .crdt-merge .op-b { animation: crdt-merge-b 4.4s cubic-bezier(.16, 1, .3, 1) infinite; }
                .crdt-merge .b2 { animation: crdt-merge-absorb 4.4s cubic-bezier(.2, 1.4, .4, 1) infinite; }
                .crdt-merge .count { font-size: 10px; font-weight: 700; }
                .crdt-merge .c1 { fill: #A29DB6; animation: crdt-merge-c1 4.4s infinite; }
                .crdt-merge .c2 { fill: #ED168F; opacity: 0; animation: crdt-merge-c2 4.4s infinite; }
                @keyframes crdt-merge-a {
                    0% { opacity: 0; transform: none; }
                    10% { opacity: 1; }
                    40% { opacity: 1; transform: translateX(64px); }
                    46%, 100% { opacity: 0; transform: translateX(66px) scale(.3); }
                }
                @keyframes crdt-merge-b {
                    0% { opacity: 0; transform: none; }
                    10% { opacity: 1; }
                    40% { opacity: 1; transform: translateX(-62px); }
                    46%, 100% { opacity: 0; transform: translateX(-64px) scale(.3); }
                }
                @keyframes crdt-merge-absorb {
                    0%, 40% { transform: none; fill: var(--c); }
                    44% { transform: scale(1.08, 1.25); fill: #FFFFFF; }
                    56%, 100% { transform: none; fill: var(--c); }
                }
                @keyframes crdt-merge-c1 { 0%, 46% { opacity: 1; } 50%, 100% { opacity: 0; } }
                @keyframes crdt-merge-c2 { 0%, 46% { opacity: 0; } 50%, 94% { opacity: 1; } 98%, 100% { opacity: 0; } }
                @media (prefers-reduced-motion: reduce) {
                    .crdt-merge .op, .crdt-merge .b2, .crdt-merge .c1, .crdt-merge .c2 { animation: none; }
                    .crdt-merge .op { opacity: 1; }
                }
            `}),(0,r.jsx)("svg",{viewBox:"0 0 400 300",role:"img","aria-label":"Two concurrent increments merge into the middle layer of the RxDB logo without a conflict and the likes count goes from 3 to 5.",children:(0,r.jsxs)("svg",{x:"24",y:"51",width:"352",height:"198",viewBox:"-50 -26 203.33 166",overflow:"visible",children:[(0,r.jsx)(i.a0,{}),(0,r.jsxs)("g",{className:"op op-a",children:[(0,r.jsx)("rect",{x:"-44",y:"64",width:"26",height:"12",rx:"6"}),(0,r.jsx)("text",{x:"-31",y:"73",textAnchor:"middle",children:"+1"})]}),(0,r.jsxs)("g",{className:"op op-b",children:[(0,r.jsx)("rect",{x:"122",y:"64",width:"26",height:"12",rx:"6"}),(0,r.jsx)("text",{x:"135",y:"73",textAnchor:"middle",children:"+1"})]}),(0,r.jsx)("text",{className:"count c1",x:"51.66",y:"-10",textAnchor:"middle",children:"likes: 3"}),(0,r.jsx)("text",{className:"count c2",x:"51.66",y:"-10",textAnchor:"middle",children:"likes: 5"})]})})]})}},48121(e,t,a){a.d(t,{x:()=>n});var r=a(74848),i=a(96540),o=a(76037);let s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",l=[46.3,73,99.7];function n(){let e=(0,i.useRef)(null);return(0,i.useEffect)(()=>{let t=e.current;if(!t)return;let a=Array.from(t.querySelectorAll(".cipher")),r=()=>{a.forEach(e=>{let t="";for(let e=0;e<17;e++)t+=s[Math.floor(Math.random()*s.length)];e.textContent=t})};if(r(),(0,o.Oe)())return;let i=(0,o.ji)(t);return(async()=>{for(;!i.isStopped();)await i.wait(90),i.isStopped()||r()})(),()=>i.stop()},[]),(0,r.jsxs)("div",{className:"encryption-logo",ref:e,children:[(0,r.jsx)("style",{children:`
                .encryption-logo { line-height: 0; }
                .encryption-logo > svg { display: block; width: 100%; height: auto; }
                .encryption-logo .logo { overflow: visible; }
                .encryption-logo .part { transform-box: fill-box; transform-origin: center; }
                .encryption-logo .outline { fill: #FFFFFF; }
                .encryption-logo .b1 { --c: #ED168F; }
                .encryption-logo .b2 { --c: #B2218B; animation-delay: .08s; }
                .encryption-logo .b3 { --c: #752A8A; animation-delay: .16s; }
                .encryption-logo .bar { fill: var(--c); animation: encryption-logo-enc 5s cubic-bezier(.16, 1, .3, 1) infinite; }
                .encryption-logo .corner { fill: #ED168F; }
                .encryption-logo .foot { fill: #752A8A; }
                .encryption-logo .cipher {
                    fill: #ECE9F2;
                    font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
                    font-size: 8px;
                    opacity: 0;
                    animation: encryption-logo-cipher 5s infinite;
                }
                .encryption-logo .shackle {
                    fill: none;
                    stroke: #FFFFFF;
                    stroke-width: 3;
                    stroke-linecap: round;
                    transform-box: fill-box;
                    opacity: 0;
                    animation: encryption-logo-shackle 5s cubic-bezier(.2, 1.4, .4, 1) infinite;
                }
                @keyframes encryption-logo-enc { 0%, 18% { fill: var(--c); } 26%, 70% { fill: #2A2E45; } 80%, 100% { fill: var(--c); } }
                @keyframes encryption-logo-cipher { 0%, 20% { opacity: 0; } 28%, 68% { opacity: 1; } 76%, 100% { opacity: 0; } }
                @keyframes encryption-logo-shackle {
                    0%, 12% { opacity: 0; transform: translateY(-6px); }
                    22%, 70% { opacity: 1; transform: none; }
                    78%, 100% { opacity: 0; transform: translateY(-6px); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .encryption-logo .bar, .encryption-logo .cipher, .encryption-logo .shackle { animation: none; }
                    .encryption-logo .bar { fill: #2A2E45; }
                    .encryption-logo .cipher, .encryption-logo .shackle { opacity: 1; }
                }
            `}),(0,r.jsx)("svg",{viewBox:"0 0 300 225",role:"img","aria-label":"The RxDB logo locks its corner piece, its layers go dark and fill with ciphertext, then decrypt back to the brand colors",children:(0,r.jsxs)("svg",{className:"logo",x:"0",y:"38.25",width:"300",height:"148.5",viewBox:"0 -12 103.33 152",children:[(0,r.jsx)(o.a0,{}),(0,r.jsx)("path",{className:"shackle",d:"M80 6 V1 a6.5 6.5 0 0 1 13 0 V6"}),l.map(e=>(0,r.jsx)("text",{className:"cipher",x:"11",y:e,children:"\xa0"},e))]})})]})}},47970(e,t,a){a.d(t,{f:()=>s});var r=a(74848),i=a(96540),o=a(76037);function s(){let e="fulltext-search-lens-clip-"+(0,i.useId)().replace(/[^a-zA-Z0-9_-]/g,"");return(0,r.jsxs)("div",{className:"fulltext-search-lens",children:[(0,r.jsx)("style",{children:`
                .fulltext-search-lens { line-height: 0; }
                .fulltext-search-lens > svg { display: block; width: 100%; height: auto; }
                .fulltext-search-lens text { font-family: 'Atkinson Hyperlegible Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace; }
                .fulltext-search-lens .part { transform-box: fill-box; transform-origin: center; }
                .fulltext-search-lens .outline { fill: #FFFFFF; }
                .fulltext-search-lens .b1 { --c: #ED168F; }
                .fulltext-search-lens .b2 { --c: #B2218B; }
                .fulltext-search-lens .b3 { --c: #752A8A; }
                .fulltext-search-lens .bar { fill: var(--c); }
                .fulltext-search-lens .corner { fill: #ED168F; }
                .fulltext-search-lens .foot { fill: #752A8A; }
                .fulltext-search-lens .lens, .fulltext-search-lens .lens-c, .fulltext-search-lens .lens-bg, .fulltext-search-lens .zoom { transform-box: view-box; transform-origin: 0 0; }
                .fulltext-search-lens .lens-c, .fulltext-search-lens .lens-bg { animation: fulltext-search-lens-move 6s ease-in-out infinite; }
                .fulltext-search-lens .zoom { animation: fulltext-search-lens-zoom 6s ease-in-out infinite; }
                .fulltext-search-lens .lens-wrap { animation: fulltext-search-lens-fade 6s infinite; }
                .fulltext-search-lens .lens { animation: fulltext-search-lens-move 6s ease-in-out infinite, fulltext-search-lens-fade 6s infinite; }
                .fulltext-search-lens .lens-bg { fill: #141725; }
                .fulltext-search-lens .ring { fill: none; stroke: #FFFFFF; stroke-width: 2.5; }
                .fulltext-search-lens .handle { stroke: #FFFFFF; stroke-width: 4.5; stroke-linecap: round; }
                .fulltext-search-lens .b2 { animation: fulltext-search-lens-match 6s infinite; }
                .fulltext-search-lens .fulltext-search-lens-caption { font-size: 12px; fill: #A29DB6; }
                .fulltext-search-lens .fulltext-search-lens-code { fill: #ECE9F2; }
                @keyframes fulltext-search-lens-move {
                    0% { transform: translate(-5px, 20px); }
                    12% { transform: translate(25px, 43px); }
                    26% { transform: translate(78px, 43px); }
                    40% { transform: translate(25px, 70px); }
                    50%, 70% { transform: translate(55px, 70px); }
                    82% { transform: translate(78px, 97px); }
                    94%, 100% { transform: translate(120px, 130px); }
                }
                @keyframes fulltext-search-lens-zoom {
                    0% { transform: translate(4px, -16px) scale(1.8); }
                    12% { transform: translate(-20px, -34.4px) scale(1.8); }
                    26% { transform: translate(-62.4px, -34.4px) scale(1.8); }
                    40% { transform: translate(-20px, -56px) scale(1.8); }
                    50%, 70% { transform: translate(-44px, -56px) scale(1.8); }
                    82% { transform: translate(-62.4px, -77.6px) scale(1.8); }
                    94%, 100% { transform: translate(-96px, -104px) scale(1.8); }
                }
                @keyframes fulltext-search-lens-fade { 0% { opacity: 0; } 8%, 86% { opacity: 1; } 94%, 100% { opacity: 0; } }
                @keyframes fulltext-search-lens-match {
                    0%, 50% { fill: var(--c); }
                    53% { fill: #FFFFFF; }
                    58% { fill: var(--c); }
                    61% { fill: #FFFFFF; }
                    66%, 100% { fill: var(--c); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .fulltext-search-lens .lens, .fulltext-search-lens .lens-c, .fulltext-search-lens .lens-bg, .fulltext-search-lens .zoom, .fulltext-search-lens .lens-wrap, .fulltext-search-lens .b2 { animation: none; }
                    .fulltext-search-lens .lens, .fulltext-search-lens .lens-c, .fulltext-search-lens .lens-bg { transform: translate(55px, 70px); }
                    .fulltext-search-lens .zoom { transform: translate(-44px, -56px) scale(1.8); }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"0 0 400 300",role:"img","aria-label":"A magnifying lens searches the layers of the RxDB logo and finds one match for the search term offline.",children:[(0,r.jsxs)("svg",{x:"24",y:"38",width:"352",height:"198",viewBox:"-12 -12 127.33 164",overflow:"visible",children:[(0,r.jsx)(o.a0,{}),(0,r.jsx)("defs",{children:(0,r.jsx)("clipPath",{id:e,children:(0,r.jsx)("circle",{className:"lens-c",r:"15"})})}),(0,r.jsxs)("g",{className:"lens-wrap",clipPath:"url(#"+e+")",children:[(0,r.jsx)("circle",{className:"lens-bg",r:"15"}),(0,r.jsx)("g",{className:"zoom",children:(0,r.jsx)(o.a0,{})})]}),(0,r.jsxs)("g",{className:"lens",children:[(0,r.jsx)("circle",{className:"ring",r:"15"}),(0,r.jsx)("path",{className:"handle",d:"M11 11 L20 20"})]})]}),(0,r.jsxs)("text",{className:"fulltext-search-lens-caption",x:"200",y:"258",textAnchor:"middle",children:[(0,r.jsx)("tspan",{className:"fulltext-search-lens-code",children:"search('offline')"})," \xb7 1 match"]})]})]})}},89729(e,t,a){a.d(t,{L:()=>o});var r=a(74848);a(96540);var i=a(76037);function o({width:e=120}){return(0,r.jsxs)("span",{className:"glitch-logo",style:{width:e},children:[(0,r.jsx)("style",{children:`
                .glitch-logo { display: inline-block; line-height: 0; }
                .glitch-logo svg { width: 100%; height: auto; overflow: visible; }
                .glitch-logo .outline { fill: #FFFFFF; }
                .glitch-logo .b1, .glitch-logo .corner { fill: #ED168F; }
                .glitch-logo .b2 { fill: #B2218B; }
                .glitch-logo .b3, .glitch-logo .foot { fill: #752A8A; }
                .glitch-logo .gl { mix-blend-mode: screen; opacity: 0; }
                .glitch-logo .gl-a .part { fill: #3FE0FF; }
                .glitch-logo .gl-b .part { fill: #ED168F; }
                .glitch-logo .gl-a { animation: glitch-logo-a 3.2s steps(1) infinite; }
                .glitch-logo .gl-b { animation: glitch-logo-b 3.2s steps(1) infinite; }
                .glitch-logo .main { animation: glitch-logo-main 3.2s steps(1) infinite; }
                .glitch-logo:hover .gl, .glitch-logo:hover .main { animation-duration: .9s; }
                @keyframes glitch-logo-a {
                    0%, 78% { opacity: 0; transform: none; clip-path: none; }
                    80% { opacity: .9; transform: translate(-4px, 0); clip-path: inset(10% 0 55% 0); }
                    83% { transform: translate(3px, 0); clip-path: inset(60% 0 12% 0); }
                    86% { transform: translate(-2px, 0); clip-path: inset(30% 0 40% 0); }
                    89% { transform: translate(5px, 0); clip-path: inset(0 0 80% 0); }
                    92%, 100% { opacity: 0; transform: none; clip-path: none; }
                }
                @keyframes glitch-logo-b {
                    0%, 78% { opacity: 0; transform: none; clip-path: none; }
                    80% { opacity: .9; transform: translate(4px, 0); clip-path: inset(50% 0 20% 0); }
                    83% { transform: translate(-3px, 0); clip-path: inset(5% 0 70% 0); }
                    86% { transform: translate(2px, 0); clip-path: inset(70% 0 5% 0); }
                    89% { transform: translate(-5px, 0); clip-path: inset(40% 0 35% 0); }
                    92%, 100% { opacity: 0; transform: none; clip-path: none; }
                }
                @keyframes glitch-logo-main {
                    0%, 78% { transform: none; }
                    80% { transform: translate(2px, 0); }
                    84% { transform: translate(-1px, 0) skewX(-6deg); }
                    88% { transform: translate(1px, 0); }
                    92%, 100% { transform: none; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .glitch-logo .gl, .glitch-logo .main { animation: none; }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"0 0 103.33 140",role:"img","aria-label":"RxDB logo",children:[(0,r.jsx)("g",{className:"main",children:(0,r.jsx)(i.a0,{})}),(0,r.jsx)("g",{className:"gl gl-a",children:(0,r.jsx)(i.a0,{})}),(0,r.jsx)("g",{className:"gl gl-b",children:(0,r.jsx)(i.a0,{})})]})]})}},66814(e,t,a){a.d(t,{t:()=>o});var r=a(74848);a(96540);var i=a(76037);function o(){return(0,r.jsxs)("div",{className:"key-compression-logo",children:[(0,r.jsx)("style",{children:`
                .key-compression-logo { line-height: 0; }
                .key-compression-logo > svg { display: block; width: 100%; height: auto; }
                .key-compression-logo .logo { overflow: visible; }
                .key-compression-logo .part { transform-box: fill-box; transform-origin: center; }
                ${(0,i.z3)(".key-compression-logo")}
                .key-compression-logo .bar { transform-origin: left center; animation: key-compression-logo-squeeze 4.4s cubic-bezier(.2, 1.4, .4, 1) infinite; }
                .key-compression-logo .b2 { animation-delay: .1s; }
                .key-compression-logo .b3 { animation-delay: .2s; }
                .key-compression-logo .readout {
                    font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
                    font-size: 10px;
                }
                .key-compression-logo .raw { fill: #ECE9F2; animation: key-compression-logo-raw 4.4s infinite; }
                .key-compression-logo .min { fill: #ED168F; opacity: 0; animation: key-compression-logo-min 4.4s infinite; }
                @keyframes key-compression-logo-squeeze { 0%, 22% { transform: none; } 36%, 74% { transform: scaleX(.6); } 88%, 100% { transform: none; } }
                @keyframes key-compression-logo-raw { 0%, 28% { opacity: 1; } 34%, 78% { opacity: 0; } 84%, 100% { opacity: 1; } }
                @keyframes key-compression-logo-min { 0%, 28% { opacity: 0; } 34%, 78% { opacity: 1; } 84%, 100% { opacity: 0; } }
                @media (prefers-reduced-motion: reduce) {
                    .key-compression-logo .bar, .key-compression-logo .raw, .key-compression-logo .min { animation: none; }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"0 0 300 225",role:"img","aria-label":"The RxDB logo layers compress to 60 percent of their width while the JSON field name firstName shrinks to a short key, saving up to 40 percent disk space",children:[(0,r.jsx)("svg",{className:"logo",x:"0",y:"25.9",width:"300",height:"148.5",viewBox:"0 0 103.33 140",children:(0,r.jsx)(i.a0,{})}),(0,r.jsxs)("g",{className:"readout","aria-hidden":"true",children:[(0,r.jsx)("text",{className:"raw",x:"150",y:"195",textAnchor:"middle",children:'{"firstName":"Alice"}'}),(0,r.jsx)("text",{className:"min",x:"150",y:"195",textAnchor:"middle",children:'{"|a":"Alice"} \xb7 up to 40% less disk'})]})]})]})}},39412(e,t,a){a.d(t,{F:()=>n});var r=a(74848),i=a(96540),o=a(76037);let s=[20,115,210],l=[45,140,235];function n(){let e=(0,i.useRef)(null);return(0,i.useEffect)(()=>{let t=e.current;if(!t||(0,o.Oe)()||"function"!=typeof t.animate)return;let a=Array.from(t.querySelectorAll(".tab")),r=t.querySelector(".crown");if(!r||a.length!==l.length)return;let i=(0,o.ji)(t);return(async()=>{let e=0;for(;!i.isStopped();){if(await i.wait(1400),i.isStopped())return;let t=a[e];if(t.animate([{opacity:1,transform:"none"},{opacity:.18,transform:"translateY(6px) scale(.94)"}],{duration:380,easing:o.Po,fill:"forwards"}),await i.wait(300),i.isStopped())return;let s=(e+1)%a.length,n=(l[e]+l[s])/2;if(await r.animate([{transform:"translate("+l[e]+"px, 0)"},{transform:"translate("+n+"px, -14px)"},{transform:"translate("+l[s]+"px, 0)"}],{duration:560,easing:"ease-in-out",fill:"forwards"}).finished.catch(()=>{}),i.isStopped())return;r.getAnimations().forEach(e=>e.cancel()),r.style.transform="translate("+l[s]+"px, 0)",r.animate([{transform:"translate("+l[s]+"px, 0) scale(1.15, .8)"},{transform:"translate("+l[s]+"px, 0)"}],{duration:260,easing:o.C2}),a[s].animate([{transform:"none"},{transform:"translateY(-4px)"},{transform:"none"}],{duration:360,easing:o.Po}),i.wait(700).then(()=>{t.getAnimations().forEach(e=>e.cancel()),t.animate([{opacity:.18,transform:"translateY(6px) scale(.94)"},{opacity:1,transform:"none"}],{duration:420,easing:o.C2})}),e=s}})(),()=>i.stop()},[]),(0,r.jsxs)("div",{className:"leader-election-tabs",children:[(0,r.jsx)("style",{children:`
                .leader-election-tabs { line-height: 0; }
                .leader-election-tabs > svg { display: block; width: 100%; height: auto; }
                .leader-election-tabs .part { transform-box: fill-box; transform-origin: center; }
                ${(0,o.z3)(".leader-election-tabs")}
                .leader-election-tabs .tab-label {
                    fill: #A29DB6;
                    font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
                    font-size: 9px;
                    letter-spacing: .06em;
                }
                .leader-election-tabs .crown { fill: #ED168F; stroke: #FFFFFF; stroke-width: 3; stroke-linejoin: round; paint-order: stroke; }
                .leader-election-tabs .tab { transform-box: fill-box; transform-origin: center bottom; }
            `}),(0,r.jsxs)("svg",{ref:e,viewBox:"0 -8 300 162",role:"img","aria-label":"Three browser tabs share one RxDB database. When the leader tab closes, the leader crown moves to the next tab.",children:[s.map(e=>(0,r.jsx)("g",{className:"tab",children:(0,r.jsx)("svg",{x:e,y:"36",width:"70",height:"95",viewBox:"0 0 103.33 140",children:(0,r.jsx)(o.a0,{})})},e)),s.map((e,t)=>(0,r.jsx)("text",{className:"tab-label",x:e+35,y:"146",textAnchor:"middle",children:"tab "+(t+1)},e)),(0,r.jsx)("g",{transform:"translate(0 12)",children:(0,r.jsx)("path",{className:"crown",d:"M0 16 V3 l5 5 5 -8 5 8 5 -5 V16z",style:{transform:"translate(45px, 0)"}})})]})]})}},80920(e,t,a){a.d(t,{k:()=>s});var r=a(74848),i=a(96540),o=a(76037);function s(){let e=(0,i.useId)().replace(/[^a-zA-Z0-9_-]/g,""),t="middleware-hook-before-"+e,a="middleware-hook-after-"+e;return(0,r.jsxs)("div",{className:"middleware-hook",children:[(0,r.jsx)("style",{children:`
                .middleware-hook { line-height: 0; }
                .middleware-hook > svg { display: block; width: 100%; height: auto; }
                .middleware-hook .mh-stage { overflow: visible; }
                .middleware-hook .part { transform-box: fill-box; transform-origin: center; }
                ${(0,o.z3)(".middleware-hook")}
                .middleware-hook .mh-mark .b2 { opacity: 0; }
                .middleware-hook .mh-mv { transform-box: fill-box; animation: middleware-hook-move 4.4s cubic-bezier(.16, 1, .3, 1) infinite; }
                .middleware-hook .mh-raw { fill: #5A5F78; }
                .middleware-hook .mh-new { fill: #B2218B; }
                .middleware-hook .mh-gate { stroke: #FFFFFF; stroke-width: 1.4; stroke-dasharray: 2 2; }
                .middleware-hook .mh-label { fill: #A29DB6; font-size: 8px; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
                @keyframes middleware-hook-move {
                    0% { opacity: 0; transform: translateX(-125%); }
                    8% { opacity: 1; transform: translateX(-125%); }
                    60%, 88% { opacity: 1; transform: none; }
                    96%, 100% { opacity: 0; transform: none; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .middleware-hook .mh-mv { animation: none; }
                }
            `}),(0,r.jsx)("svg",{viewBox:"0 0 300 225",role:"img","aria-label":"A raw gray document passes through the preInsert middleware hook, comes out changed and lands as the middle layer of the RxDB logo.",children:(0,r.jsxs)("svg",{className:"mh-stage",x:"56",y:"38",width:"189",height:"149",viewBox:"-110 -14 213.33 168",children:[(0,r.jsxs)("defs",{children:[(0,r.jsx)("clipPath",{id:t,children:(0,r.jsx)("rect",{x:"-200",y:"-20",width:"188",height:"200"})}),(0,r.jsx)("clipPath",{id:a,children:(0,r.jsx)("rect",{x:"-12",y:"-20",width:"200",height:"200"})})]}),(0,r.jsx)("g",{className:"mh-mark",children:(0,r.jsx)(o.a0,{})}),(0,r.jsx)("g",{clipPath:"url(#"+t+")",children:(0,r.jsx)("rect",{className:"mh-mv mh-raw",x:"6.67",y:"60",width:"90",height:"20"})}),(0,r.jsx)("g",{clipPath:"url(#"+a+")",children:(0,r.jsx)("rect",{className:"mh-mv mh-new",x:"6.67",y:"60",width:"90",height:"20"})}),(0,r.jsx)("line",{className:"mh-gate",x1:"-12",y1:"50",x2:"-12",y2:"90"}),(0,r.jsx)("text",{className:"mh-label",x:"-15",y:"47",textAnchor:"end",children:"preInsert"})]})})]})}},44793(e,t,a){a.d(t,{E:()=>l});var r=a(74848);a(96540);var i=a(76037);let o=[{x:51,y:42,fill:"#ED168F",dx:190,dy:0,delay:"0s"},{x:241,y:42,fill:"#752A8A",dx:-190,dy:0,delay:"-1.2s"},{x:51,y:42,fill:"#B2218B",dx:95,dy:80,delay:"-.6s"},{x:146,y:122,fill:"#ED168F",dx:-95,dy:-80,delay:"-1.8s"},{x:241,y:42,fill:"#B2218B",dx:-95,dy:80,delay:"-.4s"},{x:146,y:122,fill:"#752A8A",dx:95,dy:-80,delay:"-1.6s"}],s=[[55,45],[245,45],[150,125]];function l(){return(0,r.jsxs)("div",{className:"p2p-replication-mesh",children:[(0,r.jsx)("style",{children:`
                .p2p-replication-mesh { line-height: 0; }
                .p2p-replication-mesh > svg { display: block; width: 100%; height: auto; }
                ${(0,i.z3)(".p2p-replication-mesh")}
                .p2p-replication-mesh .mesh { stroke: #A29DB6; stroke-width: 1; stroke-dasharray: 3 4; opacity: .5; }
                .p2p-replication-mesh .hop { opacity: 0; animation: p2p-replication-mesh-hop 2.4s linear infinite; }
                .p2p-replication-mesh .peer { fill: #A29DB6; font-size: 8px; letter-spacing: .06em; font-family: var(--ifm-font-family-monospace, ui-monospace, monospace); }
                @keyframes p2p-replication-mesh-hop {
                    0% { opacity: 0; transform: translate(0, 0); }
                    10% { opacity: 1; }
                    85% { opacity: 1; transform: translate(var(--dx), var(--dy)); }
                    95%, 100% { opacity: 0; transform: translate(var(--dx), var(--dy)); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .p2p-replication-mesh .hop { animation: none; }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"-20 -42.5 340 255",role:"img","aria-label":"Three RxDB peers replicate documents directly with each other over a WebRTC mesh without a server.",children:[(0,r.jsx)("line",{className:"mesh",x1:"55",y1:"45",x2:"245",y2:"45"}),(0,r.jsx)("line",{className:"mesh",x1:"55",y1:"45",x2:"150",y2:"125"}),(0,r.jsx)("line",{className:"mesh",x1:"245",y1:"45",x2:"150",y2:"125"}),o.map((e,t)=>(0,r.jsx)("rect",{className:"hop",x:e.x,y:e.y,width:"8",height:"6",rx:"1.5",fill:e.fill,style:{"--dx":e.dx+"px","--dy":e.dy+"px",animationDelay:e.delay}},t)),s.map(([e,t],a)=>(0,r.jsx)("svg",{x:e-22,y:t-30,width:"44",height:"60",viewBox:"0 0 103.33 140",children:(0,r.jsx)(i.a0,{})},"logo"+a)),s.map(([e,t],a)=>(0,r.jsx)("text",{className:"peer",x:e,y:t+41,textAnchor:"middle",children:"peer"},"peer"+a))]})]})}},97976(e,t,a){a.d(t,{L:()=>m});var r=a(74848),i=a(96540),o=a(76037);let s="http://www.w3.org/2000/svg",l=[[0,0],[1,0],[2,0],[2,1],[3,1],[4,1],[5,1],[5,2],[5,3],[4,3],[3,3],[2,3],[1,3],[1,2],[0,2],[0,1]],n=["#ED168F","#B2218B","#752A8A"];function c(e,t){return{x:12+27*e+12,y:34+27*t+12}}function m(){let e=(0,i.useRef)(null);return(0,i.useEffect)(()=>{let t=e.current;if(!t)return;let a=t.querySelector(".psc-grid"),r=t.querySelector(".psc-links"),i=t.querySelector(".psc-pkts"),o=t.querySelector(".psc-avatar"),m=o.querySelector(".psc-mover"),d=o.querySelector(".psc-sprite"),h=t.querySelector(".psc-logo"),p=!1,f=new Set,x=e=>new Promise(t=>{let a=setTimeout(()=>{f.delete(a),t()},e);f.add(a)});a.innerHTML="",r.innerHTML="",i.innerHTML="";let u=[],g=7,y=()=>(g=(9301*g+49297)%233280)/233280;for(let e=0;e<4;e++)for(let t=0;t<6;t++){let i=12+27*t,o=34+27*e,l=document.createElementNS(s,"g");l.setAttribute("class","psc-chunk");let n='<rect class="psc-base" x="'+i+'" y="'+o+'" width="24" height="24" rx="2"/>';for(let e=0;e<3;e++)n+='<rect class="psc-px" x="'+(i+3+3.6*Math.floor(5*y()))+'" y="'+(o+3+3.6*Math.floor(5*y()))+'" width="3.6" height="3.6"/>';l.innerHTML=n,a.appendChild(l);let m=c(t,e),d=document.createElementNS(s,"line");d.setAttribute("class","psc-link"),d.setAttribute("x1",String(m.x)),d.setAttribute("y1",String(m.y)),d.setAttribute("x2",String(224)),d.setAttribute("y2",String(87)),r.appendChild(d),u.push({c:t,r:e,el:l,link:d,on:!1,seen:!1})}let b=(e,t,a)=>{u.forEach(r=>{let i=1>=Math.abs(r.c-e)&&1>=Math.abs(r.r-t);if(i&&!r.on){r.on=!0;let e=r.el.querySelector(".psc-base");a&&e&&e.animate([{transform:"scale(.82)"},{transform:"none"}],{duration:420,easing:"cubic-bezier(.2, 1.4, .4, 1)"})}else!i&&r.on&&(r.on=!1,r.seen=!0);r.el.classList.toggle("on",r.on),r.el.classList.toggle("seen",r.seen&&!r.on),r.link.classList.toggle("on",r.on)})},w=(e,t)=>{let a=c(e,t);o.setAttribute("transform","translate("+a.x+" "+(a.y+8)+")")};if(w(l[0][0],l[0][1]),b(l[0][0],l[0][1],!1),window.matchMedia("(prefers-reduced-motion: reduce)").matches||"function"!=typeof t.animate)return;let v=()=>{let e=u.filter(e=>e.on);if(!e.length)return;let t=e[Math.floor(Math.random()*e.length)],a=c(t.c,t.r),r=.25>Math.random(),o=r?"#FFFFFF":n[Math.floor(3*Math.random())],l=document.createElementNS(s,"rect");l.setAttribute("class","psc-pkt"),l.setAttribute("x",String(a.x-2.5)),l.setAttribute("y",String(a.y-2)),l.setAttribute("width","5"),l.setAttribute("height","4"),l.setAttribute("rx","1"),l.setAttribute("fill",o),i.appendChild(l);let m="translate("+(224-a.x)+"px, "+(87-a.y)+"px)";l.animate(r?[{transform:m,opacity:0},{transform:m,opacity:1,offset:.1},{transform:"none",opacity:1,offset:.9},{transform:"none",opacity:0}]:[{transform:"none",opacity:0},{transform:"none",opacity:1,offset:.1},{transform:m,opacity:1,offset:.9},{transform:m,opacity:0}],{duration:1e3,easing:"ease-in-out"}).finished.then(()=>{if(l.remove(),!r&&!p){let e=h.querySelector(".b"+(n.indexOf(o)+1));e?.animate([{transform:"none"},{transform:"translateX(-4px)"},{transform:"none"}],{duration:320,easing:"cubic-bezier(.16, 1, .3, 1)"})}}).catch(()=>l.remove())},k=[[".leg-l",1],[".leg-r",-1],[".arm-l",-1],[".arm-r",1]],j=[],F=e=>{j.forEach(e=>e.cancel()),j=[],e&&k.forEach(([e,t])=>{let a=o.querySelector(e);a&&j.push(a.animate([{transform:"rotate("+30*t+"deg)"},{transform:"rotate("+-30*t+"deg)"}],{duration:260,iterations:1/0,direction:"alternate",easing:"ease-in-out"}))})};return(async()=>{let e=0;for(;!p;){if(await x(e%4==0?1400:250),p)return;let t=l[e],a=l[(e+1)%l.length],r=c(t[0],t[1]),i=c(a[0],a[1]);a[0]!==t[0]&&d.setAttribute("transform",a[0]<t[0]?"scale(-1 1)":""),F(!0);let o=m.animate([{transform:"none"},{transform:"translate("+(i.x-r.x)+"px, "+(i.y-r.y)+"px)"}],{duration:650,easing:"linear",fill:"forwards"});if(await x(325),p)return;b(a[0],a[1],!0),await o.finished.catch(()=>{}),o.cancel(),w(a[0],a[1]),F(!1),e=(e+1)%l.length}})(),(async()=>{for(;!p;)await x(220),p||v()})(),()=>{p=!0,f.forEach(e=>clearTimeout(e)),f.clear(),F(!1),t.getAnimations?.({subtree:!0}).forEach(e=>e.cancel())}},[]),(0,r.jsxs)("div",{className:"partial-sync-chunks",children:[(0,r.jsx)("style",{children:`
                .partial-sync-chunks { line-height: 0; }
                .partial-sync-chunks > svg { display: block; width: 100%; height: auto; }
                .partial-sync-chunks .psc-base { transform-box: fill-box; transform-origin: center; fill: #191C2C; stroke: #262B40; stroke-width: 1; transition: fill .35s, stroke .35s; }
                .partial-sync-chunks .psc-px { fill: #262B40; transition: fill .35s; }
                .partial-sync-chunks .psc-chunk.seen .psc-base { fill: #1F2234; stroke: #752A8A; stroke-dasharray: 3 2; }
                .partial-sync-chunks .psc-chunk.on .psc-base { fill: #2B1A34; stroke: #ED168F; stroke-dasharray: none; }
                .partial-sync-chunks .psc-chunk.on .psc-px { fill: #B2218B; }
                .partial-sync-chunks .psc-link { stroke: #ED168F; stroke-width: .8; stroke-dasharray: 2 3; opacity: 0; transition: opacity .35s; animation: psc-flow .6s linear infinite; }
                .partial-sync-chunks .psc-link.on { opacity: .5; }
                .partial-sync-chunks .psc-pkt { transform-box: fill-box; }
                .partial-sync-chunks .psc-label { fill: #A29DB6; font-size: 8px; letter-spacing: .04em; }
                .partial-sync-chunks .limb { transform-box: fill-box; transform-origin: 50% 0; }
                .partial-sync-chunks .psc-logo .part { transform-box: fill-box; transform-origin: center; }
                .partial-sync-chunks .psc-logo .outline { fill: #FFFFFF; }
                .partial-sync-chunks .psc-logo .b1, .partial-sync-chunks .psc-logo .corner { fill: #ED168F; }
                .partial-sync-chunks .psc-logo .b2 { fill: #B2218B; }
                .partial-sync-chunks .psc-logo .b3, .partial-sync-chunks .psc-logo .foot { fill: #752A8A; }
                @keyframes psc-flow { to { stroke-dashoffset: -5; } }
                @media (prefers-reduced-motion: reduce) {
                    .partial-sync-chunks .psc-link { animation: none; }
                }
            `}),(0,r.jsxs)("svg",{ref:e,viewBox:"0 0 300 150",role:"img","aria-label":"A blocky avatar walks across voxel world chunks. Chunks within its render distance start syncing to the RxDB database and chunks it leaves stop syncing but keep their checkpoint.",children:[(0,r.jsx)("g",{className:"psc-grid"}),(0,r.jsx)("g",{className:"psc-links"}),(0,r.jsx)("g",{className:"psc-pkts"}),(0,r.jsx)("g",{className:"psc-avatar",children:(0,r.jsx)("g",{className:"psc-mover",children:(0,r.jsxs)("g",{className:"psc-sprite",children:[(0,r.jsx)("rect",{className:"limb leg-l",x:"-4",y:"-7",width:"4",height:"7",fill:"#3B47A8"}),(0,r.jsx)("rect",{className:"limb leg-r",x:"0",y:"-7",width:"4",height:"7",fill:"#323C91"}),(0,r.jsx)("rect",{className:"limb arm-l",x:"-6",y:"-15",width:"2",height:"7",fill:"#C99A6E"}),(0,r.jsx)("rect",{className:"limb arm-r",x:"4",y:"-15",width:"2",height:"7",fill:"#B88A5F"}),(0,r.jsx)("rect",{x:"-4",y:"-15",width:"8",height:"8",fill:"#3FB6C2"}),(0,r.jsx)("rect",{x:"-4",y:"-23",width:"8",height:"8",fill:"#C99A6E"}),(0,r.jsx)("rect",{x:"-4",y:"-23",width:"8",height:"2.5",fill:"#4B3220"}),(0,r.jsx)("rect",{x:"-4",y:"-21",width:"1.2",height:"2",fill:"#4B3220"}),(0,r.jsx)("rect",{x:"1.2",y:"-19.5",width:"1.6",height:"1.4",fill:"#FFFFFF"}),(0,r.jsx)("rect",{x:"2.2",y:"-19.5",width:".8",height:"1.4",fill:"#3B2A8A"})]})})}),(0,r.jsx)("svg",{className:"psc-logo",x:"222",y:"46",width:"60",height:"81",viewBox:"0 0 103.33 140",children:(0,r.jsx)(o.a0,{})}),(0,r.jsx)("text",{className:"psc-label",x:"252",y:"140",textAnchor:"middle",children:"db.voxels"})]})]})}},68843(e,t,a){a.d(t,{w:()=>n});var r=a(74848),i=a(96540),o=a(76037);let s=[{name:"alice",y:28,pets:["rex"]},{name:"bob",y:68,pets:["tom","mimi"]},{name:"carol",y:108,pets:["kiki"]}],l=[{name:"rex",kind:"dog",y:28,color:"#ED168F"},{name:"tom",kind:"cat",y:58,color:"#B2218B"},{name:"mimi",kind:"cat",y:88,color:"#B2218B"},{name:"kiki",kind:"bird",y:118,color:"#752A8A"}];function n(){let e=(0,i.useRef)(null);return(0,i.useEffect)(()=>{let t=e.current;if(!t)return;let a=t.querySelector(".pop-links"),r=t.querySelector(".pop-call");if(!a||!r)return;let i=(e,a)=>t.querySelector("[data-"+e+'="'+a+'"]'),n=(e,t)=>{let r,i,s,n=document.createElementNS(o.gm,"path");return n.setAttribute("class","pop-link"),n.setAttribute("pathLength","1"),n.setAttribute("d",(r=l.find(e=>e.name===t),i=e.y+15,"M118 "+i+" C 150 "+i+", 150 "+(s=(r?r.y:0)+11)+", 182 "+s)),a.appendChild(n),n};if((0,o.Oe)()||"function"!=typeof t.animate){let e=s[0];return i("person",e.name)?.classList.add("hot"),e.pets.forEach(t=>{n(e,t).style.strokeDashoffset="0",i("pet",t)?.classList.add("hot")}),()=>{a.innerHTML="",t.querySelectorAll(".pop-row.hot").forEach(e=>e.classList.remove("hot"))}}let c=(0,o.ji)(t);return(async()=>{for(let e=0;!c.isStopped();e++){let a=s[e%s.length];if(r.textContent="await "+a.name+".populate('pets')",r.animate([{opacity:0},{opacity:1}],{duration:250}),i("person",a.name)?.classList.add("hot"),await c.wait(450),c.isStopped())return;let l=a.pets.map((e,t)=>{let r=n(a,e);return r.animate([{strokeDashoffset:1},{strokeDashoffset:0}],{duration:600,delay:160*t,easing:"ease-in-out",fill:"forwards"}),c.wait(600+160*t).then(()=>{if(c.isStopped())return;let t=i("pet",e);t?.classList.add("hot"),t?.querySelector(".pop-paw")?.animate([{transform:"none"},{transform:"scale(1.5)"},{transform:"none"}],{duration:450,easing:o.C2})}),r});if(await c.wait(900+(a.pets.length-1)*160),c.isStopped()||(r.textContent="//> ["+a.pets.map(e=>"RxDocument "+e).join(", ")+"]",await c.wait(1500),c.isStopped()))return;l.forEach(e=>{e.animate([{opacity:1},{opacity:0}],{duration:300,fill:"forwards"}).finished.catch(()=>{}).then(()=>e.remove())}),t.querySelectorAll(".pop-row.hot").forEach(e=>e.classList.remove("hot")),await c.wait(400)}})(),()=>{c.stop(),a.innerHTML="",t.querySelectorAll(".pop-row.hot").forEach(e=>e.classList.remove("hot"))}},[]),(0,r.jsxs)("div",{className:"rx-population",children:[(0,r.jsx)("style",{children:`
                .rx-population { line-height: 0; }
                .rx-population > svg { display: block; width: 100%; height: auto; }
                ${(0,o.z3)(".rx-population")}
                .rx-population text { font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
                .rx-population .pop-panel { fill: #171A29; stroke: #262B40; stroke-width: 1; }
                .rx-population .pop-label { fill: #A29DB6; font-size: 7.5px; letter-spacing: .04em; }
                .rx-population .pop-bg { fill: #1E2236; stroke: #262B40; stroke-width: 1; transition: stroke .25s; }
                .rx-population .pop-row.hot .pop-bg { stroke: #ED168F; }
                .rx-population .pop-name { fill: #ECE9F2; font-size: 8px; }
                .rx-population .pop-ref { fill: #A29DB6; font-size: 6px; }
                .rx-population .pop-person { fill: #FFFFFF; }
                .rx-population .pop-paw { transform-box: fill-box; transform-origin: center; }
                .rx-population .pop-link { fill: none; stroke: #ED168F; stroke-width: 1.4; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; }
                .rx-population .pop-call { fill: #ED168F; font-size: 9px; }
                @media (prefers-reduced-motion: reduce) {
                    .rx-population .pop-bg { transition: none; }
                }
            `}),(0,r.jsxs)("svg",{ref:e,viewBox:"0 0 300 180",role:"img","aria-label":"Person documents hold the ids of their pets. populate('pets') follows each id into the pets collection and resolves the pet documents.",children:[(0,r.jsx)("rect",{className:"pop-panel",x:"8",y:"6",width:"116",height:"148",rx:"5"}),(0,r.jsx)("rect",{className:"pop-panel",x:"176",y:"6",width:"116",height:"148",rx:"5"}),(0,r.jsx)("svg",{x:"14",y:"11",width:"8",height:"10.8",viewBox:"0 0 103.33 140",children:(0,r.jsx)(o.a0,{})}),(0,r.jsx)("text",{className:"pop-label",x:"26",y:"19",children:"db.humans"}),(0,r.jsx)("svg",{x:"182",y:"11",width:"8",height:"10.8",viewBox:"0 0 103.33 140",children:(0,r.jsx)(o.a0,{})}),(0,r.jsx)("text",{className:"pop-label",x:"194",y:"19",children:"db.pets"}),s.map(e=>(0,r.jsxs)("g",{className:"pop-row","data-person":e.name,children:[(0,r.jsx)("rect",{className:"pop-bg",x:"14",y:e.y,width:"104",height:"30",rx:"3"}),(0,r.jsx)("circle",{className:"pop-person",cx:"27",cy:e.y+11,r:"3.6"}),(0,r.jsx)("path",{className:"pop-person",d:"M20.5 "+(e.y+24)+" a6.5 6.5 0 0 1 13 0z"}),(0,r.jsx)("text",{className:"pop-name",x:"36",y:e.y+13,children:e.name}),(0,r.jsx)("text",{className:"pop-ref",x:"36",y:e.y+23,children:"pets: ["+e.pets.map(e=>"'"+e+"'").join(", ")+"]"})]},e.name)),l.map(e=>(0,r.jsxs)("g",{className:"pop-row","data-pet":e.name,children:[(0,r.jsx)("rect",{className:"pop-bg",x:"182",y:e.y,width:"104",height:"22",rx:"3"}),(0,r.jsxs)("g",{className:"pop-paw",fill:e.color,children:[(0,r.jsx)("ellipse",{cx:"195",cy:e.y+13.5,rx:"3.4",ry:"2.8"}),(0,r.jsx)("circle",{cx:"190.6",cy:e.y+8.5,r:"1.4"}),(0,r.jsx)("circle",{cx:"193.6",cy:e.y+6.8,r:"1.4"}),(0,r.jsx)("circle",{cx:"196.6",cy:e.y+6.8,r:"1.4"}),(0,r.jsx)("circle",{cx:"199.4",cy:e.y+8.5,r:"1.4"})]}),(0,r.jsx)("text",{className:"pop-name",x:"206",y:e.y+14,children:e.name}),(0,r.jsx)("text",{className:"pop-ref",x:"280",y:e.y+14,textAnchor:"end",children:e.kind})]},e.name)),(0,r.jsx)("g",{className:"pop-links"}),(0,r.jsx)("text",{className:"pop-call",x:"150",y:"172",textAnchor:"middle",children:"alice.populate('pets')"})]})]})}},34066(e,t,a){a.d(t,{O:()=>o});var r=a(74848);a(96540);var i=a(76037);function o(){return(0,r.jsxs)("div",{className:"reactive-stream",children:[(0,r.jsx)("style",{children:`
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
            `}),(0,r.jsxs)("svg",{viewBox:"0 0 300 225",role:"img","aria-label":"The three layers of the RxDB logo light up one after another with a ripple while colored marbles flow along a stream line, like results emitted by an observable query.",children:[(0,r.jsxs)("svg",{className:"rst-logo",x:"82.47",y:"26.25",width:"135.06",height:"148.5",viewBox:"-12 0 127.33 140",children:[(0,r.jsx)(i.a0,{}),(0,r.jsx)("rect",{className:"rst-ghost b1",x:"6.66",y:"33.34",width:"90",height:"20"}),(0,r.jsx)("rect",{className:"rst-ghost b2",x:"6.67",y:"60",width:"90",height:"20"}),(0,r.jsx)("rect",{className:"rst-ghost b3",x:"6.66",y:"86.66",width:"90",height:"20"})]}),(0,r.jsx)("rect",{className:"rst-track",x:"45",y:"190.75",width:"210",height:"2"}),(0,r.jsx)("rect",{className:"rst-end",x:"254",y:"185.75",width:"2",height:"12"}),(0,r.jsx)("circle",{className:"rst-marble",cx:"50",cy:"191.75",r:"5",fill:"#ED168F"}),(0,r.jsx)("circle",{className:"rst-marble rst-m2",cx:"50",cy:"191.75",r:"5",fill:"#B2218B"}),(0,r.jsx)("circle",{className:"rst-marble rst-m3",cx:"50",cy:"191.75",r:"5",fill:"#752A8A"}),(0,r.jsx)("text",{className:"rst-tag",x:"10.5",y:"215",children:"query.$.subscribe()"})]})]})}},9537(e,t,a){a.d(t,{W:()=>o});var r=a(74848);a(96540);var i=a(76037);function o(){return(0,r.jsxs)("div",{className:"replication-push-pull",children:[(0,r.jsx)("style",{children:`
                .replication-push-pull { line-height: 0; }
                .replication-push-pull > svg { display: block; width: 100%; height: auto; }
                .replication-push-pull .rpp-logo { overflow: visible; }
                .replication-push-pull .part { transform-box: fill-box; transform-origin: center; }
                .replication-push-pull .outline { fill: #FFFFFF; }
                .replication-push-pull .b1 { --rpp-c: #ED168F; }
                .replication-push-pull .b2 { --rpp-c: #B2218B; }
                .replication-push-pull .b3 { --rpp-c: #752A8A; }
                .replication-push-pull .bar { fill: var(--rpp-c); }
                .replication-push-pull .corner { fill: #ED168F; }
                .replication-push-pull .foot { fill: #752A8A; }
                .replication-push-pull .rpp-lane { stroke: #A29DB6; stroke-width: 1; stroke-dasharray: 3 4; opacity: .55; }
                .replication-push-pull .rpp-lbl { fill: #A29DB6; font-size: 9px; letter-spacing: .06em; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .replication-push-pull .rpp-tag { fill: #A29DB6; font-size: 10px; letter-spacing: .04em; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .replication-push-pull .rpp-pk { transform-box: fill-box; opacity: 0; animation: replication-push-pull-push 3s linear infinite; }
                .replication-push-pull .rpp-pl { transform-box: fill-box; opacity: 0; animation: replication-push-pull-pull 3s linear infinite; }
                .replication-push-pull .rpp-d1 { animation-delay: -1s; }
                .replication-push-pull .rpp-d2 { animation-delay: -2s; }
                .replication-push-pull .rpp-cli .b3 { animation: replication-push-pull-flash 1s .64s infinite; }
                .replication-push-pull .rpp-box { fill: #171A29; stroke: #FFFFFF; stroke-width: 1.6; }
                .replication-push-pull .rpp-unit { fill: #1E2236; stroke: #262B40; stroke-width: 1; }
                .replication-push-pull .rpp-vent { stroke: #4B4F66; stroke-width: 1.4; }
                .replication-push-pull .rpp-led { fill: #4B4F66; }
                .replication-push-pull .rpp-led-in { --rpp-c: #4B4F66; animation: replication-push-pull-flash 1s .64s infinite; }
                @keyframes replication-push-pull-push {
                    0% { transform: translateX(0); opacity: 0; }
                    8% { opacity: 1; }
                    88% { transform: translateX(116px); opacity: 1; }
                    92%, 100% { transform: translateX(120px); opacity: 0; }
                }
                @keyframes replication-push-pull-pull {
                    0% { transform: translateX(0); opacity: 0; }
                    8% { opacity: 1; }
                    88% { transform: translateX(-116px); opacity: 1; }
                    92%, 100% { transform: translateX(-120px); opacity: 0; }
                }
                @keyframes replication-push-pull-flash {
                    0% { fill: #FFFFFF; }
                    40%, 100% { fill: var(--rpp-c); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .replication-push-pull .rpp-pk, .replication-push-pull .rpp-pl, .replication-push-pull .part, .replication-push-pull .rpp-led-in { animation: none !important; }
                    .replication-push-pull .rpp-pk.rpp-d0 { opacity: 1; transform: translateX(58px); }
                    .replication-push-pull .rpp-pl.rpp-d0 { opacity: 1; transform: translateX(-58px); }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"0 0 330 175",role:"img","aria-label":"An RxDB client and a server exchange documents. Pushed documents travel from the client to the server and pulled documents travel back.",children:[(0,r.jsxs)("g",{transform:"translate(15 15)",children:[(0,r.jsx)("svg",{className:"rpp-logo rpp-cli",x:"12",y:"18",width:"70",height:"95",viewBox:"0 0 103.33 140",children:(0,r.jsx)(i.a0,{})}),(0,r.jsxs)("g",{className:"rpp-srv",children:[(0,r.jsx)("rect",{className:"rpp-box",x:"222",y:"22",width:"62",height:"88",rx:"4"}),(0,r.jsx)("rect",{className:"rpp-unit",x:"228",y:"30",width:"50",height:"22",rx:"2"}),(0,r.jsx)("rect",{className:"rpp-unit",x:"228",y:"56",width:"50",height:"22",rx:"2"}),(0,r.jsx)("rect",{className:"rpp-unit",x:"228",y:"82",width:"50",height:"22",rx:"2"}),(0,r.jsx)("path",{className:"rpp-vent",d:"M234 36v10M238 36v10M242 36v10M234 62v10M238 62v10M242 62v10M234 88v10M238 88v10M242 88v10"}),(0,r.jsx)("circle",{className:"rpp-led rpp-led-in",cx:"270",cy:"41",r:"2.6"}),(0,r.jsx)("circle",{className:"rpp-led",cx:"270",cy:"67",r:"2.6"}),(0,r.jsx)("circle",{className:"rpp-led",cx:"270",cy:"93",r:"2.6"})]}),(0,r.jsx)("line",{className:"rpp-lane",x1:"88",y1:"53",x2:"212",y2:"53"}),(0,r.jsx)("line",{className:"rpp-lane",x1:"88",y1:"75",x2:"212",y2:"75"}),(0,r.jsx)("text",{className:"rpp-lbl",x:"150",y:"44",textAnchor:"middle",children:"push \u2192"}),(0,r.jsx)("text",{className:"rpp-lbl",x:"150",y:"94",textAnchor:"middle",children:"\u2190 pull"}),(0,r.jsx)("rect",{className:"rpp-pk rpp-d0",x:"86",y:"50",width:"10",height:"6",rx:"1.5",fill:"#ED168F"}),(0,r.jsx)("rect",{className:"rpp-pk rpp-d1",x:"86",y:"50",width:"10",height:"6",rx:"1.5",fill:"#B2218B"}),(0,r.jsx)("rect",{className:"rpp-pk rpp-d2",x:"86",y:"50",width:"10",height:"6",rx:"1.5",fill:"#ED168F"}),(0,r.jsx)("rect",{className:"rpp-pl rpp-d0",x:"204",y:"72",width:"10",height:"6",rx:"1.5",fill:"#752A8A"}),(0,r.jsx)("rect",{className:"rpp-pl rpp-d1",x:"204",y:"72",width:"10",height:"6",rx:"1.5",fill:"#B2218B"}),(0,r.jsx)("rect",{className:"rpp-pl rpp-d2",x:"204",y:"72",width:"10",height:"6",rx:"1.5",fill:"#752A8A"}),(0,r.jsx)("text",{className:"rpp-lbl",x:"47",y:"134",textAnchor:"middle",children:"client"}),(0,r.jsx)("text",{className:"rpp-lbl",x:"253",y:"134",textAnchor:"middle",children:"server"})]}),(0,r.jsx)("text",{className:"rpp-tag",x:"8",y:"166",children:"replication"})]})]})}},99832(e,t,a){a.d(t,{J:()=>o});var r=a(74848);a(96540);var i=a(76037);function o(){return(0,r.jsxs)("div",{className:"rx-pipeline-flow",children:[(0,r.jsx)("style",{children:`
                .rx-pipeline-flow { line-height: 0; }
                .rx-pipeline-flow > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .rx-pipeline-flow text { font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .rx-pipeline-flow .part { transform-box: fill-box; transform-origin: center; }
                ${(0,i.z3)(".rx-pipeline-flow .rpf-logo")}
                .rx-pipeline-flow .rpf-pipe { stroke: #262B40; stroke-width: 8; stroke-linecap: round; fill: none; }
                .rx-pipeline-flow .rpf-fn rect { fill: #0D0F18; stroke: #FFFFFF; stroke-width: 1.2; }
                .rx-pipeline-flow .rpf-fn text { fill: #ECE9F2; font-size: 8px; font-weight: 700; }
                .rx-pipeline-flow .rpf-fn { transform-box: fill-box; transform-origin: center; animation: rpf-fn 2.6s cubic-bezier(.2, 1.4, .4, 1) infinite; }
                .rx-pipeline-flow .rpf-pa, .rx-pipeline-flow .rpf-pb { transform-box: fill-box; opacity: 0; }
                .rx-pipeline-flow .rpf-pa { fill: #ED168F; animation: rpf-pipe-a 2.6s ease-in infinite; }
                .rx-pipeline-flow .rpf-pb { fill: #752A8A; animation: rpf-pipe-b 2.6s ease-out infinite; }
                .rx-pipeline-flow .rpf-src .b1 { animation: rpf-flash-pink 2.6s infinite; }
                .rx-pipeline-flow .rpf-dst .b3 { animation: rpf-flash-purple 2.6s 2.24s infinite; }
                .rx-pipeline-flow .rpf-lbl { fill: #A29DB6; font-size: 9px; letter-spacing: .06em; }
                @keyframes rpf-pipe-a { 0% { opacity: 0; transform: none; } 6% { opacity: 1; } 40% { opacity: 1; transform: translateX(50px); } 44%, 100% { opacity: 0; transform: translateX(50px); } }
                @keyframes rpf-pipe-b { 0%, 46% { opacity: 0; transform: none; } 50% { opacity: 1; } 84% { opacity: 1; transform: translateX(50px); } 88%, 100% { opacity: 0; transform: translateX(50px); } }
                @keyframes rpf-fn { 0%, 38% { transform: none; } 43% { transform: scale(1.15); } 50%, 100% { transform: none; } }
                @keyframes rpf-flash-pink { 0% { fill: #FFFFFF; } 40%, 100% { fill: #ED168F; } }
                @keyframes rpf-flash-purple { 0% { fill: #FFFFFF; } 40%, 100% { fill: #752A8A; } }
                @media (prefers-reduced-motion: reduce) {
                    .rx-pipeline-flow .rpf-fn,
                    .rx-pipeline-flow .rpf-pa,
                    .rx-pipeline-flow .rpf-pb,
                    .rx-pipeline-flow .rpf-src .b1,
                    .rx-pipeline-flow .rpf-dst .b3 { animation: none; }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"0 0 300 145",role:"img","aria-label":"A document written to the source RxDB collection flows through the handler function of an RxPipeline and becomes a new document in the destination collection.",children:[(0,r.jsx)("svg",{className:"rpf-logo rpf-src",x:"12",y:"18",width:"70",height:"95",viewBox:"0 0 103.33 140",children:(0,r.jsx)(i.a0,{})}),(0,r.jsx)("svg",{className:"rpf-logo rpf-dst",x:"218",y:"18",width:"70",height:"95",viewBox:"0 0 103.33 140",children:(0,r.jsx)(i.a0,{})}),(0,r.jsx)("path",{className:"rpf-pipe",d:"M88 65 H212"}),(0,r.jsx)("rect",{className:"rpf-pa",x:"90",y:"62",width:"10",height:"6",rx:"1.5"}),(0,r.jsx)("rect",{className:"rpf-pb",x:"152",y:"62",width:"10",height:"6",rx:"1.5"}),(0,r.jsxs)("g",{className:"rpf-fn",children:[(0,r.jsx)("rect",{x:"133",y:"56",width:"34",height:"18",rx:"4"}),(0,r.jsx)("text",{x:"150",y:"68",textAnchor:"middle",children:"fn()"})]}),(0,r.jsx)("text",{className:"rpf-lbl",x:"47",y:"134",textAnchor:"middle",children:"source"}),(0,r.jsx)("text",{className:"rpf-lbl",x:"253",y:"134",textAnchor:"middle",children:"destination"})]})]})}},90304(e,t,a){a.d(t,{L:()=>d});var r=a(74848),i=a(96540),o=a(76037);let s=[27,34],l=[34,74],n=[33,112],c=[104,56],m=[104,104];function d(){let e=(0,i.useRef)(null);return(0,i.useEffect)(()=>{let t=e.current;if(!t||(0,o.Oe)()||"function"!=typeof t.animate)return;let a=t.querySelector(".rsr-pkts"),r=t.querySelector(".rsr-db"),i=(0,o.ji)(t),{wait:d,isStopped:h}=i,p=(e,t,r,i)=>{let s=document.createElementNS(o.gm,"g"),l=document.createElementNS(o.gm,"rect");l.setAttribute("x",String(e[0]-3)),l.setAttribute("y",String(e[1]-2)),l.setAttribute("width","6"),l.setAttribute("height","4"),l.setAttribute("rx","1"),l.setAttribute("fill",r),s.appendChild(l),a.appendChild(s);let n="translate("+(t[0]-e[0])+"px, "+(t[1]-e[1])+"px)";return s.animate([{transform:"none",opacity:0},{transform:"none",opacity:1,offset:.08},{transform:n,opacity:1,offset:.92},{transform:n,opacity:0}],{duration:i,easing:"ease-in-out"}).finished.catch(()=>{}).then(()=>s.remove())},f=(e,a)=>{t.querySelector(".rsr-led-"+e)?.animate([{fill:"#ED168F"},{fill:"#ED168F",offset:.6},{fill:"#4B4F66"}],{duration:700}),t.querySelector(".rsr-link-"+e)?.animate([{opacity:0},{opacity:.9,offset:.2},{opacity:0}],{duration:700}),r.querySelector("."+a)?.animate([{transform:"none"},{transform:"translateX(-4px)"},{transform:"none"}],{duration:380,delay:120,easing:o.Po})},x=[async()=>{await p(l,c,"#FFFFFF",700),h()||(f("a","b2"),await d(350),await Promise.all([p(c,s,"#B2218B",700),p(c,l,"#B2218B",700)]))},async()=>{await p(n,m,"#FFFFFF",700),h()||(f("b","b3"),await d(350),await p(m,n,"#752A8A",700))},async()=>{await p(s,c,"#FFFFFF",700),h()||(f("a","b1"),await d(350),await Promise.all([p(c,s,"#ED168F",700),p(c,l,"#ED168F",700)]))}];return(async()=>{for(let e=0;!h();e++){if(await d(500),h())return;await x[e%x.length]()}})(),()=>{i.stop(),a.innerHTML=""}},[]),(0,r.jsxs)("div",{className:"rx-server-rack",children:[(0,r.jsx)("style",{children:`
                .rx-server-rack { line-height: 0; }
                .rx-server-rack > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .rx-server-rack text { font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .rx-server-rack .part { transform-box: fill-box; transform-origin: center; }
                ${(0,o.z3)(".rx-server-rack .rsr-db")}
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
            `}),(0,r.jsxs)("svg",{ref:e,viewBox:"0 0 300 150",role:"img","aria-label":"Client devices send requests to an RxServer rack with a replication endpoint and a REST endpoint, both backed by the RxDB database inside the rack.",children:[(0,r.jsx)("line",{className:"rsr-lane",x1:"27",y1:"34",x2:"104",y2:"56"}),(0,r.jsx)("line",{className:"rsr-lane",x1:"34",y1:"74",x2:"104",y2:"56"}),(0,r.jsx)("line",{className:"rsr-lane",x1:"33",y1:"112",x2:"104",y2:"104"}),(0,r.jsx)("rect",{className:"rsr-device",x:"12",y:"22",width:"14",height:"24",rx:"2.5"}),(0,r.jsx)("rect",{className:"rsr-device-fill",x:"17",y:"42",width:"4",height:"1.4",rx:".7"}),(0,r.jsx)("rect",{className:"rsr-device",x:"8",y:"65",width:"22",height:"14",rx:"1.5"}),(0,r.jsx)("rect",{className:"rsr-device-fill",x:"4",y:"80",width:"30",height:"2.6",rx:"1"}),(0,r.jsx)("rect",{className:"rsr-device",x:"8",y:"102",width:"24",height:"18",rx:"1.5"}),(0,r.jsx)("line",{className:"rsr-device",x1:"8",y1:"106.5",x2:"32",y2:"106.5"}),(0,r.jsx)("text",{className:"rsr-dlbl",x:"11",y:"116",children:">_"}),(0,r.jsx)("text",{className:"rsr-dlbl",x:"19",y:"54",textAnchor:"middle",children:"app"}),(0,r.jsx)("text",{className:"rsr-dlbl",x:"19",y:"91",textAnchor:"middle",children:"app"}),(0,r.jsx)("text",{className:"rsr-dlbl",x:"20",y:"130",textAnchor:"middle",children:"curl"}),(0,r.jsx)("rect",{className:"rsr-chassis",x:"98",y:"8",width:"194",height:"134",rx:"5"}),(0,r.jsx)("circle",{className:"rsr-screw",cx:"104",cy:"14",r:"1.6"}),(0,r.jsx)("circle",{className:"rsr-screw",cx:"286",cy:"14",r:"1.6"}),(0,r.jsx)("circle",{className:"rsr-screw",cx:"104",cy:"136",r:"1.6"}),(0,r.jsx)("circle",{className:"rsr-screw",cx:"286",cy:"136",r:"1.6"}),(0,r.jsx)("text",{className:"rsr-slbl",x:"112",y:"23",children:"RxServer \xb7 :80"}),(0,r.jsx)("circle",{className:"rsr-power",cx:"278",cy:"20",r:"2"}),(0,r.jsx)("rect",{className:"rsr-unit",x:"104",y:"32",width:"96",height:"46",rx:"2.5"}),(0,r.jsx)("rect",{className:"rsr-unit",x:"104",y:"84",width:"96",height:"46",rx:"2.5"}),(0,r.jsx)("text",{className:"rsr-slbl",x:"112",y:"48",children:"replication"}),(0,r.jsx)("text",{className:"rsr-spath",x:"112",y:"62",children:"/heroes/0"}),(0,r.jsx)("text",{className:"rsr-slbl",x:"112",y:"100",children:"rest"}),(0,r.jsx)("text",{className:"rsr-spath",x:"112",y:"114",children:"/rest/0/query"}),(0,r.jsx)("circle",{className:"rsr-led rsr-led-a",cx:"192",cy:"40",r:"2.2"}),(0,r.jsx)("circle",{className:"rsr-led rsr-led-b",cx:"192",cy:"92",r:"2.2"}),(0,r.jsx)("path",{className:"rsr-vent",d:"M180 52v18M184 52v18M188 52v18M192 52v18M180 104v18M184 104v18M188 104v18M192 104v18"}),(0,r.jsx)("line",{className:"rsr-link rsr-link-a",x1:"200",y1:"55",x2:"216",y2:"70"}),(0,r.jsx)("line",{className:"rsr-link rsr-link-b",x1:"200",y1:"107",x2:"216",y2:"88"}),(0,r.jsx)("svg",{className:"rsr-db",x:"214",y:"34",width:"66",height:"89.4",viewBox:"0 0 103.33 140",children:(0,r.jsx)(o.a0,{})}),(0,r.jsx)("text",{className:"rsr-slbl",x:"247",y:"134",textAnchor:"middle",children:"db.heroes"}),(0,r.jsx)("g",{className:"rsr-pkts"})]})]})}},36929(e,t,a){a.d(t,{I:()=>n});var r=a(74848),i=a(96540),o=a(76037);let s=["pink","magenta","purple"],l=[[0,.45],[2,.8],[1,.3],[0,.9],[2,.55],[1,.7],[0,1],[1,1],[2,1]];function n(){let e=(0,i.useRef)(null);return(0,i.useEffect)(()=>{let t=e.current;if(!t||(0,o.Oe)())return;let a=Array.from(t.querySelectorAll(".bar")),r=t.querySelector(".rsb-call");if(a.length<3||!r)return;let i=(0,o.ji)(t);return(async()=>{let e=0;for(;!i.isStopped();){if(await i.wait(1400),i.isStopped())return;let[t,o]=l[e%l.length];e++,a[t].style.transform="scaleX("+o+")",r.textContent="state.set('"+s[t]+"', "+o.toFixed(2)+")"}})(),()=>i.stop()},[]),(0,r.jsxs)("div",{className:"rx-state-bars",ref:e,children:[(0,r.jsx)("style",{children:`
                .rx-state-bars { line-height: 0; }
                .rx-state-bars > svg { display: block; width: 100%; height: auto; }
                .rx-state-bars .part { transform-box: fill-box; transform-origin: center; }
                ${(0,o.z3)(".rx-state-bars")}
                .rx-state-bars .bar { transform-origin: left center; transition: transform .7s cubic-bezier(.2, 1.4, .4, 1); }
                .rx-state-bars .rsb-call { fill: #ED168F; font-size: 9px; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
                @media (prefers-reduced-motion: reduce) {
                    .rx-state-bars .bar { transition: none; }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"0 0 240 180",role:"img","aria-label":"The three layers of the RxDB logo act as values of a reactive state object. Each state.set() call changes the width of one layer.",children:[(0,r.jsx)("svg",{x:"72",y:"14",width:"96",height:"130",viewBox:"0 0 103.33 140",overflow:"visible",children:(0,r.jsx)(o.a0,{})}),(0,r.jsx)("text",{className:"rsb-call",x:"120",y:"166",textAnchor:"middle",children:"state.set('pink', 1.00)"})]})]})}},54726(e,t,a){a.d(t,{d:()=>o});var r=a(74848);a(96540);var i=a(76037);function o(){return(0,r.jsxs)("div",{className:"schema-migration-logo",children:[(0,r.jsx)("style",{children:`
                .schema-migration-logo { line-height: 0; }
                .schema-migration-logo > svg { display: block; width: 100%; height: auto; }
                .schema-migration-logo .logo { overflow: visible; }
                .schema-migration-logo .part { transform-box: fill-box; transform-origin: center; }
                .schema-migration-logo .outline { fill: #FFFFFF; }
                .schema-migration-logo .corner { fill: #ED168F; }
                .schema-migration-logo .foot { fill: #752A8A; }
                .schema-migration-logo .b1 { --c: #ED168F; --o: #4B4F66; }
                .schema-migration-logo .b2 { --c: #B2218B; --o: #3F4358; animation-delay: .15s; }
                .schema-migration-logo .b3 { --c: #752A8A; --o: #34374A; animation-delay: .3s; }
                .schema-migration-logo .bar { fill: var(--c); animation: schema-migration-logo-migrate 4.8s cubic-bezier(.16, 1, .3, 1) infinite both; }
                .schema-migration-logo .ver {
                    font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
                    font-size: 10px;
                    font-weight: 700;
                }
                .schema-migration-logo .v1 { fill: #A29DB6; opacity: 0; animation: schema-migration-logo-ver1 4.8s infinite; }
                .schema-migration-logo .v2 { fill: #ED168F; animation: schema-migration-logo-ver2 4.8s infinite; }
                @keyframes schema-migration-logo-migrate {
                    0%, 18% { transform: scaleY(1); fill: var(--o); }
                    24% { transform: scaleY(0); fill: var(--o); }
                    24.1% { transform: scaleY(0); fill: var(--c); }
                    30%, 76% { transform: scaleY(1); fill: var(--c); }
                    82% { transform: scaleY(0); fill: var(--c); }
                    82.1% { transform: scaleY(0); fill: var(--o); }
                    88%, 100% { transform: scaleY(1); fill: var(--o); }
                }
                @keyframes schema-migration-logo-ver1 { 0%, 26% { opacity: 1; } 30%, 84% { opacity: 0; } 88%, 100% { opacity: 1; } }
                @keyframes schema-migration-logo-ver2 { 0%, 26% { opacity: 0; } 30%, 84% { opacity: 1; } 88%, 100% { opacity: 0; } }
                @media (prefers-reduced-motion: reduce) {
                    .schema-migration-logo .bar, .schema-migration-logo .v1, .schema-migration-logo .v2 { animation: none; }
                }
            `}),(0,r.jsx)("svg",{viewBox:"0 0 300 225",role:"img","aria-label":"The RxDB logo layers flip one after another from the gray colors of schema version 1 to the brand colors of schema version 2",children:(0,r.jsxs)("svg",{className:"logo",x:"0",y:"38.25",width:"300",height:"148.5",viewBox:"0 -22 103.33 162",children:[(0,r.jsx)(i.a0,{}),(0,r.jsx)("text",{className:"ver v1",x:"0",y:"-8",children:"schema v1"}),(0,r.jsx)("text",{className:"ver v2",x:"0",y:"-8",children:"schema v2 \xb7 migrated"})]})})]})}},43915(e,t,a){a.d(t,{i:()=>o});var r=a(74848);a(96540);var i=a(76037);function o(){return(0,r.jsxs)("div",{className:"schema-validation-logo",children:[(0,r.jsx)("style",{children:`
                .schema-validation-logo { line-height: 0; }
                .schema-validation-logo > svg { display: block; width: 100%; height: auto; }
                .schema-validation-logo .logo { overflow: visible; }
                .schema-validation-logo .part { transform-box: fill-box; transform-origin: center; }
                ${(0,i.z3)(".schema-validation-logo")}
                .schema-validation-logo .b2 { animation: schema-validation-logo-valid 4.4s cubic-bezier(.2, 1.4, .4, 1) infinite; }
                .schema-validation-logo .bad { transform-box: fill-box; transform-origin: center; opacity: 0; animation: schema-validation-logo-invalid 4.4s cubic-bezier(.16, 1, .3, 1) infinite; }
                .schema-validation-logo .bad rect { fill: #5A5F78; }
                .schema-validation-logo .bad path { stroke: #FFFFFF; stroke-width: 2.4; stroke-linecap: round; fill: none; }
                .schema-validation-logo .readout {
                    font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
                    font-size: 10px;
                }
                .schema-validation-logo .r1 { fill: #ECE9F2; animation: schema-validation-logo-sv1 4.4s infinite; }
                .schema-validation-logo .r2 { fill: #ED168F; opacity: 0; animation: schema-validation-logo-sv2 4.4s infinite; }
                @keyframes schema-validation-logo-invalid {
                    0% { opacity: 0; transform: translateX(-70%); }
                    8% { opacity: 1; }
                    22% { transform: translateX(-6%); }
                    25% { transform: translateX(-14%); }
                    28% { transform: translateX(-7%); }
                    31% { transform: translateX(-11%); }
                    34% { opacity: 1; transform: translateX(-9%); }
                    48%, 100% { opacity: 0; transform: translate(-24%, 150%) rotate(-24deg); }
                }
                @keyframes schema-validation-logo-valid {
                    0%, 52% { opacity: 0; transform: translateX(-70%); }
                    56% { opacity: 1; }
                    68%, 90% { opacity: 1; transform: none; }
                    97%, 100% { opacity: 0; transform: none; }
                }
                @keyframes schema-validation-logo-sv1 { 0%, 46% { opacity: 1; } 50%, 100% { opacity: 0; } }
                @keyframes schema-validation-logo-sv2 { 0%, 52% { opacity: 0; } 56%, 92% { opacity: 1; } 97%, 100% { opacity: 0; } }
                @media (prefers-reduced-motion: reduce) {
                    .schema-validation-logo .b2, .schema-validation-logo .bad, .schema-validation-logo .r1, .schema-validation-logo .r2 { animation: none; }
                    .schema-validation-logo .r1 { opacity: 0; }
                    .schema-validation-logo .r2 { opacity: 1; }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"0 0 300 225",role:"img","aria-label":"An invalid document with age set to a string bounces off the RxDB logo and falls out, then a valid document with a numeric age slides into its slot",children:[(0,r.jsxs)("svg",{className:"logo",x:"0",y:"25.9",width:"300",height:"148.5",viewBox:"-50 0 153.33 160",children:[(0,r.jsx)(i.a0,{}),(0,r.jsxs)("g",{className:"bad",children:[(0,r.jsx)("rect",{x:"6.67",y:"60",width:"90",height:"20"}),(0,r.jsx)("path",{d:"M46.7 65 l10 10 M56.7 65 l-10 10"})]})]}),(0,r.jsxs)("g",{className:"readout","aria-hidden":"true",children:[(0,r.jsx)("text",{className:"r1",x:"150",y:"195",textAnchor:"middle",children:'{ age: "abc" } \xb7 rejected'}),(0,r.jsx)("text",{className:"r2",x:"150",y:"195",textAnchor:"middle",children:"{ age: 42 } \xb7 valid"})]})]})]})}},19605(e,t,a){a.d(t,{H:()=>s});var r=a(74848),i=a(96540),o=a(76037);function s(){let e="sharding-split-"+(0,i.useId)().replace(/[^a-zA-Z0-9_-]/g,"");return(0,r.jsxs)("div",{className:"sharding-split",children:[(0,r.jsx)("style",{children:`
                .sharding-split { line-height: 0; }
                .sharding-split > svg { display: block; width: 100%; height: auto; }
                ${(0,o.z3)(".sharding-split")}
                .sharding-split .part { transform-box: fill-box; transform-origin: center; }
                .sharding-split .shard { animation: 4.4s cubic-bezier(.2, 1.4, .4, 1) infinite; }
                .sharding-split .s1 { animation-name: sharding-split-1; }
                .sharding-split .s2 { animation-name: sharding-split-2; }
                .sharding-split .s3 { animation-name: sharding-split-3; }
                .sharding-split .slbl { fill: #A29DB6; font-size: 8px; opacity: 0; animation: sharding-split-lbl 4.4s infinite; font-family: var(--ifm-font-family-monospace, ui-monospace, monospace); }
                @keyframes sharding-split-1 { 0%, 18% { transform: none; } 36%, 72% { transform: translate(-14px, -6px); } 90%, 100% { transform: none; } }
                @keyframes sharding-split-2 { 0%, 18% { transform: none; } 36%, 72% { transform: translate(0, 8px); } 90%, 100% { transform: none; } }
                @keyframes sharding-split-3 { 0%, 18% { transform: none; } 36%, 72% { transform: translate(14px, -4px); } 90%, 100% { transform: none; } }
                @keyframes sharding-split-lbl { 0%, 32% { opacity: 0; } 40%, 70% { opacity: 1; } 78%, 100% { opacity: 0; } }
                @media (prefers-reduced-motion: reduce) {
                    .sharding-split .shard, .sharding-split .slbl { animation: none; }
                    .sharding-split .s1 { transform: translate(-14px, -6px); }
                    .sharding-split .s2 { transform: translate(0, 8px); }
                    .sharding-split .s3 { transform: translate(14px, -4px); }
                    .sharding-split .slbl { opacity: 1; }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"-101.3 -42.7 306 229.3",role:"img","aria-label":"The RxDB logo splits into three vertical shards that drift apart and snap back together.",children:[(0,r.jsxs)("defs",{children:[(0,r.jsx)("clipPath",{id:e+"-1",children:(0,r.jsx)("rect",{x:"-1",y:"-1",width:"35.4",height:"142"})}),(0,r.jsx)("clipPath",{id:e+"-2",children:(0,r.jsx)("rect",{x:"34.4",y:"-1",width:"34.5",height:"142"})}),(0,r.jsx)("clipPath",{id:e+"-3",children:(0,r.jsx)("rect",{x:"68.9",y:"-1",width:"35.5",height:"142"})})]}),(0,r.jsx)("g",{className:"shard s1",clipPath:"url(#"+e+"-1)",children:(0,r.jsx)(o.a0,{})}),(0,r.jsx)("g",{className:"shard s2",clipPath:"url(#"+e+"-2)",children:(0,r.jsx)(o.a0,{})}),(0,r.jsx)("g",{className:"shard s3",clipPath:"url(#"+e+"-3)",children:(0,r.jsx)(o.a0,{})}),(0,r.jsx)("text",{className:"slbl",x:"3",y:"152",textAnchor:"middle",children:"shard 1"}),(0,r.jsx)("text",{className:"slbl",x:"51.66",y:"158",textAnchor:"middle",children:"shard 2"}),(0,r.jsx)("text",{className:"slbl",x:"100",y:"152",textAnchor:"middle",children:"shard 3"})]})]})}},76037(e,t,a){a.d(t,{C2:()=>s,Oe:()=>m,Po:()=>l,a0:()=>n,gm:()=>i,ji:()=>d,lm:()=>o,z3:()=>c});var r=a(74848);a(96540);let i="http://www.w3.org/2000/svg",o=["#ED168F","#B2218B","#752A8A"],s="cubic-bezier(.2, 1.4, .4, 1)",l="cubic-bezier(.16, 1, .3, 1)";function n(){return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)("path",{className:"part outline",pathLength:1,d:"M98.33 10c-2.76 0-5-2.24-5-5s-2.24-5-5-5H75c-2.76 0-5 2.24-5 5v16.67c0 2.76-2.24 5-5 5H5c-2.76 0-5 2.24-5 5V125c0 2.76 2.24 5 5 5s5 2.24 5 5 2.24 5 5 5h13.33c2.76 0 5-2.24 5-5v-16.67c0-2.76 2.24-5 5-5h60c2.76 0 5-2.24 5-5V15c0-2.76-2.24-5-5-5"}),(0,r.jsx)("rect",{className:"part bar b1",x:"6.66",y:"33.34",width:"90",height:"20"}),(0,r.jsx)("rect",{className:"part bar b2",x:"6.67",y:"60",width:"90",height:"20"}),(0,r.jsx)("rect",{className:"part bar b3",x:"6.66",y:"86.66",width:"90",height:"20"}),(0,r.jsx)("path",{className:"part corner",d:"M86.67 6.67v10h10v10h-20v-20z"}),(0,r.jsx)("path",{className:"part foot",d:"M26.67 113.33v20h-10v-10h-10v-10z"})]})}function c(e){return`
        ${e} .outline { fill: #FFFFFF; }
        ${e} .b1, ${e} .corner { fill: #ED168F; }
        ${e} .b2 { fill: #B2218B; }
        ${e} .b3, ${e} .foot { fill: #752A8A; }
    `}function m(){return"u">typeof window&&window.matchMedia("(prefers-reduced-motion: reduce)").matches}function d(e){let t=!1,a=new Set;return{wait:e=>new Promise(t=>{let r=setTimeout(()=>{a.delete(r),t()},e);a.add(r)}),isStopped:()=>t,stop(){t=!0,a.forEach(e=>clearTimeout(e)),a.clear(),e.getAnimations?.({subtree:!0}).forEach(e=>e.cancel())}}}},87749(e,t,a){a.d(t,{N:()=>w});var r=a(74848),i=a(96540),o=a(76037);let s=[[95,70,82],[88,100,76],[80,92,70]];function l(e,t){let a=e*Math.PI/180;return[0+Math.cos(a)*t,125-Math.sin(a)*t]}let n=[];[[14,20,26],[44,50,56],[72,78,84]].forEach((e,t)=>e.forEach((e,a)=>n.push({a:e,l:s[t][a],c:o.lm[t]})));let c=n.map((e,t)=>[Math.abs(e.a-47),t]).sort((e,t)=>e[0]-t[0]).slice(0,3).map(e=>e[1]),m=n[c[0]].a,d=l(47,34),h=l(m,34),p="M"+d[0].toFixed(1)+" "+d[1].toFixed(1)+" A34 34 0 0 "+(m>47?0:1)+" "+h[0].toFixed(1)+" "+h[1].toFixed(1),f=l(30,42),x="cos "+Math.cos((47-m)*Math.PI/180).toFixed(3),u=l(47,108),g="query ["+Math.cos(47*Math.PI/180).toFixed(2)+", "+Math.sin(47*Math.PI/180).toFixed(2)+"]";function y(e){let t=l(e.a,e.l),a=t[0].toFixed(1),i=t[1].toFixed(1);return(0,r.jsxs)("g",{className:"vec"+e.cls,style:{transitionDelay:e.delay+"ms"},children:[(0,r.jsx)("line",{x1:0,y1:125,x2:a,y2:i,stroke:e.color}),(0,r.jsx)("path",{d:"M1 0 L-6 -3.4 L-6 3.4z",fill:e.color,transform:"translate("+a+" "+i+") rotate("+-e.a+")"})]})}let b=["embed","query","found"];function w(){let e=(0,i.useRef)(null);return(0,i.useEffect)(()=>{let t=e.current;if(!t)return;if((0,o.Oe)())return t.classList.add(...b),()=>t.classList.remove(...b);let a=(0,o.ji)(t);return(async()=>{for(;!a.isStopped();)await a.wait(1200),t.classList.add("embed"),await a.wait(1500),t.classList.add("query"),await a.wait(1e3),t.classList.add("found"),await a.wait(2400),t.classList.remove("found","query"),await a.wait(500),t.classList.remove("embed")})(),()=>{a.stop(),t.classList.remove(...b)}},[]),(0,r.jsxs)("div",{className:"vector-database",ref:e,children:[(0,r.jsx)("style",{children:`
                .vector-database { line-height: 0; }
                .vector-database > svg { display: block; width: 100%; height: auto; }
                .vector-database text { font-family: var(--ifm-font-family-monospace, ui-monospace, monospace); }
                .vector-database .part { transform-box: fill-box; transform-origin: center; }
                .vector-database .outline { fill: #FFFFFF; }
                .vector-database .b1, .vector-database .corner { fill: #ED168F; }
                .vector-database .b2 { fill: #B2218B; }
                .vector-database .b3, .vector-database .foot { fill: #752A8A; }
                .vector-database .bar, .vector-database .outline, .vector-database .corner, .vector-database .foot { transition: opacity .35s; }
                .vector-database.embed .bar { opacity: 0; }
                .vector-database.embed .outline, .vector-database.embed .corner, .vector-database.embed .foot { opacity: .12; }
                .vector-database .axes path { stroke: #A29DB6; stroke-width: 1; fill: none; }
                .vector-database .axes text { fill: #A29DB6; font-size: 7px; }
                .vector-database .axes { opacity: 0; transition: opacity .4s; }
                .vector-database.embed .axes { opacity: .8; }
                .vector-database .vec { transform-box: view-box; transform-origin: 0 125px; transform: scale(0); opacity: 0; transition: transform .8s cubic-bezier(.2, 1.4, .4, 1), opacity .3s; }
                .vector-database .vec line { stroke-width: 2; stroke-linecap: round; transition: stroke-width .3s; }
                .vector-database.embed .vec { transform: scale(1); opacity: 1; }
                .vector-database.embed .vec.q { transform: scale(0); opacity: 0; }
                .vector-database.query .vec.q { transform: scale(1); opacity: 1; }
                .vector-database .vec.q line { stroke-dasharray: 4 3; }
                .vector-database.found .vec:not(.nn):not(.q) { opacity: .18; }
                .vector-database.found .vec.nn line { stroke-width: 3.2; }
                .vector-database .arc { fill: none; stroke: #FFFFFF; stroke-width: 1.2; }
                .vector-database .vlbl { fill: #ECE9F2; font-size: 8px; font-weight: 700; }
                .vector-database .qtxt { fill: #ECE9F2; font-size: 7.5px; }
                .vector-database .arc, .vector-database .vlbl, .vector-database .qtxt { opacity: 0; transition: opacity .4s; }
                .vector-database.query .qtxt, .vector-database.found .arc, .vector-database.found .vlbl { opacity: 1; }
                @media (prefers-reduced-motion: reduce) {
                    .vector-database *, .vector-database .vec { transition: none; }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"-77 -42.5 284 213",role:"img","aria-label":"The RxDB logo layers turn into embedding vectors and a query vector finds its three nearest neighbors by cosine similarity.",children:[(0,r.jsx)(o.a0,{}),(0,r.jsxs)("g",{className:"axes",children:[(0,r.jsx)("path",{d:"M0 125 H128 M0 125 V-8"}),(0,r.jsx)("text",{x:"128",y:"136",textAnchor:"end",children:"dim 1"}),(0,r.jsx)("text",{x:"4",y:"-8",children:"dim 2"})]}),(0,r.jsx)("g",{className:"vecs",children:n.map((e,t)=>(0,r.jsx)(y,{a:e.a,l:e.l,cls:c.includes(t)?" nn":"",color:e.c,delay:55*t},t))}),(0,r.jsx)("g",{className:"qwrap",children:(0,r.jsx)(y,{a:47,l:108,cls:" q",color:"#FFFFFF",delay:0})}),(0,r.jsx)("path",{className:"arc",d:p}),(0,r.jsx)("text",{className:"vlbl",x:f[0].toFixed(1),y:f[1].toFixed(1),children:x}),(0,r.jsx)("text",{className:"qtxt",x:(u[0]+4).toFixed(1),y:(u[1]-3).toFixed(1),children:g})]})]})}},50080(e,t,a){a.d(t,{Y:()=>c});var r=a(74848),i=a(96540),o=a(76037);let s=[["bulkWrite","ok",!0],["query","3 docs",!1],["count","42",!1],["bulkWrite","ok",!0],["findDocumentsById","1 doc",!1]],l=Array.from({length:24},(e,t)=>14+12*t);function n(e,t,a,r,i,s,l,n){let c=document.createElementNS(o.gm,"g");c.setAttribute("class","ws-pill");let m=4.3*n.length+8,d=document.createElementNS(o.gm,"rect");d.setAttribute("x",String(t-m/2)),d.setAttribute("y",String(a-5.5)),d.setAttribute("width",String(m)),d.setAttribute("height",String(11)),d.setAttribute("rx","5.5"),d.setAttribute("fill","#0D0F18"),d.setAttribute("stroke",s);let h=document.createElementNS(o.gm,"text");h.setAttribute("x",String(t)),h.setAttribute("y",String(a+2.4)),h.setAttribute("text-anchor","middle"),h.setAttribute("fill",s),h.textContent=n,c.appendChild(d),c.appendChild(h),e.appendChild(c);let p="translate("+(r-t)+"px, "+(i-a)+"px)";return c.animate([{transform:"none",opacity:0},{transform:"none",opacity:1,offset:.08},{transform:p,opacity:1,offset:.92},{transform:p,opacity:0}],{duration:l,easing:"ease-in-out"}).finished.catch(()=>{}).then(()=>c.remove())}function c(){let e=(0,i.useRef)(null),t="worker-storage-strip-"+(0,i.useId)().replace(/[^a-zA-Z0-9_-]/g,"");return(0,i.useEffect)(()=>{let t=e.current;if(!t||(0,o.Oe)()||"function"!=typeof t.animate)return;let a=t.querySelector(".ws-msgs"),r=t.querySelector(".ws-cyl"),i=t.querySelector(".ws-cpu"),l=t.querySelector(".ws-db");if(!a||!r||!i||!l)return;let c=(0,o.ji)(t);return(async()=>{let e=11,t=0;for(;!c.isStopped();){if(await c.wait(500),c.isStopped())return;let[m,d,h]=s[t++%s.length];if(e++,await n(a,92,56,208,56,"#FFFFFF",900,m+" #"+e),c.isStopped()||(r.classList.add("busy"),i.animate([{transform:"scaleX(0)"},{transform:"scaleX(1)",offset:.7},{transform:"scaleX(.15)"}],{duration:700,easing:"ease-out"}),await c.wait(700),c.isStopped()))return;r.classList.remove("busy");let p=n(a,208,92,92,92,"#ED168F",900,"#"+e+" "+d);if(h){if(await c.wait(260),c.isStopped())return;n(a,208,92,92,92,"#B2218B",900,"changeStream")}if(await p,c.isStopped())return;["b1","b2","b3"].forEach((e,t)=>{l.querySelector("."+e)?.animate([{transform:"none"},{transform:"translateX(4px)"},{transform:"none"}],{duration:380,delay:70*t,easing:o.Po})})}})(),()=>{c.stop(),a.innerHTML="",r.classList.remove("busy")}},[]),(0,r.jsxs)("div",{className:"worker-storage",children:[(0,r.jsx)("style",{children:`
                .worker-storage { line-height: 0; }
                .worker-storage > svg { display: block; width: 100%; height: auto; }
                .worker-storage .part { transform-box: fill-box; transform-origin: center; }
                ${(0,o.z3)(".worker-storage .ws-db")}
                .worker-storage text { font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
                .worker-storage .ws-lane { fill: none; stroke: #A29DB6; stroke-width: 1; stroke-dasharray: 4 3; }
                .worker-storage .ws-label { fill: #A29DB6; font-size: 8px; letter-spacing: .06em; }
                .worker-storage .ws-sub { fill: #A29DB6; font-size: 7px; }
                .worker-storage .ws-chan { stroke: #262B40; stroke-width: 1; stroke-dasharray: 2 3; }
                .worker-storage .ws-strip { fill: #0D0F18; stroke: #262B40; }
                .worker-storage .ws-tick { fill: #B2218B; }
                .worker-storage .ws-ticks { animation: worker-storage-ticks .25s linear infinite; }
                .worker-storage .ws-cyl { fill: #20243A; stroke: #A29DB6; stroke-width: 1.2; transition: stroke .2s; }
                .worker-storage .ws-cyl-line { fill: none; stroke: #A29DB6; stroke-width: 1; opacity: .6; }
                .worker-storage .ws-cyl.busy { stroke: #ED168F; }
                .worker-storage .ws-cpu-bg { fill: #0D0F18; stroke: #262B40; }
                .worker-storage .ws-cpu { fill: #ED168F; transform-box: fill-box; transform-origin: 0 50%; transform: scaleX(0); }
                .worker-storage .ws-pill rect { stroke-width: 1; }
                .worker-storage .ws-pill text { font-size: 7px; }
                @keyframes worker-storage-ticks { from { transform: none; } to { transform: translateX(-12px); } }
                @media (prefers-reduced-motion: reduce) {
                    .worker-storage .ws-ticks { animation: none; }
                    .worker-storage .ws-cyl { transition: none; }
                }
            `}),(0,r.jsxs)("svg",{ref:e,viewBox:"0 0 300 160",role:"img","aria-label":"RxDB on the main thread sends storage calls as messages to a worker, where the wrapped IndexedDB storage runs them and answers, while the main thread keeps rendering UI frames.",children:[(0,r.jsx)("defs",{children:(0,r.jsx)("clipPath",{id:t,children:(0,r.jsx)("rect",{x:"14",y:"132",width:"98",height:"10",rx:"2"})})}),(0,r.jsx)("rect",{className:"ws-lane",x:"6",y:"6",width:"114",height:"148",rx:"6"}),(0,r.jsx)("rect",{className:"ws-lane",x:"180",y:"6",width:"114",height:"148",rx:"6"}),(0,r.jsx)("text",{className:"ws-label",x:"14",y:"20",children:"main thread"}),(0,r.jsx)("text",{className:"ws-label",x:"188",y:"20",children:"worker"}),(0,r.jsx)("svg",{className:"ws-db",x:"35",y:"30",width:"56",height:"75.9",viewBox:"0 0 103.33 140",overflow:"visible",children:(0,r.jsx)(o.a0,{})}),(0,r.jsx)("text",{className:"ws-sub",x:"63",y:"118",textAnchor:"middle",children:"RxDatabase"}),(0,r.jsx)("rect",{className:"ws-strip",x:"14",y:"132",width:"98",height:"10",rx:"2"}),(0,r.jsx)("g",{clipPath:"url(#"+t+")",children:(0,r.jsx)("g",{className:"ws-ticks",children:l.map(e=>(0,r.jsx)("rect",{className:"ws-tick",x:e,y:"134",width:"6",height:"6",rx:"1"},e))})}),(0,r.jsx)("text",{className:"ws-sub",x:"14",y:"128",children:"UI frames"}),(0,r.jsx)("line",{className:"ws-chan",x1:"120",y1:"56",x2:"180",y2:"56"}),(0,r.jsx)("line",{className:"ws-chan",x1:"120",y1:"92",x2:"180",y2:"92"}),(0,r.jsx)("text",{className:"ws-sub",x:"150",y:"76",textAnchor:"middle",children:"postMessage"}),(0,r.jsx)("path",{className:"ws-cyl",d:"M215 46v40a22 6 0 0 0 44 0V46a22 6 0 0 0-44 0a22 6 0 0 0 44 0"}),(0,r.jsx)("path",{className:"ws-cyl-line",d:"M215 59a22 6 0 0 0 44 0M215 72a22 6 0 0 0 44 0"}),(0,r.jsx)("text",{className:"ws-sub",x:"237",y:"108",textAnchor:"middle",children:"IndexedDB"}),(0,r.jsx)("rect",{className:"ws-cpu-bg",x:"188",y:"132",width:"98",height:"10",rx:"2"}),(0,r.jsx)("rect",{className:"ws-cpu",x:"189",y:"133",width:"96",height:"8",rx:"1.5"}),(0,r.jsx)("text",{className:"ws-sub",x:"188",y:"128",children:"CPU"}),(0,r.jsx)("g",{className:"ws-msgs"})]})]})}},82345(e,t,a){a.r(t),a.d(t,{default:()=>J});var r=a(74848),i=a(53572),o=a(45434),s=a(96540),l=a(62544),n=a(10188),c=a(47591),m=a(31184),d=a(34426),h=a(76037);let p=[[255,255,255],[237,22,143],[178,33,139],[117,42,138]],f=[["M98.33 10c-2.76 0-5-2.24-5-5s-2.24-5-5-5H75c-2.76 0-5 2.24-5 5v16.67c0 2.76-2.24 5-5 5H5c-2.76 0-5 2.24-5 5V125c0 2.76 2.24 5 5 5s5 2.24 5 5 2.24 5 5 5h13.33c2.76 0 5-2.24 5-5v-16.67c0-2.76 2.24-5 5-5h60c2.76 0 5-2.24 5-5V15c0-2.76-2.24-5-5-5","#FFFFFF"],["M6.67 60h90v20h-90z","#B2218B"],["M96.66 53.34h-90v-20h90z","#ED168F"],["M96.66 106.66h-90v-20h90zM26.67 113.33v20h-10v-10h-10v-10z","#752A8A"],["M86.67 6.67v10h10v10h-20v-20z","#ED168F"]],x=[[0,0],[-1,-1],[1,-1],[-1,1],[1,1]];var u=a(48121),g=a(47970),y=a(89729);let b=["Browsers","Node.js","Electron","React Native","Capacitor","Deno","Bun"];var w=a(66814),v=a(39412),k=a(80920),j=a(44793),F=a(97976),N=a(68843),A=a(34066),B=a(9537),D=a(99832);let M=["b1","b2","b3","corner","foot"],q=[["find({ color: 'pink' })",["b1","corner"],1],["find({ color: 'purple' })",["b3","foot"],1],["find({ color: { $ne: 'magenta' } })",["b1","corner","b3","foot"],2],["find({ color: 'magenta' })",["b2"],1],["find({})",M,3]];var S=a(90304),E=a(36929),R=a(54726),z=a(43915),C=a(19605);let L=[["IndexedDB","browser"],["OPFS","browser, fastest"],["SQLite","React Native, Capacitor"],["Memory","tests, caches"],["localStorage","small apps"],["Filesystem Node","Node.js"]];var X=a(87749);let T=["M143.33 106.67V33.33h29.31c4.98 0 9.57.79 13.78 2.36s7.59 4.06 10.15 7.47c2.56 3.4 3.84 7.85 3.84 13.34 0 5.86-1.46 10.48-4.39 13.89-2.93 3.4-6.62 5.84-11.09 7.3l18.88 28.98h-19.87l-16.69-26.9h-6.92v26.9h-17.02Zm17.02-41.61h12.19c1.98 0 3.71-.29 5.21-.88 1.5-.58 2.69-1.5 3.57-2.74s1.32-2.89 1.32-4.94-.44-3.68-1.32-4.89-2.07-2.1-3.57-2.69c-1.5-.58-3.24-.88-5.21-.88h-12.19z","M206.02 106.67l20.64-28.54-18.88-25.91h19.76l8.78 12.19h.44l8.56-12.19h19.54l-18.77 25.91 20.53 28.54h-19.65l-10.43-14.82h-.44l-10.43 14.82z","M271.22 106.67V33.33h21.52c5.2 0 10.04.6 14.55 1.81 4.5 1.21 8.45 3.22 11.86 6.04 3.4 2.82 6.06 6.59 7.96 11.31s2.85 10.56 2.85 17.51-.95 12.88-2.85 17.56-4.56 8.44-7.96 11.25c-3.4 2.82-7.36 4.83-11.86 6.04s-9.35 1.81-14.55 1.81h-21.52Zm17.02-15.15h4.06c2.63 0 5.16-.26 7.57-.77 2.42-.51 4.56-1.5 6.42-2.96 1.87-1.46 3.35-3.62 4.45-6.48q1.65-4.275 1.65-11.31c0-7.035-.55-8.47-1.65-11.36s-2.58-5.09-4.45-6.59-4.01-2.51-6.42-3.02c-2.42-.51-4.94-.77-7.57-.77h-4.06v43.25Z","M335.56 106.67V33.33h29.75c5.49 0 10.15.68 14 2.03 3.84 1.36 6.79 3.42 8.84 6.2s3.07 6.37 3.07 10.76c0 2.42-.37 4.59-1.1 6.53q-1.095 2.91-3.18 5.1c-1.39 1.46-3.07 2.71-5.05 3.73 1.98.66 3.9 1.7 5.76 3.13 1.87 1.43 3.38 3.29 4.56 5.6 1.17 2.31 1.76 5.14 1.76 8.51q0 7.8-3.51 12.57c-2.34 3.18-5.6 5.51-9.77 6.97s-8.97 2.2-14.38 2.2h-30.74Zm17.01-44.9h12.95q3.84 0 6.15-1.92t2.31-5.1c0-3.18-.73-3.77-2.2-4.94-1.46-1.17-3.48-1.76-6.04-1.76h-13.17zm0 30.19h13.83c2.12 0 3.93-.29 5.43-.88 1.5-.58 2.63-1.48 3.4-2.69s1.15-2.65 1.15-4.34c0-2.49-.86-4.37-2.58-5.65q-2.58-1.92-7.41-1.92h-13.83v15.48Z"];var P=a(50080);let H=[{title:"Logo and Wordmark",animations:[{title:"Hero",name:"HeroMark",file:"hero-mark",component:function(){let e=(0,s.useRef)(null);return(0,s.useEffect)(()=>{let t=e.current;if(!t)return;let a=(0,h.ji)(t),r=Array.from(t.querySelectorAll(".hm-rail")),i=Array.from(t.querySelectorAll(".hm-rail-text")),o=t.querySelector(".hm-rt"),s=()=>{i.forEach((e,t)=>{let a=110+e.getComputedTextLength()+12;r[t].setAttribute("width",(a-Number(r[t].getAttribute("x"))).toFixed(2))})};if(s(),document.fonts?.ready.then(()=>{a.isStopped()||s()}).catch(()=>{}),(0,h.Oe)()||"function"!=typeof t.animate)return()=>a.stop();let l=e=>{o.firstChild?o.firstChild.nodeValue=e:o.textContent=e};return(async()=>{let e=0;for(;!a.isStopped();){if(await a.wait(1500),a.isStopped()||(await o.animate([{opacity:1},{opacity:0}],{duration:180,fill:"forwards"}).finished.catch(()=>{}),a.isStopped()))return;e=(e+1)%b.length,l(b[e]),o.getAnimations().forEach(e=>e.cancel()),o.animate([{opacity:0},{opacity:1}],{duration:220})}})(),(async()=>{let e=[...r,...i];for(;!a.isStopped();){let t;e.forEach(e=>e.getAnimations().forEach(e=>e.cancel()));let o=300;r.forEach((e,t)=>{e.animate([{transform:"scaleX(0)"},{transform:"scaleX(1)"}],{duration:700,delay:o,easing:h.C2,fill:"both"}),i[t].animate([{opacity:0,transform:"translateX(-8px)"},{opacity:1,transform:"none"}],{duration:380,delay:o+260,easing:h.Po,fill:"both"}),o+=850}),o+=3200;for(let e=r.length-1;e>=0;e--)i[e].animate([{opacity:1},{opacity:0}],{duration:200,delay:o,fill:"forwards"}),t=r[e].animate([{transform:"scaleX(1)"},{transform:"scaleX(0)"}],{duration:420,delay:o+120,easing:"cubic-bezier(.7,0,.84,0)",fill:"forwards"}),o+=140;if(await t?.finished.catch(()=>{}),a.isStopped())return;await a.wait(500)}})(),()=>a.stop()},[]),(0,r.jsxs)("div",{className:"hero-mark",children:[(0,r.jsx)("style",{children:`
                .hero-mark { line-height: 0; padding: 4% 4%; }
                .hero-mark > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .hero-mark .part { transform-box: fill-box; transform-origin: center; }
                ${(0,h.z3)(".hero-mark")}
                .hero-mark text { font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .hero-mark .hm-rail { transform-box: fill-box; transform-origin: left center; }
                .hero-mark .hm-rail.b1 { fill: #ED168F; }
                .hero-mark .hm-rail.b2 { fill: #B2218B; }
                .hero-mark .hm-rail.b3 { fill: #752A8A; }
                .hero-mark .hm-rail-text { fill: #FFFFFF; font-size: 11px; font-weight: 700; }
                .hero-mark .hm-runtime { fill: #A29DB6; font-size: 10px; }
                .hero-mark .hm-rt { fill: #ECE9F2; font-weight: 700; }
            `}),(0,r.jsx)("svg",{ref:e,viewBox:"0 0 360 150",role:"img","aria-label":"Animated RxDB logo whose three layers extend into the features: works offline, syncs with any backend, observable realtime queries. Below it the supported JavaScript runtimes cycle.",children:(0,r.jsxs)("g",{transform:"translate(4 5)",children:[(0,r.jsx)(h.a0,{}),(0,r.jsx)("rect",{className:"hm-rail b1",x:"95.66",y:"33.34",height:"20",width:"120"}),(0,r.jsx)("rect",{className:"hm-rail b2",x:"95.67",y:"60",height:"20",width:"180"}),(0,r.jsx)("rect",{className:"hm-rail b3",x:"95.66",y:"86.66",height:"20",width:"220"}),(0,r.jsx)("text",{className:"hm-rail-text",x:110,y:"47.3",children:"works offline"}),(0,r.jsx)("text",{className:"hm-rail-text",x:110,y:"74",children:"syncs with any backend"}),(0,r.jsx)("text",{className:"hm-rail-text",x:110,y:"100.7",children:"observable realtime queries"}),(0,r.jsxs)("text",{className:"hm-runtime",x:"40",y:"127.5",children:["runs in ",(0,r.jsx)("tspan",{className:"hm-rt",children:b[0]})]})]})})]})},description:"The three layers extend into the feature list and the runtime name cycles below."},{title:"Wordmark Reveal",name:"WordmarkReveal",file:"wordmark-reveal",component:function(){let e=(0,s.useRef)(null);return(0,s.useEffect)(()=>{let t=e.current;if(!t||(0,h.Oe)()||"function"!=typeof t.animate)return;let a=(0,h.ji)(t),r=t.querySelector(".wr-root"),i=t.querySelector(".wr-icon"),o=i.querySelector(".outline"),s=Array.from(i.querySelectorAll(".bar")),l=Array.from(i.querySelectorAll(".corner, .foot")),n=Array.from(r.querySelectorAll(".wr-letter")),c=r.querySelector(".wr-uline"),m=r.querySelector(".wr-tagline");return(async()=>{for(;!a.isStopped();){r.getAnimations({subtree:!0}).forEach(e=>e.cancel()),o.animate([{transform:"scale(0)"},{transform:"none"}],{duration:520,easing:h.C2,fill:"both"}),s.forEach((e,t)=>{e.animate([{transform:"translateX(-140%)",opacity:0},{transform:"none",opacity:1}],{duration:650,delay:280+120*t,easing:h.C2,fill:"both"})}),l.forEach((e,t)=>{e.animate([{transform:"scale(0) rotate(-180deg)"},{transform:"none"}],{duration:520,delay:640+110*t,easing:h.C2,fill:"both"})}),n.forEach((e,t)=>{e.animate([{strokeDashoffset:1,fillOpacity:0},{strokeDashoffset:0,fillOpacity:0,offset:.7},{strokeDashoffset:0,fillOpacity:1}],{duration:900,delay:950+190*t,easing:"ease-in-out",fill:"both"})}),n[1].animate([{fill:"#FFFFFF"},{fill:"#ED168F",offset:.4},{fill:"#FFFFFF"}],{duration:900,delay:2300}),c.animate([{transform:"scaleX(0)"},{transform:"none"}],{duration:600,delay:2700,easing:h.Po,fill:"both"}),m.animate([{opacity:0,transform:"translateY(6px)"},{opacity:1,transform:"none"}],{duration:500,delay:3e3,easing:h.Po,fill:"both"});let e=r.animate([{opacity:1},{opacity:0}],{duration:450,delay:5700,fill:"forwards"});if(await e.finished.catch(()=>{}),a.isStopped())return;await a.wait(300)}})(),()=>a.stop()},[]),(0,r.jsxs)("div",{className:"wordmark-reveal",children:[(0,r.jsx)("style",{children:`
                .wordmark-reveal { line-height: 0; padding: 5% 4%; }
                .wordmark-reveal > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .wordmark-reveal .part { transform-box: fill-box; transform-origin: center; }
                ${(0,h.z3)(".wordmark-reveal")}
                .wordmark-reveal .wr-letter { fill: #FFFFFF; stroke: #FFFFFF; stroke-width: 1.2; stroke-dasharray: 1; stroke-dashoffset: 0; transform-box: fill-box; transform-origin: center; }
                .wordmark-reveal .wr-uline { fill: #ED168F; transform-box: fill-box; transform-origin: left center; }
                .wordmark-reveal .wr-tagline { fill: #A29DB6; font-size: 13px; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
            `}),(0,r.jsx)("svg",{ref:e,viewBox:"0 0 400 172",role:"img","aria-label":"Animated RxDB wordmark: the icon builds, the letters R x D B draw in, and the tagline appears",children:(0,r.jsxs)("g",{className:"wr-root",children:[(0,r.jsx)("g",{className:"wr-icon",children:(0,r.jsx)(h.a0,{})}),T.map((e,t)=>(0,r.jsx)("path",{className:"wr-letter",pathLength:1,d:e},t)),(0,r.jsx)("rect",{className:"wr-uline",x:"143.33",y:"118",width:"248.5",height:"4"}),(0,r.jsx)("text",{className:"wr-tagline",x:"143.33",y:"150",textLength:"248.5",lengthAdjust:"spacingAndGlyphs",children:"The local-first database for JavaScript"})]})})]})},description:"The letters of the wordmark build up next to the logo, followed by the claim."},{title:"Typewriter",name:"WordmarkTypewriter",file:"wordmark-typewriter",component:function(){return(0,r.jsxs)("div",{className:"wordmark-typewriter",children:[(0,r.jsx)("style",{children:`
                .wordmark-typewriter { line-height: 0; padding: 6% 6%; }
                .wordmark-typewriter > svg { display: block; width: 100%; height: auto; overflow: visible; }
                ${(0,h.z3)(".wordmark-typewriter")}
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
            `}),(0,r.jsxs)("svg",{viewBox:"0 0 404 140",role:"img","aria-label":"RxDB wordmark typed letter by letter with a blinking cursor",children:[(0,r.jsx)(h.a0,{}),T.map((e,t)=>(0,r.jsx)("path",{className:"wt-letter wt-l"+(t+1),d:e},t)),(0,r.jsx)("g",{className:"wt-cursor",children:(0,r.jsx)("rect",{x:"145",y:"33.33",width:"7",height:"73.34"})})]})]})},description:"The wordmark is typed and deleted letter by letter."},{title:"Reactive x",name:"WordmarkReactiveX",file:"wordmark-reactive-x",component:function(){return(0,r.jsxs)("div",{className:"wordmark-reactive-x",children:[(0,r.jsx)("style",{children:`
                .wordmark-reactive-x { line-height: 0; padding: 4% 6%; }
                .wordmark-reactive-x > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .wordmark-reactive-x .part { transform-box: fill-box; transform-origin: center; }
                ${(0,h.z3)(".wordmark-reactive-x")}
                .wordmark-reactive-x .b1 { --wrx-c: #ED168F; animation: wordmark-reactive-x-flash 3s .55s infinite; }
                .wordmark-reactive-x .b2 { --wrx-c: #B2218B; animation: wordmark-reactive-x-flash 3s .65s infinite; }
                .wordmark-reactive-x .b3 { --wrx-c: #752A8A; animation: wordmark-reactive-x-flash 3s .75s infinite; }
                .wordmark-reactive-x .wrx-letter { fill: #FFFFFF; transform-box: fill-box; transform-origin: center; animation: wordmark-reactive-x-wave 3s ${h.C2} infinite; }
                .wordmark-reactive-x .wrx-l2 { animation-name: wordmark-reactive-x-wave, wordmark-reactive-x-fill; animation-delay: .1s; }
                .wordmark-reactive-x .wrx-l3 { animation-delay: .2s; }
                .wordmark-reactive-x .wrx-l4 { animation-delay: .3s; }
                @keyframes wordmark-reactive-x-wave { 0%, 30%, 100% { transform: none; } 10% { transform: translateY(-10px); } 20% { transform: translateY(2px); } }
                @keyframes wordmark-reactive-x-fill { 0%, 42% { fill: #FFFFFF; } 50% { fill: #ED168F; } 70%, 100% { fill: #FFFFFF; } }
                @keyframes wordmark-reactive-x-flash { 0% { fill: #FFFFFF; } 40%, 100% { fill: var(--wrx-c); } }
                @media (prefers-reduced-motion: reduce) {
                    .wordmark-reactive-x .bar, .wordmark-reactive-x .wrx-letter { animation: none; }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"0 -14 394 160",role:"img","aria-label":"RxDB wordmark letters bouncing in a wave while the x flashes pink",children:[(0,r.jsx)(h.a0,{}),T.map((e,t)=>(0,r.jsx)("path",{className:"wrx-letter wrx-l"+(t+1),d:e},t))]})]})},description:"A wave runs through the letters of the wordmark and into the layers of the icon."},{title:"Color Sweep",name:"WordmarkColorSweep",file:"wordmark-color-sweep",component:function(){let e=(0,s.useRef)(null),t="wordmark-color-sweep-"+(0,s.useId)().replace(/[^a-zA-Z0-9_-]/g,"");return(0,s.useEffect)(()=>{let t=e.current;t&&(0,h.Oe)()&&t.pauseAnimations?.()},[]),(0,r.jsxs)("div",{className:"wordmark-color-sweep",children:[(0,r.jsx)("style",{children:`
                .wordmark-color-sweep { line-height: 0; padding: 6% 6%; }
                .wordmark-color-sweep > svg { display: block; width: 100%; height: auto; overflow: visible; }
                ${(0,h.z3)(".wordmark-color-sweep")}
            `}),(0,r.jsxs)("svg",{ref:e,viewBox:"0 0 394 140",role:"img","aria-label":"RxDB wordmark with a brand color gradient sweeping through the letters",children:[(0,r.jsx)("defs",{children:(0,r.jsxs)("linearGradient",{id:t,gradientUnits:"userSpaceOnUse",x1:"0",y1:"0",x2:"400",y2:"0",spreadMethod:"repeat",children:[(0,r.jsx)("stop",{offset:"0",stopColor:"#FFFFFF"}),(0,r.jsx)("stop",{offset:".35",stopColor:"#FFFFFF"}),(0,r.jsx)("stop",{offset:".5",stopColor:"#ED168F"}),(0,r.jsx)("stop",{offset:".6",stopColor:"#B2218B"}),(0,r.jsx)("stop",{offset:".7",stopColor:"#752A8A"}),(0,r.jsx)("stop",{offset:".85",stopColor:"#FFFFFF"}),(0,r.jsx)("stop",{offset:"1",stopColor:"#FFFFFF"}),(0,r.jsx)("animateTransform",{attributeName:"gradientTransform",type:"translate",from:"-400 0",to:"400 0",dur:"3.2s",repeatCount:"indefinite"})]})}),(0,r.jsx)(h.a0,{}),T.map((e,a)=>(0,r.jsx)("path",{fill:"url(#"+t+")",d:e},a))]})]})},description:"The three layer colors sweep through the letters of the wordmark."},{title:"Glitch",name:"GlitchLogo",file:"glitch-logo",component:y.L,description:"An RGB split glitch that plays every few seconds."},{title:"Document Swarm",name:"DocumentSwarm",file:"document-swarm",component:function(){let e=(0,s.useRef)(null);return(0,s.useEffect)(()=>{let t=e.current;if(!t)return;let a=t.querySelector("canvas"),r=t.querySelector(".dsw-count"),i=a?a.getContext("2d"):null;if(!a||!i)return;let o=(0,h.Oe)(),s=(0,h.ji)(t),l=[],n=0,c=0,m=4,d={x:-1e4,y:-1e4},u="u"<typeof IntersectionObserver,g=!1,y=!1,b=!1,w=0,v=()=>{for(let e of(i.clearRect(0,0,n,c),l))i.fillStyle=e.c,i.fillRect(e.x,e.y,m,m)},k=()=>{let e=t.getBoundingClientRect();if(!e.width||!e.height)return;let o=Math.min(2,window.devicePixelRatio||1);n=e.width,c=e.height,a.width=Math.round(n*o),a.height=Math.round(c*o),i.setTransform(o,0,0,o,0,0);let s=.8*c/140,d=(n-103.33*s)/2,h=(c-140*s)/2,u=document.createElement("canvas");u.width=Math.ceil(n),u.height=Math.ceil(c);let g=u.getContext("2d");if(!g)return;g.setTransform(s,0,0,s,d,h),f.forEach(([e,t])=>{g.fillStyle=t,g.fill(new Path2D(e))});let y=g.getImageData(0,0,u.width,u.height).data,b=Math.max(5,3.2*s);m=b+.5;let w=l,k=[];for(let e=h;e<h+140*s;e+=b)for(let t=d;t<d+103.33*s;t+=b){let a=Math.round(t+b/2),r=Math.round(e+b/2);if(a>=u.width||r>=u.height||y[(r*u.width+a)*4+3]<200)continue;let i=b/4,o={},s="#FFFFFF",l=0;x.forEach(([e,t])=>{let n=Math.round(a+e*i),c=Math.round(r+t*i);if(n<0||c<0||n>=u.width||c>=u.height)return;let m=(c*u.width+n)*4;if(y[m+3]<200)return;let d=function(e,t,a){let r=0,i=1/0;return p.forEach((o,s)=>{let l=(o[0]-e)*(o[0]-e)+(o[1]-t)*(o[1]-t)+(o[2]-a)*(o[2]-a);l<i&&(i=l,r=s)}),"rgb("+p[r].join(",")+")"}(y[m],y[m+1],y[m+2]);o[d]=(o[d]||0)+1,o[d]>l&&(l=o[d],s=d)});let n=w[k.length];k.push({tx:t,ty:e,x:n?n.x:t,y:n?n.y:e,vx:0,vy:0,c:s})}l=k,r&&(r.textContent=l.length.toLocaleString("en-US")+" documents"),v()},j=()=>{if(b||!u||o){g=!1;return}for(let e of l){e.vx+=(e.tx-e.x)*.06,e.vy+=(e.ty-e.y)*.06;let t=e.x-d.x,a=e.y-d.y,r=t*t+a*a;if(r<4900&&r>.01){let i=Math.sqrt(r),o=(1-i/70)*7;e.vx+=t/i*o,e.vy+=a/i*o}e.vx*=.82,e.vy*=.82,e.x+=e.vx,e.y+=e.vy}v(),w=requestAnimationFrame(j)},F=()=>{b||g||!u||o||(g=!0,w=requestAnimationFrame(j))},N=e=>{l.forEach(t=>{let a=Math.random()*Math.PI*2,r=(.4+Math.random())*e;t.vx+=Math.cos(a)*r,t.vy+=Math.sin(a)*r}),F()},A=e=>{let a=t.getBoundingClientRect();d.x=e.clientX-a.left,d.y=e.clientY-a.top},B=()=>{d.x=-1e4,d.y=-1e4},D=()=>N(26);k();let M="u">typeof ResizeObserver?new ResizeObserver(k):null;if(M?.observe(t),o)return()=>{b=!0,M?.disconnect()};t.addEventListener("pointermove",A),t.addEventListener("pointerleave",B),t.addEventListener("click",D);let q=()=>{y||(y=!0,l.forEach(e=>{e.x=Math.random()*n,e.y=Math.random()*c}))},S=null;return"u">typeof IntersectionObserver?(S=new IntersectionObserver(e=>{(u=e[0].isIntersecting)&&q(),F()},{threshold:.2})).observe(t):(q(),F()),(async()=>{for(;!s.isStopped();)await s.wait(6e3),!s.isStopped()&&u&&N(26)})(),()=>{b=!0,s.stop(),cancelAnimationFrame(w),M?.disconnect(),S?.disconnect(),t.removeEventListener("pointermove",A),t.removeEventListener("pointerleave",B),t.removeEventListener("click",D)}},[]),(0,r.jsxs)("div",{className:"document-swarm",children:[(0,r.jsx)("style",{children:`
                .document-swarm { container-type: inline-size; line-height: 0; }
                .document-swarm > .dsw-stage { position: relative; width: 100%; aspect-ratio: 21 / 9; cursor: crosshair; touch-action: pan-y; }
                .document-swarm canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
                .document-swarm .dsw-count { position: absolute; left: 12px; bottom: 10px; font-size: 11px; line-height: 1.4; letter-spacing: .04em; color: #A29DB6; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; pointer-events: none; }
                @container (max-width: 700px) {
                    .document-swarm > .dsw-stage { aspect-ratio: 4 / 3; }
                }
            `}),(0,r.jsxs)("div",{className:"dsw-stage",ref:e,role:"img","aria-label":"The RxDB logo made of small squares, one per document. The squares scatter and then spring back into the logo, and they move away from the pointer.",children:[(0,r.jsx)("canvas",{"aria-hidden":"true"}),(0,r.jsx)("span",{className:"dsw-count",children:"documents"})]})]})},description:"The logo built from small documents that scatter on pointer movement and spring back."}]},{title:"Motion That Explains the Database",animations:[{title:"Build-in",name:"LogoBuildIn",file:"logo-build-in",component:function(){let e=(0,s.useRef)(null);return(0,s.useEffect)(()=>{let t=e.current;if(!t||(0,h.Oe)())return;let a=(0,h.ji)(t);return(async()=>{for(;!a.isStopped();)t.classList.remove("play"),t.getBoundingClientRect(),t.classList.add("play"),await a.wait(4500)})(),()=>{a.stop(),t.classList.remove("play")}},[]),(0,r.jsxs)("div",{className:"logo-build-in",ref:e,children:[(0,r.jsx)("style",{children:`
                .logo-build-in { line-height: 0; }
                .logo-build-in > svg { display: block; width: 100%; height: auto; }
                .logo-build-in .lbi-logo { overflow: visible; }
                .logo-build-in .part, .logo-build-in .lbi-settle { transform-box: fill-box; transform-origin: center; }
                ${(0,h.z3)(".logo-build-in")}
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
            `}),(0,r.jsxs)("svg",{viewBox:"0 0 300 225",role:"img","aria-label":"The RxDB logo draws its outline, then its three layers slide in and the corner and foot pop into place.",children:[(0,r.jsx)("g",{className:"lbi-settle",children:(0,r.jsx)("svg",{className:"lbi-logo",x:"95.2",y:"38.25",width:"109.6",height:"148.5",viewBox:"0 0 103.33 140",children:(0,r.jsx)(h.a0,{})})}),(0,r.jsx)("text",{className:"lbi-tag",x:"10.5",y:"215",children:"intro"})]})]})},description:"The outline is drawn, then the layers slide in like documents written to storage."},{title:"Reactive Stream",name:"ReactiveStream",file:"reactive-stream",component:A.O,description:"Query results stream to the UI on every write."},{title:"Replication",name:"ReplicationPushPull",file:"replication-push-pull",component:B.W,description:"An RxDB client pushes and pulls documents with any server."},{title:"Offline-First",name:"OfflineQueue",file:"offline-queue",component:function(){return(0,r.jsxs)("div",{className:"offline-queue",children:[(0,r.jsx)("style",{children:`
                .offline-queue { line-height: 0; }
                .offline-queue > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .offline-queue .part { transform-box: fill-box; transform-origin: center; }
                ${(0,h.z3)(".offline-queue")}
                .offline-queue .b1 { animation: offline-queue-write 6s infinite; }
                .offline-queue .q { opacity: 0; transform-box: fill-box; transform-origin: center; }
                .offline-queue .q1 { fill: #ED168F; animation: offline-queue-q1 6s cubic-bezier(.16, 1, .3, 1) infinite; }
                .offline-queue .q2 { fill: #B2218B; animation: offline-queue-q2 6s cubic-bezier(.16, 1, .3, 1) infinite; }
                .offline-queue .q3 { fill: #752A8A; animation: offline-queue-q3 6s cubic-bezier(.16, 1, .3, 1) infinite; }
                .offline-queue .wire { stroke: #A29DB6; stroke-width: 1.2; stroke-dasharray: 2 3; fill: none; animation: offline-queue-wire 6s infinite; }
                .offline-queue .pill rect { fill: #0D0F18; stroke: #262B40; stroke-width: 1; }
                .offline-queue .pill text { fill: #ECE9F2; font-size: 11px; letter-spacing: .04em; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .offline-queue .pill-on circle { fill: #3DD68C; }
                .offline-queue .pill-off circle { fill: #A29DB6; }
                .offline-queue .pill-on { animation: offline-queue-st-on 6s infinite; }
                .offline-queue .pill-off { opacity: 0; animation: offline-queue-st-off 6s infinite; }
                @keyframes offline-queue-st-on { 0%, 46% { opacity: 1; } 49%, 95% { opacity: 0; } 98%, 100% { opacity: 1; } }
                @keyframes offline-queue-st-off { 0%, 46% { opacity: 0; } 49%, 95% { opacity: 1; } 98%, 100% { opacity: 0; } }
                @keyframes offline-queue-wire { 0%, 46% { opacity: .7; } 49%, 95% { opacity: .12; } 98%, 100% { opacity: .7; } }
                @keyframes offline-queue-write {
                    0%, 57%, 62%, 67%, 72%, 77%, 82%, 100% { fill: #ED168F; }
                    58%, 68%, 78% { fill: #FFFFFF; }
                }
                @keyframes offline-queue-q1 { 0%, 58% { opacity: 0; transform: scale(0); } 62%, 94% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(-80px); } }
                @keyframes offline-queue-q2 { 0%, 68% { opacity: 0; transform: scale(0); } 72%, 95% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(-80px); } }
                @keyframes offline-queue-q3 { 0%, 78% { opacity: 0; transform: scale(0); } 82%, 96% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(-80px); } }
                @media (prefers-reduced-motion: reduce) {
                    .offline-queue .b1, .offline-queue .q, .offline-queue .wire, .offline-queue .pill-on, .offline-queue .pill-off { animation: none; }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"-120 -80 370 278",role:"img","aria-label":"The RxDB logo keeps writing locally while the connection is offline and queues three changes, then flushes the queue upstream when it is back online.",children:[(0,r.jsxs)("g",{className:"pill pill-on","aria-hidden":"true",children:[(0,r.jsx)("rect",{x:"-108",y:"-68",width:"212",height:"24",rx:"12"}),(0,r.jsx)("circle",{cx:"-95.5",cy:"-56",r:"3.5"}),(0,r.jsx)("text",{x:"-85",y:"-56",dominantBaseline:"central",children:"online \xb7 synced"})]}),(0,r.jsxs)("g",{className:"pill pill-off","aria-hidden":"true",children:[(0,r.jsx)("rect",{x:"-108",y:"-68",width:"212",height:"24",rx:"12"}),(0,r.jsx)("circle",{cx:"-95.5",cy:"-56",r:"3.5"}),(0,r.jsx)("text",{x:"-85",y:"-56",dominantBaseline:"central",children:"offline \xb7 writing locally"})]}),(0,r.jsx)(h.a0,{}),(0,r.jsx)("path",{className:"wire",d:"M119 -24 V 60"}),(0,r.jsx)("rect",{className:"q q1",x:"112",y:"96",width:"14",height:"8",rx:"2"}),(0,r.jsx)("rect",{className:"q q2",x:"112",y:"84",width:"14",height:"8",rx:"2"}),(0,r.jsx)("rect",{className:"q q3",x:"112",y:"72",width:"14",height:"8",rx:"2"})]})]})},description:"Writes are queued while offline and flushed when the connection returns."},{title:"Storage Swap",name:"StorageSwap",file:"storage-swap",component:function(){let e=(0,s.useRef)(null);return(0,s.useEffect)(()=>{let t=e.current;if(!t||(0,h.Oe)()||"function"!=typeof t.animate)return;let a=t.querySelector(".storage-swap-mark .b3"),r=t.querySelector(".storage-swap-name"),i=t.querySelector(".storage-swap-env");if(!a||!r||!i)return;let o=(0,h.ji)(t);return(async()=>{let e=0;for(;!o.isStopped();){if(await o.wait(1400),o.isStopped())return;let t=a.animate([{transform:"none",opacity:1},{transform:"translateX(60%)",opacity:0}],{duration:320,easing:"cubic-bezier(.7, 0, .84, 0)",fill:"forwards"});if([r,i].forEach(e=>e.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards"})),await t.finished.catch(()=>{}),o.isStopped())return;e=(e+1)%L.length,r.textContent=L[e][0],i.textContent=L[e][1],[a,r,i].forEach(e=>e.getAnimations().forEach(e=>e.cancel())),a.animate([{transform:"translateX(-60%)",opacity:0},{transform:"none",opacity:1}],{duration:520,easing:h.C2}),[r,i].forEach(e=>e.animate([{opacity:0,transform:"translateX(-6px)"},{opacity:1,transform:"none"}],{duration:300,delay:120,fill:"backwards"}))}})(),()=>{o.stop(),r.textContent=L[0][0],i.textContent=L[0][1]}},[]),(0,r.jsxs)("div",{className:"storage-swap",children:[(0,r.jsx)("style",{children:`
                .storage-swap { line-height: 0; }
                .storage-swap > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .storage-swap .part { transform-box: fill-box; transform-origin: center; }
                ${(0,h.z3)(".storage-swap")}
                .storage-swap .lead { stroke: #A29DB6; stroke-width: 1; opacity: .6; }
                .storage-swap text { font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .storage-swap .slbl { fill: #ECE9F2; font-size: 11px; font-weight: 700; }
                .storage-swap .ssub { fill: #A29DB6; font-size: 8.5px; }
            `}),(0,r.jsxs)("svg",{ref:e,viewBox:"-15 -5 280 160",role:"img","aria-label":"The bottom storage layer of the RxDB logo slides out and a different RxStorage such as IndexedDB, OPFS, SQLite or Memory slides in while RxDatabase and the RxStorage API stay the same.",children:[(0,r.jsx)("svg",{className:"storage-swap-mark",x:"4",y:"5",width:"103.33",height:"140",viewBox:"0 0 103.33 140",children:(0,r.jsx)(h.a0,{})}),(0,r.jsx)("line",{className:"lead",x1:"112",y1:"48",x2:"124",y2:"48"}),(0,r.jsx)("line",{className:"lead",x1:"112",y1:"75",x2:"124",y2:"75"}),(0,r.jsx)("line",{className:"lead",x1:"112",y1:"101.7",x2:"124",y2:"101.7"}),(0,r.jsx)("text",{className:"slbl",x:"130",y:"46",children:"RxDatabase"}),(0,r.jsx)("text",{className:"ssub",x:"130",y:"56",children:"your app"}),(0,r.jsx)("text",{className:"slbl",x:"130",y:"73",children:"RxStorage"}),(0,r.jsx)("text",{className:"ssub",x:"130",y:"83",children:"one API"}),(0,r.jsx)("text",{className:"slbl storage-swap-name",x:"130",y:"100",children:L[0][0]}),(0,r.jsx)("text",{className:"ssub storage-swap-env",x:"130",y:"110",children:L[0][1]})]})]})},description:"The bottom layer swaps between different RxStorage implementations."},{title:"Loader",name:"LogoLoader",file:"logo-loader",component:function(){return(0,r.jsxs)("div",{className:"logo-loader",children:[(0,r.jsx)("style",{children:`
                .logo-loader { line-height: 0; }
                .logo-loader > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .logo-loader .part { transform-box: fill-box; transform-origin: center; }
                ${(0,h.z3)(".logo-loader")}
                .logo-loader .bar { animation: logo-loader-load 1.8s cubic-bezier(.16, 1, .3, 1) infinite both; }
                .logo-loader .b2 { animation-delay: .12s; }
                .logo-loader .b3 { animation-delay: .24s; }
                .logo-loader .corner { animation: logo-loader-spin 1.8s cubic-bezier(.65, 0, .35, 1) infinite; }
                .logo-loader .caption { fill: #A29DB6; font-size: 10px; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .logo-loader .caption .code { fill: #ECE9F2; }
                .logo-loader .dot { fill-opacity: 0; }
                .logo-loader .d1 { animation: logo-loader-d1 1.8s infinite; }
                .logo-loader .d2 { animation: logo-loader-d2 1.8s infinite; }
                .logo-loader .d3 { animation: logo-loader-d3 1.8s infinite; }
                @keyframes logo-loader-load {
                    0% { transform: scaleX(0); transform-origin: left center; }
                    42% { transform: scaleX(1); transform-origin: left center; }
                    43%, 58% { transform: scaleX(1); transform-origin: right center; }
                    100% { transform: scaleX(0); transform-origin: right center; }
                }
                @keyframes logo-loader-spin { 0%, 50% { transform: rotate(0); } 100% { transform: rotate(360deg); } }
                @keyframes logo-loader-d1 { 0%, 24.9% { fill-opacity: 0; } 25%, 100% { fill-opacity: 1; } }
                @keyframes logo-loader-d2 { 0%, 49.9% { fill-opacity: 0; } 50%, 100% { fill-opacity: 1; } }
                @keyframes logo-loader-d3 { 0%, 74.9% { fill-opacity: 0; } 75%, 100% { fill-opacity: 1; } }
                @media (prefers-reduced-motion: reduce) {
                    .logo-loader .bar, .logo-loader .corner, .logo-loader .dot { animation: none; }
                    .logo-loader .dot { fill-opacity: 1; }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"-108.33 -38 320 240",role:"img","aria-label":"The RxDB logo as a loading indicator while awaitInitialReplication() waits for the first sync.",children:[(0,r.jsx)(h.a0,{}),(0,r.jsxs)("text",{className:"caption",x:"51.67",y:"164",textAnchor:"middle",children:[(0,r.jsx)("tspan",{className:"code",children:"awaitInitialReplication()"}),(0,r.jsx)("tspan",{className:"dot d1",children:"."}),(0,r.jsx)("tspan",{className:"dot d2",children:"."}),(0,r.jsx)("tspan",{className:"dot d3",children:"."})]})]})]})},description:"The logo as a loading indicator while the first sync runs."},{title:"Isometric Stack",name:"IsometricStack",file:"isometric-stack",component:function(){return(0,r.jsxs)("div",{className:"isometric-stack",children:[(0,r.jsx)("style",{children:`
                .isometric-stack { line-height: 0; }
                .isometric-stack > .stage { position: relative; width: 100%; aspect-ratio: 4 / 3; display: flex; align-items: center; justify-content: center; perspective: 800px; overflow: hidden; }
                .isometric-stack .iso { position: relative; height: 58%; aspect-ratio: 103.33 / 140; max-width: 100%; transform-style: preserve-3d; animation: isometric-stack-iso 6s cubic-bezier(.16, 1, .3, 1) infinite; }
                .isometric-stack .iso > svg { position: absolute; inset: 0; display: block; width: 100%; height: 100%; overflow: visible; animation: isometric-stack-lift 6s cubic-bezier(.16, 1, .3, 1) infinite; }
                .isometric-stack .frame .outline { fill: #FFFFFF; }
                .isometric-stack .frame .bar { fill: #262B40; }
                .isometric-stack .frame .corner { fill: #ED168F; }
                .isometric-stack .frame .foot { fill: #752A8A; }
                .isometric-stack .layer .b1 { fill: #ED168F; }
                .isometric-stack .layer .b2 { fill: #B2218B; }
                .isometric-stack .layer .b3 { fill: #752A8A; }
                .isometric-stack .z1 { --isometric-stack-z: 18px; }
                .isometric-stack .z2 { --isometric-stack-z: 36px; }
                .isometric-stack .z3 { --isometric-stack-z: 54px; }
                @keyframes isometric-stack-iso {
                    0%, 12% { transform: none; }
                    32%, 72% { transform: rotateX(58deg) rotateZ(-38deg); }
                    92%, 100% { transform: none; }
                }
                @keyframes isometric-stack-lift {
                    0%, 22% { transform: translateZ(0); }
                    42%, 66% { transform: translateZ(var(--isometric-stack-z, 0)); }
                    84%, 100% { transform: translateZ(0); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .isometric-stack .iso, .isometric-stack .iso > svg { animation: none; }
                }
            `}),(0,r.jsx)("div",{className:"stage",children:(0,r.jsxs)("div",{className:"iso",role:"img","aria-label":"The RxDB logo tilts into an isometric view and its three layers lift off the frame like a stack of storage layers, then settle back.",children:[(0,r.jsx)("svg",{className:"frame",viewBox:"0 0 103.33 140","aria-hidden":"true",children:(0,r.jsx)(h.a0,{})}),(0,r.jsx)("svg",{className:"layer z1",viewBox:"0 0 103.33 140","aria-hidden":"true",children:(0,r.jsx)("rect",{className:"b3",x:"6.66",y:"86.66",width:"90",height:"20"})}),(0,r.jsx)("svg",{className:"layer z2",viewBox:"0 0 103.33 140","aria-hidden":"true",children:(0,r.jsx)("rect",{className:"b2",x:"6.67",y:"60",width:"90",height:"20"})}),(0,r.jsx)("svg",{className:"layer z3",viewBox:"0 0 103.33 140","aria-hidden":"true",children:(0,r.jsx)("rect",{className:"b1",x:"6.66",y:"33.34",width:"90",height:"20"})})]})})]})},description:"The logo tilts and its layers lift off like a stack of storage layers."},{title:"Conflict Handling",name:"ConflictHandling",file:"conflict-handling",component:m.m,description:"Two offline edits of the same document are resolved into one revision."},{title:"Encryption",name:"EncryptionLogo",file:"encryption-logo",component:u.x,description:"The corner locks, the layers fill with ciphertext and decrypt back."},{title:"Key Compression",name:"KeyCompressionLogo",file:"key-compression-logo",component:w.t,description:"Long JSON keys shrink into short tokens."},{title:"Leader Election",name:"LeaderElectionTabs",file:"leader-election-tabs",component:v.F,description:"One browser tab is elected as the leader."}]},{title:"One Animation per Core Feature",animations:[{title:"Schema Validation",name:"SchemaValidationLogo",file:"schema-validation-logo",component:z.i,description:"An invalid document is rejected by the schema."},{title:"Schema Migration",name:"SchemaMigrationLogo",file:"schema-migration-logo",component:R.d,description:"Stored documents are migrated to a new schema version."},{title:"RxQuery",name:"RxQueryLogo",file:"rx-query-logo",component:function(){let e=(0,s.useRef)(null);return(0,s.useEffect)(()=>{let t=e.current;if(!t||(0,h.Oe)()||"function"!=typeof t.animate)return;let a=(0,h.ji)(t),r=t.querySelector(".rx-query-logo-code"),i=t.querySelector(".rx-query-logo-count");return(async()=>{let e=q.length-1;for(;!a.isStopped();){if(await a.wait(1800),a.isStopped())return;e=(e+1)%q.length;let[o,s,l]=q[e];r&&(r.textContent=o),i&&(i.textContent=l+(1===l?" doc":" docs")),M.forEach(e=>{let a=t.querySelector(".rx-query-logo-mark ."+e);if(!a)return;let r=s.includes(e);a.classList.toggle("dim",!r),r&&a.classList.contains("bar")&&a.animate([{transform:"none"},{transform:"translateX(5px)"},{transform:"none"}],{duration:420,easing:h.Po})})}})(),()=>a.stop()},[]),(0,r.jsxs)("div",{className:"rx-query-logo",children:[(0,r.jsx)("style",{children:`
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
            `}),(0,r.jsxs)("svg",{ref:e,viewBox:"0 0 400 300",role:"img","aria-label":"RxDB logo parts that match a MongoDB-style query stay lit while the rest dims and the result count updates.",children:[(0,r.jsx)("svg",{className:"rx-query-logo-mark",x:"24",y:"38",width:"352",height:"198",viewBox:"0 0 103.33 140",overflow:"visible",children:(0,r.jsx)(h.a0,{})}),(0,r.jsxs)("text",{className:"rx-query-logo-caption",x:"200",y:"257",textAnchor:"middle",children:[(0,r.jsxs)("tspan",{className:"rx-query-logo-code",children:["find(","{}",")"]})," ",(0,r.jsx)("tspan",{className:"rx-query-logo-count",children:"3 docs"})]})]})]})},description:"MongoDB-style queries highlight the matching parts of the logo."},{title:"Revisions",name:"RevisionsLogo",file:"revisions-logo",component:function(){let e=(0,s.useRef)(null);return(0,s.useEffect)(()=>{let t=e.current;if(!t||(0,h.Oe)()||"function"!=typeof t.animate)return;let a=(0,h.ji)(t),r=Array.from(t.querySelectorAll(".revisions-logo-mark .bar")),i=Array.from(t.querySelectorAll(".revisions-logo-rev .v")),o=[1,1,1];return(async()=>{for(;!a.isStopped();){if(await a.wait(900),a.isStopped())return;let e=Math.floor(3*Math.random());o[e]++;let t=r[e],s=i[e];if(!t||!s)continue;t.classList.remove("hit"),t.getBoundingClientRect(),t.classList.add("hit"),s.textContent=o[e]+"-"+Math.floor(65536*Math.random()).toString(16).padStart(4,"0");let l=s.parentElement;l&&l.animate([{opacity:0,transform:"translateY(4px)"},{opacity:1,transform:"none"}],{duration:300,easing:h.Po})}})(),()=>a.stop()},[]),(0,r.jsxs)("div",{className:"revisions-logo",children:[(0,r.jsx)("style",{children:`
                .revisions-logo { line-height: 0; }
                .revisions-logo > svg { display: block; width: 100%; height: auto; }
                .revisions-logo text { font-family: 'Atkinson Hyperlegible Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace; }
                .revisions-logo .part { transform-box: fill-box; transform-origin: center; }
                .revisions-logo .outline { fill: #FFFFFF; }
                .revisions-logo .b1 { --c: #ED168F; }
                .revisions-logo .b2 { --c: #B2218B; }
                .revisions-logo .b3 { --c: #752A8A; }
                .revisions-logo .bar { fill: var(--c); }
                .revisions-logo .corner { fill: #ED168F; }
                .revisions-logo .foot { fill: #752A8A; }
                .revisions-logo .bar.hit { animation: revisions-logo-flash .6s; }
                .revisions-logo .revisions-logo-rev { fill: #ECE9F2; font-size: 10px; font-weight: 700; font-variant-numeric: tabular-nums; }
                .revisions-logo .revisions-logo-rev .k { fill: #A29DB6; font-weight: 400; }
                @keyframes revisions-logo-flash {
                    0% { fill: #FFFFFF; }
                    40%, 100% { fill: var(--c); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .revisions-logo .bar.hit { animation: none; }
                }
            `}),(0,r.jsx)("svg",{ref:e,viewBox:"0 0 400 300",role:"img","aria-label":"Each write to a layer of the RxDB logo increments the revision of that layer.",children:(0,r.jsxs)("svg",{x:"24",y:"51",width:"352",height:"198",viewBox:"0 0 230 140",overflow:"visible",children:[(0,r.jsx)("svg",{className:"revisions-logo-mark",x:"0",y:"0",width:"103.33",height:"140",viewBox:"0 0 103.33 140",children:(0,r.jsx)(h.a0,{})}),(0,r.jsxs)("text",{className:"revisions-logo-rev",x:"114",y:"46.3",children:[(0,r.jsx)("tspan",{className:"k",children:"_rev "}),(0,r.jsx)("tspan",{className:"v",children:"1-a3f2"})]}),(0,r.jsxs)("text",{className:"revisions-logo-rev",x:"114",y:"73",children:[(0,r.jsx)("tspan",{className:"k",children:"_rev "}),(0,r.jsx)("tspan",{className:"v",children:"1-c81e"})]}),(0,r.jsxs)("text",{className:"revisions-logo-rev",x:"114",y:"99.7",children:[(0,r.jsx)("tspan",{className:"k",children:"_rev "}),(0,r.jsx)("tspan",{className:"v",children:"1-07bd"})]})]})})]})},description:"Every write to a layer increments its revision."},{title:"Attachments",name:"AttachmentsMail",file:"attachments-mail",component:l.M,description:"Binary files are attached to a document."},{title:"CRDT",name:"CrdtMerge",file:"crdt-merge",component:d.a,description:"Concurrent increments merge without a conflict."},{title:"Fulltext Search",name:"FulltextSearchLens",file:"fulltext-search-lens",component:g.f,description:"A magnifying lens scans the layers and stops on the match."},{title:"Vector Database",name:"VectorDatabase",file:"vector-database",component:X.N,description:"Similarity search by cosine distance between vectors."},{title:"Sharding",name:"ShardingSplit",file:"sharding-split",component:C.H,description:"One collection is split across multiple shards."},{title:"P2P Replication",name:"P2pReplicationMesh",file:"p2p-replication-mesh",component:j.E,description:"Peers replicate directly with each other over WebRTC."},{title:"Cleanup",name:"CleanupSweep",file:"cleanup-sweep",component:c.t,description:"Deleted documents are removed by the cleanup."},{title:"Backup",name:"BackupCopy",file:"backup-copy",component:n.K,description:"Documents are copied into backup files."},{title:"Middleware",name:"MiddlewareHook",file:"middleware-hook",component:k.k,description:"A preInsert hook changes a document before it is stored."},{title:"Partial Sync",name:"PartialSyncChunks",file:"partial-sync-chunks",component:F.L,description:"A voxel game only syncs the chunks near the player."},{title:"Worker Storage",name:"WorkerStorage",file:"worker-storage",component:P.Y,description:"The storage runs in a worker, off the main thread."},{title:"Population",name:"Population",file:"population",component:N.w,description:"Referenced documents are populated from another collection."},{title:"RxState",name:"RxStateBars",file:"rx-state-bars",component:E.I,description:"Reactive state values are updated with set()."},{title:"Local Documents",name:"LocalDocuments",file:"local-documents",component:function(){return(0,r.jsxs)("div",{className:"local-documents",children:[(0,r.jsx)("style",{children:`
                .local-documents { line-height: 0; }
                .local-documents > svg { display: block; width: 100%; height: auto; }
                .local-documents .part { transform-box: fill-box; transform-origin: center; }
                ${(0,h.z3)(".local-documents")}
                .local-documents .ld-out { transform-box: fill-box; opacity: 0; animation: local-documents-out 2.4s linear infinite; }
                .local-documents .ld-srv rect { fill: none; stroke: #A29DB6; stroke-width: 1.2; }
                .local-documents .ld-srv circle { fill: #A29DB6; }
                .local-documents .ld-halo { fill: none; stroke: #FFFFFF; stroke-width: 1.2; transform-box: fill-box; transform-origin: center; animation: local-documents-halo 2.4s ease-out infinite; }
                .local-documents text { font-size: 8px; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
                .local-documents .ld-label { fill: #ECE9F2; font-size: 11px; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .local-documents .ld-srv-label { fill: #A29DB6; font-size: 9px; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                @keyframes local-documents-out {
                    0% { opacity: 0; transform: none; }
                    10% { opacity: 1; }
                    80% { opacity: 1; transform: translateX(62px); }
                    90%, 100% { opacity: 0; transform: translateX(66px); }
                }
                @keyframes local-documents-halo {
                    0% { opacity: .9; transform: scale(.8); }
                    70%, 100% { opacity: 0; transform: scale(1.5); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .local-documents .ld-out { animation: none; opacity: 1; transform: translateX(31px); }
                    .local-documents .ld-halo { animation: none; transform: scale(1.15); opacity: .6; }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"-24 -32 248 192",role:"img","aria-label":"The layers of the RxDB logo replicate documents to a server while the local document on the corner piece stays on the device and never syncs.",children:[(0,r.jsx)(h.a0,{}),(0,r.jsx)("circle",{className:"ld-halo",cx:"86.67",cy:"16.67",r:"14"}),(0,r.jsx)("text",{className:"ld-label",x:"102",y:"4",children:"_local/settings"}),(0,r.jsx)("rect",{className:"ld-out",x:"100",y:"40.3",width:"10",height:"6",rx:"1.5",fill:"#ED168F"}),(0,r.jsx)("rect",{className:"ld-out",x:"100",y:"67",width:"10",height:"6",rx:"1.5",fill:"#B2218B",style:{animationDelay:"-.8s"}}),(0,r.jsx)("rect",{className:"ld-out",x:"100",y:"93.7",width:"10",height:"6",rx:"1.5",fill:"#752A8A",style:{animationDelay:"-1.6s"}}),(0,r.jsxs)("g",{className:"ld-srv",children:[(0,r.jsx)("rect",{x:"172",y:"44",width:"24",height:"12",rx:"2"}),(0,r.jsx)("rect",{x:"172",y:"60",width:"24",height:"12",rx:"2"}),(0,r.jsx)("rect",{x:"172",y:"76",width:"24",height:"12",rx:"2"}),(0,r.jsx)("circle",{cx:"177",cy:"50",r:"1.5"}),(0,r.jsx)("circle",{cx:"177",cy:"66",r:"1.5"}),(0,r.jsx)("circle",{cx:"177",cy:"82",r:"1.5"})]}),(0,r.jsx)("text",{className:"ld-srv-label",x:"184",y:"100",textAnchor:"middle",children:"server"})]})]})},description:"Local documents stay on the device and are not replicated."},{title:"RxServer",name:"RxServerRack",file:"rx-server-rack",component:S.L,description:"Clients replicate and query through RxServer endpoints."},{title:"RxPipeline",name:"RxPipelineFlow",file:"rx-pipeline-flow",component:D.J,description:"Documents are processed from a source into a destination collection."},{title:"Query Cache",name:"QueryCacheScan",file:"query-cache-scan",component:function(){return(0,r.jsxs)("div",{className:"query-cache-scan",children:[(0,r.jsx)("style",{children:`
                .query-cache-scan { line-height: 0; }
                .query-cache-scan > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .query-cache-scan text { font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .query-cache-scan .part { transform-box: fill-box; transform-origin: center; }
                ${(0,h.z3)(".query-cache-scan")}
                .query-cache-scan .qcs-scan { fill: #FFFFFF; opacity: 0; animation: qcs-scan 5s linear infinite; }
                .query-cache-scan .b1 { animation: qcs-cache-1 5s infinite; }
                .query-cache-scan .b2 { animation: qcs-cache-2 5s infinite; }
                .query-cache-scan .b3 { animation: qcs-cache-3 5s infinite; }
                .query-cache-scan .qcs-chip rect { fill: #141725; stroke: #A29DB6; stroke-width: 1; }
                .query-cache-scan .qcs-chip text { fill: #ECE9F2; font-size: 7px; }
                .query-cache-scan .qcs-chip { transform-box: fill-box; transform-origin: center; animation: qcs-chip 5s cubic-bezier(.2, 1.4, .4, 1) infinite; }
                .query-cache-scan .qcs-readout { font-size: 9.5px; }
                .query-cache-scan .qcs-r1 { fill: #ECE9F2; animation: qcs-q1 5s infinite; }
                .query-cache-scan .qcs-r2 { fill: #ED168F; opacity: 0; animation: qcs-q2 5s infinite; }
                @keyframes qcs-scan { 0%, 4% { opacity: 0; transform: none; } 6% { opacity: 1; } 36% { opacity: 1; transform: translateY(76px); } 38%, 100% { opacity: 0; transform: translateY(76px); } }
                @keyframes qcs-cache-1 { 0%, 10%, 16%, 56%, 64%, 100% { fill: #ED168F; } 12%, 58% { fill: #FFFFFF; } }
                @keyframes qcs-cache-2 { 0%, 19%, 25%, 56%, 64%, 100% { fill: #B2218B; } 21%, 58% { fill: #FFFFFF; } }
                @keyframes qcs-cache-3 { 0%, 29%, 35%, 56%, 64%, 100% { fill: #752A8A; } 31%, 58% { fill: #FFFFFF; } }
                @keyframes qcs-chip { 0%, 52% { transform: none; } 56% { transform: scale(1.25); } 64%, 100% { transform: none; } }
                @keyframes qcs-q1 { 0%, 48% { opacity: 1; } 52%, 100% { opacity: 0; } }
                @keyframes qcs-q2 { 0%, 50% { opacity: 0; } 54%, 94% { opacity: 1; } 98%, 100% { opacity: 0; } }
                @media (prefers-reduced-motion: reduce) {
                    .query-cache-scan .qcs-scan,
                    .query-cache-scan .b1,
                    .query-cache-scan .b2,
                    .query-cache-scan .b3,
                    .query-cache-scan .qcs-chip,
                    .query-cache-scan .qcs-r1,
                    .query-cache-scan .qcs-r2 { animation: none; }
                }
            `}),(0,r.jsxs)("svg",{viewBox:"-82 -22 300 200",role:"img","aria-label":"The first run of a query scans the RxDB logo layer by layer. The second run of the same query is answered from the query cache.",children:[(0,r.jsx)(h.a0,{}),(0,r.jsx)("rect",{className:"qcs-scan",x:"4",y:"30",width:"95",height:"2"}),(0,r.jsxs)("g",{className:"qcs-chip",children:[(0,r.jsx)("rect",{x:"106",y:"-10",width:"30",height:"14",rx:"3"}),(0,r.jsx)("text",{x:"121",y:"0",textAnchor:"middle",children:"cache"})]}),(0,r.jsxs)("g",{className:"qcs-readout",children:[(0,r.jsx)("text",{className:"qcs-r1",x:"68",y:"166",textAnchor:"middle",children:"find() \xb7 1st run: scan"}),(0,r.jsx)("text",{className:"qcs-r2",x:"68",y:"166",textAnchor:"middle",children:"find() \xb7 2nd run: from cache"})]})]})]})},description:"The first query scans the storage, the second one is served from the cache."}]}],I=[{title:"Logo with Wordmark",file:"/files/logo/logo_text_white.svg",usage:"The default logo. Use it on dark backgrounds, for example in headers, slides, and footers.",width:394,height:140,formats:[{label:"SVG",href:"/files/logo/logo_text_white.svg"},{label:"PNG",href:"/files/logo/png/logo_text_white.png"}],background:"dark"},{title:"Logo with Wordmark (Outlined)",file:"/files/logo/logo_text.svg",usage:"Use it on light or colored backgrounds where the white wordmark would not be readable.",width:226,height:140,formats:[{label:"SVG",href:"/files/logo/logo_text.svg"},{label:"PNG",href:"/files/logo/png/logo_text.png"}],background:"light"},{title:"Icon",file:"/files/logo/logo.svg",usage:"Use it where space is limited, for example as an avatar, favicon, app icon, or in a list of technologies.",width:103,height:140,formats:[{label:"SVG",href:"/files/logo/logo.svg"},{label:"PNG",href:"/files/logo/png/logo.png"},{label:"ICO",href:"/files/logo/icon.ico"}],background:"dark"},{title:"Logo with Claim",file:"/files/logo/rxdb_javascript_database.svg",usage:"Use it when your readers do not know RxDB yet, for example in articles, talks, and comparison tables.",width:282,height:140,formats:[{label:"SVG",href:"/files/logo/rxdb_javascript_database.svg"},{label:"PNG",href:"/files/logo/png/rxdb_javascript_database.png"}],background:"dark"}],O=[{name:"RxDB Pink",hex:"#ED168F"},{name:"RxDB Magenta",hex:"#B2218B"},{name:"RxDB Purple",hex:"#752A8A"},{name:"Background Dark",hex:"#0D0F18"},{name:"White",hex:"#FFFFFF"}],$=['Show that your project, product, or company uses RxDB, for example in a "Built with RxDB" section or a list of technologies.',"Illustrate articles, blog posts, tutorials, books, videos, and conference talks about RxDB.","Add RxDB to comparison tables and overviews of databases and sync engines.","Link the logo to https://rxdb.info/ when you use it on a website."],Y=["Change the colors, proportions, or shapes of the logo, or add effects like shadows, outlines, or gradients.","Rotate, stretch, or crop the logo, or place it on a background where it is hard to read.",'Use the logo or the name "RxDB" as part of your own product name, logo, domain, or app icon.',"Use the logo in a way that suggests RxDB sponsors, endorses, or partners with you, unless there is a written agreement.","Sell merchandise with the logo without asking first."],V={display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:24,marginTop:24,marginBottom:48},_={border:"1px solid rgba(255, 255, 255, 0.12)",borderRadius:8,overflow:"hidden",display:"flex",flexDirection:"column"},W={height:180,display:"flex",alignItems:"center",justifyContent:"center",padding:24},G={padding:16,flexGrow:1},U={display:"flex",gap:12,flexWrap:"wrap"},Z={width:"100%",height:72,borderRadius:6,border:"1px solid rgba(255, 255, 255, 0.2)"};function Q({children:e}){let t=(0,s.useRef)(null),[a,i]=(0,s.useState)(!1);return(0,s.useEffect)(()=>{let e=t.current;if(!e||"u"<typeof IntersectionObserver)return void i(!0);let a=new IntersectionObserver(e=>i(e.some(e=>e.isIntersecting)),{rootMargin:"200px"});return a.observe(e),()=>a.disconnect()},[]),(0,r.jsx)("div",{ref:t,className:"brand-animation-preview",children:a?e:null})}function J(){return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(i.A,{children:(0,r.jsx)("body",{className:"homepage"})}),(0,r.jsx)(o.A,{title:"RxDB Brand Guidelines - Logo Downloads and Usage Rules",description:"Download the RxDB logo as SVG or PNG and learn how you can use it in articles, talks, and 'Built with RxDB' sections.",children:(0,r.jsxs)("main",{children:[(0,r.jsx)("div",{className:"block first",children:(0,r.jsxs)("div",{className:"content",children:[(0,r.jsx)("h1",{children:"RxDB Brand Guidelines"}),(0,r.jsxs)("p",{children:["The ",(0,r.jsx)("b",{children:"RxDB brand guidelines"})," explain how you can use the RxDB logo, colors, and name, and where you can download the official logo files. You are welcome to use the logo to refer to ",(0,r.jsx)("a",{href:"/",children:"RxDB"})," in articles, talks, videos, documentation, and on websites that show that a project is built with RxDB. You do not have to ask for permission for these use cases as long as you follow the rules below."]})]})}),(0,r.jsx)("div",{className:"block dark",children:(0,r.jsxs)("div",{className:"content",children:[(0,r.jsx)("h2",{children:"Download the RxDB Logo"}),(0,r.jsx)("p",{children:"Prefer the SVG files because they scale to any size without losing quality. Use the PNG files (512px high, transparent background) only when a tool does not accept SVG."}),(0,r.jsx)("div",{style:V,children:I.map(e=>(0,r.jsxs)("div",{style:_,children:[(0,r.jsx)("div",{style:{...W,background:"dark"===e.background?"#0D0F18":"#FFFFFF"},children:(0,r.jsx)("img",{src:e.file,alt:"RxDB "+e.title,width:e.width,height:e.height,style:{maxWidth:"100%",maxHeight:"100%",width:"auto",height:"auto"},loading:"lazy"})}),(0,r.jsxs)("div",{style:G,children:[(0,r.jsx)("h3",{style:{marginBottom:8},children:e.title}),(0,r.jsx)("p",{style:{fontSize:"0.9rem"},children:e.usage}),(0,r.jsx)("div",{style:U,children:e.formats.map(e=>(0,r.jsxs)("a",{href:e.href,download:!0,children:["Download ",e.label]},e.href))})]})]},e.file))})]})}),(0,r.jsx)("div",{className:"block",children:(0,r.jsxs)("div",{className:"content",children:[(0,r.jsx)("h2",{children:"How You Can Use the Logo"}),(0,r.jsx)("p",{children:"You can use the RxDB logo without asking to:"}),(0,r.jsx)("ul",{children:$.map(e=>(0,r.jsx)("li",{children:e},e))}),(0,r.jsx)("h2",{children:"What You Should Not Do"}),(0,r.jsx)("p",{children:"To keep the logo recognizable and to avoid confusion about who makes RxDB, do not:"}),(0,r.jsx)("ul",{children:Y.map(e=>(0,r.jsx)("li",{children:e},e))})]})}),(0,r.jsx)("div",{className:"block dark",children:(0,r.jsxs)("div",{className:"content",children:[(0,r.jsx)("h2",{children:"Spacing and Minimum Size"}),(0,r.jsxs)("ul",{children:[(0,r.jsxs)("li",{children:[(0,r.jsx)("b",{children:"Clear space"}),": keep a free space around the logo that is at least half the height of the icon."]}),(0,r.jsxs)("li",{children:[(0,r.jsx)("b",{children:"Minimum size"}),": render the icon at least 24px high and the logo with wordmark at least 32px high, so the letters stay readable."]}),(0,r.jsxs)("li",{children:[(0,r.jsx)("b",{children:"Background"}),": use the white wordmark on dark backgrounds and the outlined wordmark on light backgrounds."]})]}),(0,r.jsx)("h2",{children:"Brand Colors"}),(0,r.jsx)("div",{style:{...V,gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))"},children:O.map(e=>(0,r.jsxs)("div",{children:[(0,r.jsx)("div",{style:{...Z,background:e.hex}}),(0,r.jsx)("div",{style:{marginTop:8},children:(0,r.jsx)("b",{children:e.name})}),(0,r.jsx)("code",{children:e.hex})]},e.hex))})]})}),(0,r.jsx)("div",{className:"block",children:(0,r.jsxs)("div",{className:"content",children:[(0,r.jsx)("h2",{children:"Writing the Name"}),(0,r.jsxs)("p",{children:["Write the name as ",(0,r.jsx)("b",{children:"RxDB"}),', with a capital R, a lowercase x, and a capital DB. Do not write "RXDB", "RxDb", or "Rx DB". When you introduce RxDB to new readers you can describe it as "RxDB, a local-first, NoSQL database for JavaScript applications" and link it to ',(0,r.jsx)("a",{href:"https://rxdb.info/",children:"https://rxdb.info/"}),"."]}),(0,r.jsx)("h2",{children:"Questions and Other Use Cases"}),(0,r.jsxs)("p",{children:["For any use that is not covered on this page, like merchandise, co-marketing, or partner badges, ask in the ",(0,r.jsx)("a",{href:"/chat/",children:"RxDB Discord"})," or via the ",(0,r.jsx)("a",{href:"/consulting/",children:"contact form"})," before you publish it. If you wrote an article, paper, or talk that mentions RxDB, add it to the ",(0,r.jsx)("a",{href:"/press/",children:"RxDB in the Press"})," list."]})]})}),(0,r.jsx)("div",{className:"block dark",children:(0,r.jsxs)("div",{className:"content",children:[(0,r.jsx)("h2",{children:"Logo Animations"}),(0,r.jsxs)("p",{children:["These ",(0,r.jsx)("b",{children:"animated versions of the RxDB logo"})," are built from the shapes of the original mark and each one shows something the database does. They are React components in ",(0,r.jsx)("code",{children:"docs-src/src/components/animations/"}),", respect ",(0,r.jsx)("code",{children:"prefers-reduced-motion"}),", and can be used in talks, videos, and articles about RxDB. In the RxDB docs, wrap an animation in the ",(0,r.jsx)("code",{children:"DocsAnimation"})," frame which centers it, limits its size, and shows a one-line subtitle below it:"]}),(0,r.jsx)("pre",{style:{marginTop:16},children:(0,r.jsx)("code",{children:`import {DocsAnimation} from '@site/src/components/docs-animation';
import {ReplicationPushPull} from '@site/src/components/animations/replication-push-pull';

<DocsAnimation subtitle="Pushing and pulling documents between client and server">
<ReplicationPushPull />
</DocsAnimation>`})}),(0,r.jsx)("style",{children:`
                                .brand-animation-preview { height: 200px; background: #0D0F18; display: flex; align-items: center; justify-content: center; line-height: 0; }
                                .brand-animation-preview > * { width: 100%; }
                                .brand-animation-preview > * > svg,
                                .brand-animation-preview > * > .stage,
                                .brand-animation-preview > * > .dsw-stage { max-height: 200px; }
                                .brand-animation-preview > .glitch-logo { width: 110px !important; }
                            `}),H.map(e=>(0,r.jsxs)("div",{children:[(0,r.jsx)("h3",{style:{marginTop:32},children:e.title}),(0,r.jsx)("div",{style:V,children:e.animations.map(e=>{let t=e.component;return(0,r.jsxs)("div",{style:_,children:[(0,r.jsx)(Q,{children:(0,r.jsx)(t,{})}),(0,r.jsxs)("div",{style:G,children:[(0,r.jsx)("h4",{style:{marginBottom:8},children:e.title}),(0,r.jsx)("p",{style:{fontSize:"0.9rem"},children:e.description}),(0,r.jsx)("code",{style:{fontSize:"0.8rem"},children:"<"+e.name+" />"})]})]},e.name)})})]},e.title))]})})]})})]})}}}]);
//# sourceMappingURL=6793617b.ffd1ccba.js.map