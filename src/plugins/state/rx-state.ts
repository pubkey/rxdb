import type { RxDatabase } from '../../types';

export class RxState {
    constructor(
        public readonly prefix: string,
        public readonly database: RxDatabase
    ) { }

    async set() {

    }

    get() {

    }

}
