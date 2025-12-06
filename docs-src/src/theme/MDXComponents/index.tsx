import React from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import CodeInline from '@theme/CodeInline';
import { Pre } from '@theme/CodeBlock';

function Code(props: React.ComponentProps<'code'>) {
    const isInline =
        typeof props.children !== 'undefined' &&
        React.Children.toArray(props.children).every(
            (el) => typeof el === 'string' && !el.includes('\n')
        );
    return isInline ? <CodeInline {...props} /> : <code {...props} />;
}

export default {
    ...MDXComponents,
    code: Code,
    pre: Pre,
};
