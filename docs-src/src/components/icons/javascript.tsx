import React from 'react';

export function IconJavascript({ width = 59, height = 59, ...props }: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            width={width}
            height={height}
            {...props}
        >
            <path
                stroke="#fff"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2 1h20a1 1 0 0 1 1 1v20a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1Z"
            />
            <path
                stroke="#fff"
                strokeLinejoin="round"
                strokeMiterlimit={10}
                strokeWidth={2}
                d="M11.855 10.901v6.546c0 2.51-2.92 2.682-4.189.535M19.128 12.895c-1.16-1.818-3.783-1.563-3.894.372-.143 2.505 4.512 1.959 4.165 4.738-.244 1.947-3.25 2.572-4.796-.043"
            />
        </svg>
    );
}
