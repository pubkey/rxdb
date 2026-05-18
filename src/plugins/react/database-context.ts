import { createContext } from 'react';
import type { RxDatabase } from '../../types/index.d.ts';

export const RxDatabaseContext = createContext<RxDatabase<any, any, any, any>>(
    null as unknown as RxDatabase<any, any, any, any>,
);

const { Provider, Consumer } = RxDatabaseContext;

export { Consumer as RxDatabaseConsumer, Provider };
