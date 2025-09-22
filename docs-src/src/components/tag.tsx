import React from 'react';

export function Tag(props: {
    img?: string | React.ReactNode;
    border?: boolean;
    children?: React.ReactNode;
    wideMode?: boolean;
}) {
    const hasImg = !!props.img;

    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                verticalAlign: 'bottom',
                backgroundColor: 'var(--bg-color)',
                height: props.border ? 37 : 41,
                paddingTop: 0,
                paddingBottom: 0,
                borderRadius: 20,
                textAlign: 'center',
                color: 'white',
                width: 'auto',
                fontWeight: hasImg ? 800 : 500,
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
                userSelect: 'none',
                border: props.border ? '2px solid var(--White, #FFF)' : 'none',
            }}
            className={
                'margin-right-16-6 ' +
                (props.wideMode ? 'font-20-14' : 'font-16-14')
                + ' '
                + (props.wideMode ? 'padding-side-16-12' : 'padding-side-10-12')
                + ' '
                + (props.wideMode ? 'margin-bottom-16-10' : 'margin-bottom-12')
            }
        >
            {hasImg &&
                (typeof props.img === 'string' ? (
                    <img
                        src={props.img}
                        loading="lazy"
                        alt=""
                        className={(props.wideMode ? 'margin-right-8' : 'margin-right-6-8')}
                        style={{
                            height: '60%',
                            width: 24,
                            marginRight: 6,
                            display: 'block',
                            objectFit: 'contain',
                        }}
                    />
                ) : (
                    <span
                        className={(props.wideMode ? 'margin-right-8' : 'margin-right-6-8')}
                        style={{
                            height: '60%',
                            width: 24,
                            marginRight: 6,
                            display: 'block',
                            objectFit: 'contain',
                            alignItems: 'center',
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
