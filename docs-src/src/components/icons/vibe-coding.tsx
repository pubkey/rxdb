import React from 'react';

export function IconVibeCoding({ width = 59, height = 59, ...props }: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={width}
            height={height}
            viewBox="0 0 59 59"
            fill="none"
            {...props}
        >
            <path
                d="M26.8 4.7a2.7 2.7 0 0 1 5.4 0l2.8 15a5 5 0 0 0 4.3 4.3l15 2.8a2.7 2.7 0 0 1 0 5.4l-15 2.8a5 5 0 0 0-4.3 4.3l-2.8 15a2.7 2.7 0 0 1-5.4 0l-2.8-15a5 5 0 0 0-4.3-4.3l-15-2.8a2.7 2.7 0 0 1 0-5.4l15-2.8a5 5 0 0 0 4.3-4.3z"
                stroke="#fff"
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
