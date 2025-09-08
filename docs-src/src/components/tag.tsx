import React from "react";

export function Tag(props: {
    img?: string | React.ReactNode;
    children?: React.ReactNode;
}) {
    const hasImg = !!props.img;

    return (
        <div
            style={{
                display: "inline-flex",
                alignItems: "center",
                backgroundColor: "var(--bg-color)",
                height: 41,
                padding: "0 10px",
                borderRadius: "50vh",
                textAlign: "center",
                width: "auto",
                marginRight: 12,
                marginBottom: 12,
                fontSize: 16,
                fontWeight: hasImg ? 800 : 500,
                whiteSpace: "nowrap",
            }}
        >
            {hasImg &&
                (typeof props.img === "string" ? (
                    <img
                        src={props.img}
                        loading="lazy"
                        alt=""
                        style={{
                            height: "60%",
                            marginRight: 6, // spacing between image and text
                        }}
                    />
                ) : (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        marginRight: 6,
                    }}>
                        {props.img ? props.img : ''}
                    </div>
                ))}

            <div style={{
                display: 'flex'
            }}>{props.children}</div>
        </div>
    );
}
