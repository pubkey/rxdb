import type { RxStateBase } from '../../plugins/state/rx-state';
import type { ExtendObservables, ExtendReactivity } from '../rx-document';

export type RxState<T, Reactivity = unknown> = RxStateBase<T, Reactivity> & T & ExtendObservables<Required<T>> & ExtendReactivity<Required<T>, Reactivity>;
