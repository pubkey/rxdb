import React, { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { DocSearchButton } from '@docsearch/react/button';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import translations from '@theme/SearchTranslations';
import type { DocSearchV4Props } from './DocSearch';

/**
 * The DocSearch component, the Algolia hooks and the connection to the
 * Algolia cluster are only needed when the visitor wants to search.
 * So this component only renders the search button and listens to the
 * search shortcuts. The full component is loaded on hover, focus or touch
 * of the button, or when the visitor clicks it or presses a shortcut.
 */
let docSearchModule: Promise<typeof import('./DocSearch')> | undefined;
function loadDocSearch(appId: string): Promise<typeof import('./DocSearch')> {
    if (!docSearchModule) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = `https://${appId}-dsn.algolia.net`;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
        docSearchModule = import('./DocSearch');
    }
    return docSearchModule;
}
const DocSearch = lazy(() => docSearchModule || import('./DocSearch'));

/**
 * Same shortcuts as useDocSearchKeyboardEvents() of @docsearch/react:
 * Ctrl/Cmd+K anywhere, and / when the visitor is not typing into a field.
 */
function isSearchShortcut(event: KeyboardEvent): boolean {
    if (event.key?.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        return true;
    }
    if (event.key !== '/') {
        return false;
    }
    const target = event.composedPath()[0] as HTMLElement;
    const tagName = target.tagName;
    return !(
        target.isContentEditable ||
        tagName === 'INPUT' ||
        tagName === 'SELECT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'BUTTON'
    );
}

export default function SearchBar(): ReactNode {
    const { siteConfig } = useDocusaurusContext();
    const props = siteConfig.themeConfig.algolia as DocSearchV4Props;
    const [state, setState] = useState<'idle' | 'load' | 'open'>('idle');
    const [ready, setReady] = useState(false);

    const load = useCallback(() => {
        loadDocSearch(props.appId);
        setState(prev => prev === 'idle' ? 'load' : prev);
    }, [props.appId]);
    const open = useCallback(() => {
        loadDocSearch(props.appId);
        setState('open');
    }, [props.appId]);

    useEffect(() => {
        if (ready) {
            return;
        }
        function onKeyDown(event: KeyboardEvent) {
            if (isSearchShortcut(event)) {
                event.preventDefault();
                open();
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [ready, open]);

    const button = <DocSearchButton
        onTouchStart={load}
        onFocus={load}
        onMouseOver={load}
        onClick={open}
        translations={props.translations?.button ?? translations.button}
    />;

    if (state === 'idle') {
        return button;
    }
    return <Suspense fallback={button}>
        <DocSearch
            {...props}
            openOnMount={state === 'open'}
            onReady={() => setReady(true)}
        />
    </Suspense>;
}
