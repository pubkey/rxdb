import type { Observable } from 'rxjs';
import type { RxDatabase } from '../rx-database';

export interface RxReactivityFactory<Reactivity> {
    fromObservable<Data, InitData>(
        obs: Observable<Data>,
        initialValue: InitData,
        rxDatabase: RxDatabase<any, any, any, Reactivity>
    ): Reactivity; // Here we should use generic data like Reactivity<Data | InitData>
    // But I could not find out how to do this. This is a premium-task: https://github.com/pubkey/rxdb/blob/master/orga/premium-tasks.md
}
