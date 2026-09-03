import type { DiffLine } from '../format.ts';

/**
 * Syntax highlighted, pretty printed JSON.
 * Keys are dim, strings green, numbers and booleans yellow.
 */
export function HighlightedJson({ value, indent = 2 }: { value: any; indent?: number; }) {
    const source = JSON.stringify(value, null, indent);
    if (typeof source !== 'string') {
        return <>undefined</>;
    }
    const pattern = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;
    let match = pattern.exec(source);
    while (match !== null) {
        if (match.index > lastIndex) {
            parts.push(source.slice(lastIndex, match.index));
        }
        if (match[1] !== undefined && match[2] !== undefined) {
            parts.push(<span key={key++} className="rxdbv-json-key">{match[1]}</span>);
            parts.push(match[2]);
        } else if (match[1] !== undefined) {
            parts.push(<span key={key++} className="rxdbv-json-string">{match[1]}</span>);
        } else {
            parts.push(<span key={key++} className="rxdbv-json-literal">{match[0]}</span>);
        }
        lastIndex = match.index + match[0].length;
        match = pattern.exec(source);
    }
    if (lastIndex < source.length) {
        parts.push(source.slice(lastIndex));
    }
    return <>{parts}</>;
}

export function DiffView({ lines }: { lines: DiffLine[]; }) {
    return (
        <div className="rxdbv-diff">
            {lines.map((line, index) => line.kind === 'context'
                ? <span key={index}>{'  ' + line.text + '\n'}</span>
                : (
                    <span
                        key={index}
                        className={line.kind === 'added' ? 'rxdbv-diff-add' : 'rxdbv-diff-del'}
                    >{(line.kind === 'added' ? '+ ' : '- ') + line.text}</span>
                ))}
        </div>
    );
}
