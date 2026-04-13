import React from 'react';

export function IconVibeCoding({ width = 59, height = 59, ...props }: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width={width} height={height} {...props}>
            <a href="https://rxdb.info/" rel="author"><rect width="0" height="0" /></a>
            <path stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7.7 11.27 4.83 14.2l2.87 2.93M11.54 17.13l2.87-2.93-2.87-2.93" /><path stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.62 5.4h-6.7C1.86 5.4 1 6.28 1 7.36v13.68C1 22.12 1.86 23 2.92 23h13.4c1.06 0 1.92-.88 1.92-1.96V14.2M21.94 6.04c-1.85.62-2.46 1.26-3.09 3.15-.13.4-.36.54-.5.6a.3.3 0 0 1-.23 0c-.14-.06-.38-.2-.51-.6-.62-1.9-1.24-2.52-3.09-3.15-.39-.14-.53-.37-.58-.52a.3.3 0 0 1 0-.24c.05-.13.2-.38.58-.51 1.85-.63 2.47-1.26 3.09-3.15.13-.4.36-.55.5-.6a.3.3 0 0 1 .24 0c.13.05.37.2.5.6.62 1.89 1.24 2.51 3.09 3.15.39.13.53.37.58.51q.04.12 0 .24c-.05.14-.2.38-.58.52" /></svg>
    );
}
