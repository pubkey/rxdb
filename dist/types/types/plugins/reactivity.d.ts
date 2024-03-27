import type { Observable } from 'rxjs';
import type { RxDatabase } from '../rx-database';

export interface RxReactivityFactory<Reactivity> {
    fromObservable<Data, InitData>(
        obs: Observable<Data>,
        initialValue: InitData,
        rxDatabase: RxDatabase<any, any, any, Reactivity>
    ): Reactivity; // TODO must use generic data like Reactivity<Data | InitData>
}
