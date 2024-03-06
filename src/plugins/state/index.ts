import type { RxDatabase, RxPlugin, RxQuery } from '../../types/index.d.ts';

export async function addState(this: RxDatabase) {

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
