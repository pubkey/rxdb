import React from "react";

export function RxdbMongoDiagramPlain({
    className = "",
    style,
    clientLabels = ["Client A", "Client B", "Client C"],
    serverLabel = "RxServer",
    dbLabel = "MongoDB",
}: {
    className?: string;
    style?: React.CSSProperties;
    clientLabels?: string[];
    serverLabel?: string;
    dbLabel?: string;
}) {

    const logoUrl = "/files/logo/logo.svg";
    const mongoDBIcon = "/files/icons/mongodb-icon.svg";

    return (
        <div className={`rxdb-diagram ${className}`} style={style}>
            <style>{`
        .rxdb-diagram {
          color: inherit;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          margin: 0 auto;
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
                       Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
        }

        /* Stage keeps fixed aspect ratio and scales */
        .rxdb-diagram .stage {
          width: 100%;
          aspect-ratio: 816 / 336;
          position: relative;
        }

        /* Grid fills the stage completely */
        .rxdb-diagram .grid {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns:
            26.960784% 5.882353% 31.862745% 5.882353% 29.411765%;
          grid-template-rows:
            23.809524% 14.285714% 23.809524% 14.285714% 23.809524%;
          align-items: center;
          justify-items: stretch;
        }

        .rxdb-diagram {
          --stroke: clamp(1px, 0.35vmin, 2px);
          --radius: clamp(8px, 1.2vmin, 14px);
          --pad: clamp(8px, 1.2vmin, 18px);
          --line: currentColor;
        }

        .rxdb-diagram .logo {
            height: 1.2em;
            width: auto;
            display: inline-block;
            object-fit: contain;
            margin-right: 10px;
          }

        .rxdb-diagram .box {
          border: var(--stroke) dashed var(--line);
          border-radius: var(--radius);
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-weight: 600;
          padding: var(--pad);
          line-height: 1.2;
          user-select: none;
        }

        /* Server and DB take full height of stage */
        .rxdb-diagram .server,
        .rxdb-diagram .db {
          grid-row: 1 / -1;
          height: 100%;
        }

        /* Horizontal arrows */
        .rxdb-diagram .arrow {
          position: relative;
          height: 0;
          border-top: var(--stroke) solid var(--line);
          width: calc(100% - 20%);
          margin-left: 10%;
          margin-right: -1.5%;
        }

        .rxdb-diagram .arrow::before,
        .rxdb-diagram .arrow::after {
          content: "";
          position: absolute;
          top: 50%;
          width: clamp(6px, 1.2vmin, 10px);
          height: clamp(6px, 1.2vmin, 10px);
          border-top: var(--stroke) solid var(--line);
          border-right: var(--stroke) solid var(--line);
          transform-origin: center;
        }
        .rxdb-diagram .arrow::before {
          left: 0;
          transform: translate(-0%, -60%) rotate(-135deg);
        }
        .rxdb-diagram .arrow::after {
          right: 0;
          transform: translate(0%, -60%) rotate(45deg);
        }
      `}</style>

            <div className="stage" aria-label="Clients to RxServer to MongoDB diagram">
                <div className="grid">
                    {/* Client A */}
                    <div className="box" style={{ gridColumn: 1, gridRow: 1 }}>
                        <img src={logoUrl} alt="" className="logo" aria-hidden />{clientLabels[0] || "Client A"}
                    </div>
                    <div className="arrow" style={{ gridColumn: 2, gridRow: 1 }} aria-hidden />

                    {/* Server full height */}
                    <div className="box server" style={{ gridColumn: 3 }}>
                        <img src={logoUrl} alt="" className="logo" aria-hidden />{serverLabel}
                    </div>

                    {/* Arrow between Server and DB (middle row) */}
                    <div className="arrow" style={{ gridColumn: 4, gridRow: 3 }} aria-hidden />

                    {/* DB full height */}
                    <div className="box db" style={{ gridColumn: 5 }}>
                        <img src={mongoDBIcon} alt="" className="logo" aria-hidden /> {dbLabel}
                    </div>

                    {/* Client B */}
                    <div className="box" style={{ gridColumn: 1, gridRow: 3 }}>
                        <img src={logoUrl} alt="" className="logo" aria-hidden />{clientLabels[1] || "Client B"}
                    </div>
                    <div className="arrow" style={{ gridColumn: 2, gridRow: 3 }} aria-hidden />

                    {/* Client C */}
                    <div className="box" style={{ gridColumn: 1, gridRow: 5 }}>
                        <img src={logoUrl} alt="" className="logo" aria-hidden />{clientLabels[2] || "Client C"}
                    </div>
                    <div className="arrow" style={{ gridColumn: 2, gridRow: 5 }} aria-hidden />
                </div>
            </div>
        </div>
    );
}
