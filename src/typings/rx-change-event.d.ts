export declare class RxChangeEvent {
    data: {
        readonly type: 'INSERT' | 'UPDATE' | 'REMOVE';
    };
    toJSON(): any;
}
