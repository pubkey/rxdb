import React from 'react';

export type IconProps = {
    style?: React.CSSProperties;
    className?: string;
};

export function IconArrowRight({ style, className }: IconProps) {
    return (
        <div style={style} className={className}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="30"
                viewBox="0 0 18 30"
                fill="none"
            >
                <path d="M6 24H12V18H6L6 24Z" fill="white" />
                <path d="M0 30H6L6 24H0L0 30Z" fill="white" />
                <path d="M12 18H18V12H12V18Z" fill="white" />
                <path d="M6 12H12V6L6 6L6 12Z" fill="white" />
                <path d="M0 6L6 6L6 0L0 0L0 6Z" fill="white" />
            </svg>
        </div>
    );
}
