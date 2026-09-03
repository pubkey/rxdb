/**
 * The grid rows are CSS grids whose cells must each sit in their own child
 * element: the stylesheet gives `> div` the cell padding and the ellipsis
 * that keeps a long value from breaking the column widths.
 */
export function GridHead({ columns, cells }: {
    columns: string;
    cells: React.ReactNode[];
}) {
    return (
        <div className="rxdbv-thead" style={{ gridTemplateColumns: columns }}>
            {cells.map((cell, index) => <div key={index}>{cell}</div>)}
        </div>
    );
}

export function GridRow({ columns, cells, className = 'rxdbv-tr', onClick }: {
    columns: string;
    cells: React.ReactNode[];
    className?: string;
    onClick?: (event: React.MouseEvent) => void;
}) {
    return (
        <div
            className={className}
            style={{ gridTemplateColumns: columns }}
            onClick={onClick}
        >
            {cells.map((cell, index) => <div key={index}>{cell}</div>)}
        </div>
    );
}
