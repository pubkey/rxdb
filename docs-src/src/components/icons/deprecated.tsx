import React from 'react';

export function IconDeprecated(props: React.SVGProps<SVGSVGElement>) {
    return <svg
        xmlns="http://www.w3.org/2000/svg"
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
    >
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM4 12a8 8 0 0 1 12.9-6.32L5.68 16.9A7.95 7.95 0 0 1 4 12zm8 8a7.95 7.95 0 0 1-4.9-1.68L18.32 7.1A8 8 0 0 1 12 20z" />
    </svg>;
}
