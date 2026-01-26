import React, { type ReactElement } from 'react';
import { isRxDatabase } from '../../rx-database.ts';
import type { RxDatabase } from '../../types/index';
import { Provider } from './database-context.ts';
import { newRxError } from '../../rx-error.ts';

export type RxDatabaseProviderProps = {
    database: RxDatabase;
    children: React.ReactNode;
};

/**
 * RxDatabaseProvider is a React context provider component for RxDB.
 * It ensures that a valid RxDatabase instance is passed and makes it available
 * to all descendant components via React Context.
 *
 * @param {RxDatabaseProviderProps} props - The provider props.
 * @param {RxDatabase} props.database - The RxDatabase instance to provide.
 * @param {React.ReactNode} props.children - The child components that will have access to the database.
 * @throws {Error} If the provided database is not a valid RxDatabase instance.
 * @returns {ReactElement} The context provider wrapping the children.
 *
 * @example
 * <RxDatabaseProvider database={myDatabase}>
 *   <MyComponent />
 * </RxDatabaseProvider>
 */
export function RxDatabaseProvider({
    children,
    database,
}: RxDatabaseProviderProps): ReactElement<typeof Provider> {
    if (!isRxDatabase(database)) {
        throw newRxError('R1', {
            database
        });
    }
    return <Provider value={database}>{children}</Provider>;
}
