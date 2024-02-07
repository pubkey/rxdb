import type { Observable } from 'rxjs';

export interface RxSignals<SignalType> {
    observableToSignal<Data>(obs: Observable<Data>, initialValue: Data): SignalType;
}
