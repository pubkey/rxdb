import type { WithDeleted } from '../../types/index.d.ts';
import type { ElectricSQLShapeParams } from './electric-sql-types.ts';

export type ElectricSQLMessage<RxDocType> = {
    offset?: string;
    key?: string;
    value?: Record<string, any>;
    headers: {
        operation?: 'insert' | 'update' | 'delete';
        control?: 'up-to-date' | 'must-refetch';
    };
};

/**
 * Builds the URL for an Electric shape request.
 */
export function buildElectricUrl(
    baseUrl: string,
    params: ElectricSQLShapeParams,
    offset: string,
    handle?: string,
    live?: boolean
): string {
    const urlObj = new URL(baseUrl);

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
            urlObj.searchParams.set(key, value);
        }
    }

    urlObj.searchParams.set('offset', offset);

    if (handle) {
        urlObj.searchParams.set('handle', handle);
    }

    if (live) {
        urlObj.searchParams.set('live', 'true');
    }

    return urlObj.toString();
}

/**
 * Converts an Electric-SQL change message to an RxDB document.
 * Returns null for control messages.
 */
export function electricMessageToRxDBDocData<RxDocType>(
    message: ElectricSQLMessage<RxDocType>,
    primaryPath: string
): WithDeleted<RxDocType> | null {
    if (!message.headers.operation || !message.value) {
        return null;
    }

    const doc: any = { ...message.value };

    if (message.headers.operation === 'delete') {
        doc._deleted = true;
    } else {
        doc._deleted = false;
    }

    return doc as WithDeleted<RxDocType>;
}

/**
 * Checks if a list of Electric-SQL messages contains a 'must-refetch' control message.
 */
export function hasMustRefetch<RxDocType>(messages: ElectricSQLMessage<RxDocType>[]): boolean {
    return messages.some(m => m.headers?.control === 'must-refetch');
}
