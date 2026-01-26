import React, { type ReactElement } from 'react';
import { isRxDatabase } from '../../rx-database.ts';
import type { RxDatabase } from '../../types/index';
import { Provider } from './database-context.ts';

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
        throw new Error('You must provide a valid RxDatabase to the the RxDatabaseProvider');
    }
    return <Provider value={database}>{children}</Provider>;
}
