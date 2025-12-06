import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import {
    CodeBlockContextProvider,
    type CodeBlockMetadata,
} from '@docusaurus/theme-common/internal';
import type { WordWrap } from '@docusaurus/theme-common/internal';

import CopyButton from '@theme-original/CodeBlock/Buttons/CopyButton';
import WordWrapButton from '@theme-original/CodeBlock/Buttons/WordWrapButton';
import buttonGroupStyles from '@docusaurus/theme-classic/lib/theme/CodeBlock/Buttons/styles.module.css';
import containerStyles from '@docusaurus/theme-classic/lib/theme/CodeBlock/Container/styles.module.css';

// css variables for buttons theme (normally set by prism)
const codeBlockContainerStyle: React.CSSProperties = {
    position: 'relative',
    '--prism-background-color': '#282A36',
    '--prism-color': '#F8F8F2',
} as React.CSSProperties;

/**
 * Custom word wrap hook for Shiki code blocks.
 *
 * Docusaurus's useCodeWordWrap just checks hasAttribute('style'), which is
 * always true since Shiki uses inline styles for syntax highlighting.
 */
function useShikiWordWrap(): WordWrap {
    const [isEnabled, setIsEnabled] = useState(false);
    const [isCodeScrollable, setIsCodeScrollable] = useState(false);
    const codeBlockRef = useRef<HTMLPreElement>(null);

    const toggle = useCallback(() => {
        const codeElement = codeBlockRef.current?.querySelector('code');
        if (!codeElement) return;

        if (isEnabled) {
            // Remove word wrap styles
            codeElement.style.whiteSpace = '';
            codeElement.style.overflowWrap = '';
        } else {
            // Apply word wrap styles
            codeElement.style.whiteSpace = 'pre-wrap';
            codeElement.style.overflowWrap = 'anywhere';
        }

        setIsEnabled((value) => !value);
    }, [isEnabled]);

    const updateCodeIsScrollable = useCallback(() => {
        if (!codeBlockRef.current) return;
        const { scrollWidth, clientWidth } = codeBlockRef.current;
        // Only check actual overflow, not inline styles (Shiki uses them for highlighting)
        setIsCodeScrollable(scrollWidth > clientWidth);
    }, []);

    useEffect(() => {
        updateCodeIsScrollable();
    }, [isEnabled, updateCodeIsScrollable]);

    useEffect(() => {
        window.addEventListener('resize', updateCodeIsScrollable, { passive: true });
        return () => window.removeEventListener('resize', updateCodeIsScrollable);
    }, [updateCodeIsScrollable]);

    return { codeBlockRef, isEnabled, isCodeScrollable, toggle };
}

export default function CodeBlock({
    children,
}: {
    children: ReactNode;
}): ReactNode {
    const preRef = useRef<HTMLPreElement>(null);
    const [code, setCode] = useState('');
    const wordWrap = useShikiWordWrap();

    useEffect(() => {
        if (preRef.current) {
            setCode(preRef.current.textContent || '');
        }
    }, [children]);

    const metadata: CodeBlockMetadata = {
        codeInput: code,
        code,
        className: 'language-text',
        language: 'text',
        title: undefined,
        lineNumbersStart: undefined,
        lineClassNames: {},
    };

    if (typeof children === 'string') {
        // fallback for string children (no props)
        return (
            <CodeBlockContextProvider metadata={{ ...metadata, code: children, codeInput: children }} wordWrap={wordWrap}>
                <div className={clsx(containerStyles.codeBlockContainer, 'theme-code-block')} style={codeBlockContainerStyle}>
                    <pre ref={wordWrap.codeBlockRef}>
                        <code>{children}</code>
                    </pre>
                    <div className={buttonGroupStyles.buttonGroup}>
                        <WordWrapButton />
                        <CopyButton />
                    </div>
                </div>
            </CodeBlockContextProvider>
        );
    }

    if (React.isValidElement(children) && children.type === 'pre') {
        const preProps = children.props as React.ComponentProps<'pre'>;
        const preClassName = preProps.className || '';
        const preMetadata: CodeBlockMetadata = {
            ...metadata,
            className: preClassName || 'language-text',
            language: preClassName.replace('language-', '') || 'text',
        };
        return (
            <CodeBlockContextProvider metadata={preMetadata} wordWrap={wordWrap}>
                <div className={clsx(containerStyles.codeBlockContainer, 'theme-code-block')} style={codeBlockContainerStyle}>
                    <pre
                        {...preProps}
                        ref={(el) => {
                            // Update both refs
                            (preRef as React.MutableRefObject<HTMLPreElement | null>).current = el;
                            if (wordWrap.codeBlockRef) {
                                (wordWrap.codeBlockRef as React.MutableRefObject<HTMLPreElement | null>).current = el;
                            }
                        }}
                    />
                    <div className={buttonGroupStyles.buttonGroup}>
                        <WordWrapButton />
                        <CopyButton />
                    </div>
                </div>
            </CodeBlockContextProvider>
        );
    }

    return children;
}

export function Pre(props: React.ComponentProps<'pre'>) {
    return <CodeBlock><pre {...props} /></CodeBlock>;
}
