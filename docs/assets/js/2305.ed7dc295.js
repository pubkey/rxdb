"use strict";(self.webpackChunkrxdb=self.webpackChunkrxdb||[]).push([["2305"],{50904(e,t,n){n.r(t),n.d(t,{default:()=>m});var r=n(74848),i=n(96540),a=n(82334),l=n(91430),s=n(30609),o=n(77984),d=n(23495),p=n(88388),x=n(67682),c=n(14128);function m({data:e,metrics:t,title:n,logScale:h}){let[f,g]=(0,i.useState)(null),[u,y]=(0,i.useState)(!1);(0,i.useEffect)(()=>{let e=()=>{y(window.innerWidth<=768)};return e(),window.addEventListener("resize",e),()=>window.removeEventListener("resize",e)},[]);let v=()=>{g(null)};return(0,r.jsxs)("div",{style:{width:"100%",marginTop:"35px",marginBottom:"95px"},children:[n&&(0,r.jsx)("h3",{style:{textAlign:"center",marginBottom:"5px",color:"var(--ifm-font-color-base)"},children:n}),(0,r.jsx)("div",{style:{textAlign:"center",marginBottom:"15px",opacity:.8,fontSize:"0.9em",color:"var(--ifm-font-color-base)"},children:"(times in milliseconds, lower is better)"}),(0,r.jsx)("div",{style:{width:"100%",height:600},children:(0,r.jsx)(a.u,{children:(0,r.jsxs)(l.E,{data:e,margin:{top:35,right:30*!u,left:20*!u,bottom:5},children:[(0,r.jsx)(s.d,{strokeDasharray:"3 3",opacity:.2}),(0,r.jsx)(o.W,{dataKey:"name",stroke:"var(--ifm-font-color-base)",tick:(0,r.jsx)(({x:e,y:t,payload:n})=>{let i=[];n.value.length>12?n.value.split(" ").forEach(e=>{if(e.length>12&&e.includes("-")){let t=e.split("-");for(let e=0;e<t.length-1;e++)i.push(t[e]+"-");i.push(t[t.length-1])}else i.push(e)}):i=[n.value];let a=[],l="";return i.forEach(e=>{(l+e).length>15&&""!==l?(a.push(l.trim()),l=e+" "):l+=e+(e.endsWith("-")?"":" ")}),l&&a.push(l.trim()),(0,r.jsx)("g",{transform:`translate(${e},${t})`,children:(0,r.jsx)("text",{x:0,y:0,dy:16,textAnchor:"end",fill:"var(--ifm-font-color-base)",transform:"rotate(-45)",children:a.map((e,t)=>(0,r.jsx)("tspan",{x:0,dy:15*(0!==t),children:e},t))})})},{}),tickMargin:10,height:120,interval:0}),(0,r.jsx)(d.h,{stroke:"var(--ifm-font-color-base)",label:{value:"ms",position:"top",offset:15,fill:"var(--ifm-font-color-base)"},scale:h?"log":"auto",domain:h?["auto","auto"]:void 0}),(0,r.jsx)(p.m,{wrapperStyle:{zIndex:1e3},content:(0,r.jsx)(({active:e,payload:n,label:i})=>{if(e&&n&&n.length){let e=[...n].sort((e,n)=>t.findIndex(t=>t.key===e.dataKey)-t.findIndex(e=>e.key===n.dataKey));return(0,r.jsxs)("div",{style:{backgroundColor:"color-mix(in srgb, var(--ifm-background-surface-color) 80%, transparent)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",border:"1px solid var(--ifm-color-emphasis-200)",color:"var(--ifm-font-color-base)",borderRadius:"4px",padding:"10px",boxShadow:"0 4px 6px rgba(0,0,0,0.1)"},children:[(0,r.jsx)("p",{style:{margin:0,fontWeight:"bold",marginBottom:"8px"},children:i}),e.map((e,t)=>(0,r.jsxs)("div",{style:{color:e.color,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"2px"},children:[(0,r.jsx)("span",{style:{marginRight:"15px"},children:e.name}),(0,r.jsxs)("span",{children:[e.value,"ms"]})]},t))]})}return null},{})}),(0,r.jsx)(x.s,{wrapperStyle:{paddingTop:u?"20px":"0px"},content:(0,r.jsx)(e=>{let{payload:n}=e;if(!n)return null;let i=[...n].sort((e,n)=>t.findIndex(t=>t.key===e.dataKey||t.name===e.value||t.key===e.payload?.dataKey)-t.findIndex(e=>e.key===n.dataKey||e.name===n.value||e.key===n.payload?.dataKey));return(0,r.jsx)("div",{className:"responsive-legend-wrapper",onMouseLeave:v,children:(0,r.jsx)("div",{className:"responsive-legend-container",children:i.map((e,t)=>(0,r.jsxs)("div",{className:"responsive-legend-item",onMouseEnter:()=>{g(e.dataKey||e.value)},style:{display:"flex",alignItems:"center",cursor:"pointer"},children:[(0,r.jsx)("div",{style:{width:"14px",height:"14px",backgroundColor:e.color,marginRight:"6px"}}),(0,r.jsx)("span",{className:"responsive-legend-text",style:{color:"var(--ifm-font-color-base)",textDecoration:f===(e.dataKey||e.value)?"underline":"none"},children:e.value})]},t))})})},{})}),t.map(e=>(0,r.jsx)(c.yP,{dataKey:e.key,name:e.name,fill:e.color,radius:[0,0,0,0],minPointSize:3,fillOpacity:f&&f!==e.key?.3:1},e.key))]})})}),(0,r.jsx)("style",{children:`
                .responsive-legend-wrapper {
                    display: flex;
                    justify-content: center;
                    width: 100%;
                    margin-top: 10px;
                }
                .responsive-legend-container {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                }
                .responsive-legend-item {
                    margin-right: 15px;
                    margin-bottom: 5px;
                }
                .responsive-legend-text {
                    font-size: 14px;
                }
                @media (max-width: 768px) {
                    .responsive-legend-container {
                        flex-direction: column;
                        align-items: flex-start;
                        padding-left: 0;
                    }
                    .responsive-legend-item {
                        margin-bottom: 8px;
                        margin-right: 0px;
                    }
                    .responsive-legend-text {
                        font-size: 12px;
                        line-height: 1.1;
                    }
                }
            `})]})}}}]);
//# sourceMappingURL=2305.ed7dc295.js.map