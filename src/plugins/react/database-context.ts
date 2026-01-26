import { createContext } from 'react';
import type { RxDatabase } from '../../types/index.d.ts';

export const RxDatabaseContext = createContext<RxDatabase>(
    null as unknown as RxDatabase,
);

const { Provider, Consumer } = RxDatabaseContext;

export { Consumer as RxDatabaseConsumer, Provider };
