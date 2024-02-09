import type { Observable } from 'rxjs';

export interface RxReactivityFactory<Reactivity> {
    fromObservable<Data, InitData>(
        obs: Observable<Data>,
        initialValue: InitData
    ): Reactivity; // TODO must use generic data like Reactivity<Data | InitData>
}
