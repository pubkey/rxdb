import React, { ReactNode } from 'react';

export type ComparisonCellValue = boolean | 'partial' | ReactNode;

export type ComparisonRow = {
    feature: ReactNode;
    values: ComparisonCellValue[];
};

/**
 * Feature comparison table, typically with the competitor column
 * first and the RxDB column last. The last column is highlighted.
 *
 * Two usage modes:
 *
 * 1. Wrap an existing markdown table. The table keeps normal
 *    markdown processing (links, inline code) and only gets the
 *    scroll container and the highlighted last column:
 *
 * <ComparisonTable>
 *
 * | Feature | Dexie.js | RxDB |
 * | --- | --- | --- |
 * | Replication | ❌ | ✅ |
 *
 * </ComparisonTable>
 *
 * 2. Pass data rows. Boolean values render as ✅/❌, the string
 *    'partial' renders as ⚠️, everything else is rendered as-is:
 *
 * <ComparisonTable
 *   columns={['Feature', 'Dexie.js', 'RxDB']}
 *   rows={[
 *     { feature: 'Offline-First', values: [true, true] },
 *     { feature: 'Replication', values: ['partial', true] },
 *   ]}
 * />
 */
export function ComparisonTable(props: {
    columns?: ReactNode[];
    rows?: ComparisonRow[];
    /**
     * (optional) Markdown table children, used instead of columns/rows.
     */
    children?: ReactNode;
    /**
     * (optional) Index of the value column to highlight in data mode.
     * [default=last column]. Set to -1 to disable highlighting.
     */
    highlightColumn?: number;
}) {
    if (!props.columns || !props.rows) {
        return (
            <div className="rxdb-comparison-table" style={styles.scrollContainer}>
                {props.children}
            </div>
        );
    }

    const highlightIndex = typeof props.highlightColumn === 'number'
        ? props.highlightColumn
        : props.columns.length - 2;

    return (
        <div style={styles.scrollContainer}>
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
    scrollContainer: {
        overflowX: 'auto',
        marginTop: 20,
        marginBottom: 20,
    },
    highlightHeader: {
        color: 'var(--color-top)',
    },
    highlightCell: {
        backgroundColor: 'rgba(237, 22, 143, 0.06)',
    },
} as const;
