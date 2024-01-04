/**
 * This file contains everything
 * that is supposed to run inside of the electron main process
 */
import type { RxStorage } from '../../types/index.d.ts';
export declare function exposeIpcMainRxStorage<T, D>(args: {
    key: string;
    storage: RxStorage<T, D>;
    ipcMain: any;
}): void;
