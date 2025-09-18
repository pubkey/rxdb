import React from "react";

export function Tag(props: {
    img?: string | React.ReactNode;
    border?: boolean;
    children?: React.ReactNode;
}) {
    const hasImg = !!props.img;

    return (
        <div
            style={{
                display: "inline-flex",
                alignItems: "center",
                verticalAlign: 'bottom',
                backgroundColor: "var(--bg-color)",
                height: 41,
                padding: "0 10px",
                borderRadius: "50vh",
                textAlign: "center",
                width: "auto",
                marginRight: 12,
                marginBottom: 12,
                fontWeight: hasImg ? 800 : 500,
                whiteSpace: "nowrap",
                boxSizing: "border-box",
                userSelect: "none",
                border: props.border ? '2px solid var(--White, #FFF)' : 'none'
            }}
            className='font-16-14'
        >
            {hasImg &&
                (typeof props.img === "string" ? (
                    <img
                        src={props.img}
                        loading="lazy"
                        alt=""
                        style={{
                            height: "60%",
                            marginRight: 6,
                            display: "block",        // ← remove baseline alignment
                            objectFit: "contain",    // optional, keeps it tidy
                        }}
                    />
                ) : (
                    <span style={{
                        height: "60%",
                        marginRight: 6,
                        display: "block",        // ← remove baseline alignment
                        objectFit: "contain",    // optional, keeps it tidy
                        alignItems: "center",
                    }}>
                        {props.img ? props.img : ''}
                    </span>
                )
                )}

            <div style={{
                display: 'flex'
            }}>
                {props.children}
            </div>
        </div>
    );
}
