import { RxStorageMessageChannel } from './rx-storage-remote';
import type {
    RxStorageRemoteSettings
} from './storage-remote-types';

export * from './rx-storage-remote';
export * from './storage-remote-types';
export * from './remote';

export function getRxStorageRemote(settings: RxStorageRemoteSettings): RxStorageMessageChannel {
    return new RxStorageMessageChannel(settings);
}
