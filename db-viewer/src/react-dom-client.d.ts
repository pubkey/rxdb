/**
 * `@types/react-dom` is not a dependency of this repository, and the viewer
 * only ever uses `createRoot`, so the one entry point it needs is declared
 * here instead of pulling in another package.
 */
declare module 'react-dom/client' {
    import type { ReactNode } from 'react';
    export type Root = {
        render(children: ReactNode): void;
        unmount(): void;
    };
    export function createRoot(container: Element | DocumentFragment): Root;
}
