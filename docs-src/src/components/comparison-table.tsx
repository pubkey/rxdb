import React, { ReactNode } from 'react';

export type ComparisonCellValue = boolean | 'partial' | ReactNode;

export type ComparisonRow = {
    feature: ReactNode;
    values: ComparisonCellValue[];
};

/**
 * Feature comparison table, typically with the competitor column
 * first and the RxDB column last. Boolean values render as ✅/❌,
 * the string 'partial' renders as ⚠️, everything else is rendered
 * as-is. The last column is highlighted by default.
 *
 * Usage in .md/.mdx files:
 *
 * <ComparisonTable
 *   columns={['Feature', 'Dexie.js', 'RxDB']}
 *   rows={[
 *     { feature: 'Offline-First', values: [true, true] },
 *     { feature: 'Replication', values: ['partial', true] },
 *     { feature: 'Query Language', values: ['Custom', 'MongoDB-style (Mango)'] },
 *   ]}
 * />
 */
export function ComparisonTable(props: {
    columns: ReactNode[];
    rows: ComparisonRow[];
    /**
     * (optional) Index of the value column to highlight.
     * [default=last column]. Set to -1 to disable highlighting.
     */
    highlightColumn?: number;
}) {
    const highlightIndex = typeof props.highlightColumn === 'number'
        ? props.highlightColumn
        : props.columns.length - 2;

    return (
        <div style={{ overflowX: 'auto', marginTop: 20, marginBottom: 20 }}>
            <table style={{ width: '100%', display: 'table' }}>
                <thead>
                    <tr>
                        {props.columns.map((column, index) => (
                            <th
                                key={index}
                                style={index - 1 === highlightIndex ? styles.highlightHeader : {}}
                            >
                                {column}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {props.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            <td style={{ fontWeight: 600 }}>{row.feature}</td>
                            {row.values.map((value, valueIndex) => (
                                <td
                                    key={valueIndex}
                                    style={{
                                        textAlign: 'center',
                                        ...(valueIndex === highlightIndex ? styles.highlightCell : {}),
                                    }}
                                >
                                    {renderCellValue(value)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function renderCellValue(value: ComparisonCellValue): ReactNode {
    if (value === true) {
        return '✅';
    }
    if (value === false) {
        return '❌';
    }
    if (value === 'partial') {
        return '⚠️';
    }
    return value;
}

const styles = {
    highlightHeader: {
        color: 'var(--color-top)',
    },
    highlightCell: {
        backgroundColor: 'rgba(237, 22, 143, 0.06)',
    },
} as const;
