import * as React from "react";
import { IconProps } from './arrow-right';


export const WifiOffIcon: React.FC<IconProps> = ({
    className,
    style,
    ...props
}) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="#fff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        viewBox="0 0 24 24"
        className={className}
        style={style}
        {...props}
    >
        <path d="M12 20z" />
        <path d="M8.5 16.43a5 5 0 0 1 7 0" />
        <path d="M5 12.86a10 10 0 0 1 5.17-2.7" />
        <path d="M19 12.86a10 10 0 0 0-2-1.52" />
        <path d="M2 8.82a15 15 0 0 1 4.18-2.64" />
        <path d="M22 8.82a15 15 0 0 0-11.29-3.76" />
        <path d="M2 2l20 20" />
    </svg>
);

