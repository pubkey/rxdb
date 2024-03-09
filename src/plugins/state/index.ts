import type {
    RxDatabase,
    RxPlugin,
    RxState
} from '../../types/index.d.ts';
import { getFromMapOrCreate } from '../utils/utils-map.ts';
import { RxStateBase, createRxState } from './rx-state.ts';

export * from './helpers.ts';

type StateByPrefix = Map<string, Promise<RxStateBase<any>>>;
const STATE_BY_DATABASE = new WeakMap<RxDatabase, StateByPrefix>();

export async function addState<T>(
    this: RxDatabase,
    namespace: string = ''
): Promise<RxState<T>> {
    const stateCache = getFromMapOrCreate<RxDatabase, StateByPrefix>(
        STATE_BY_DATABASE,
        this,
        () => new Map()
    );
    const state = await getFromMapOrCreate(
        stateCache,
        namespace,
        () => createRxState<T>(this, namespace)
    );
    this.states[namespace] = state;
    return state as any;
}

export const RxDBStatePlugin: RxPlugin = {
    name: 'state',
    rxdb: true,
    prototypes: {
        RxDatabase(proto: any) {
            proto.addState = addState;
        }
    }
};
