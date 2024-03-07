import { DeepReadonly } from '../../types';

/**
 * 
 */
export type RxStateDocument = {
    /**
     * Ensures that when multiple
     * javascript realms write at the same time,
     * we do not overwrite each other but instead
     * one write must conflict-error and retry.
     * The clock value is also the primary key.
     * The clock value contains incremental numbers
     * in a string format like '0001', '0123'...
     */
    id: string;
    ops: RxStateOperation[]
};


export type RxStateOperation = {
    k: string;
    v: any;
};

export type RxStateModifier = (preValue: DeepReadonly<any>) => any;
