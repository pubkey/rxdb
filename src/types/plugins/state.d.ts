import type { RxStateBase } from '../../plugins/state/rx-state';
import type { ExtendObservables } from '../rx-document';

export type RxState<T> = RxStateBase<T> & T & ExtendObservables<T>;
