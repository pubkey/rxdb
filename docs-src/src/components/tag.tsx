import React, { useState } from 'react';

export function Tag(props: {
    img?: string | React.ReactNode;
    border?: boolean;
    children?: React.ReactNode;
    wideMode?: boolean;
}) {
    const hasImg = !!props.img;
    const [hovered, setHovered] = useState(false);

    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                verticalAlign: 'bottom',
                background: hovered ? '#fff' : 'var(--bg-color)',
                height: props.border ? 37 : 41,
                paddingTop: 0,
                paddingBottom: 0,
                borderRadius: 20,
                textAlign: 'center',
                color: hovered ? 'var(--bg-color-dark)' : 'white',
                width: 'auto',
                fontWeight: hasImg ? 800 : 500,
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
                userSelect: 'none',
                border: props.border ? '2px solid var(--White, #FFF)' : 'none',
                transition: 'all 0.2s ease-in-out',
            }}
            className={
                'margin-right-10-6 ' +
                (props.wideMode ? 'font-20-14' : 'font-16-14') +
                ' ' +
                (props.wideMode ? 'padding-side-16-12' : 'padding-side-10-12') +
                ' ' +
                (props.wideMode ? 'margin-bottom-16-10' : 'margin-bottom-12')
            }
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {hasImg &&
                (typeof props.img === 'string' ? (
                    <img
                        src={props.img}
                        loading="lazy"
                        alt=""
                        className={props.wideMode ? 'margin-right-8' : 'margin-right-6-8'}
                        style={{
                            height: '60%',
                            width: 24,
                            marginRight: 6,
                            display: 'block',
                            objectFit: 'contain',
                            filter: hovered ? 'invert(1)' : undefined,
                            transition: 'filter 0.2s ease-in-out',
                        }}
                    />
                ) : (
                    <span
                        className={props.wideMode ? 'margin-right-8' : 'margin-right-6-8'}
                        style={{
                            height: '60%',
                            width: 24,
                            marginRight: 6,
                            display: 'block',
                            objectFit: 'contain',
                            alignItems: 'center',
                            filter: hovered ? 'invert(1)' : undefined,
                            transition: 'filter 0.2s ease-in-out',
                        }}
                    >
                        {props.img}
                    </span>
                ))}

            <div style={{ display: 'flex' }}>{props.children}</div>
        </div>
    );
}
