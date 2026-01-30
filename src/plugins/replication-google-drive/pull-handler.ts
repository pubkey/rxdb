import type {
    GoogleDriveCheckpointType,
    GoogleDriveOptions
} from './google-drive-types.ts';
import type {
    RxReplicationPullStreamItem
} from '../../types/index.d.ts';

export async function getLastCheckpoint(
    _options: GoogleDriveOptions
): Promise<GoogleDriveCheckpointType | undefined> {
    // TODO: implement
    return undefined;
}

export async function getChangesSinceLastCheckpoint(
    _options: GoogleDriveOptions,
    _lastCheckpoint: GoogleDriveCheckpointType,
    _batchSize: number
): Promise<{
    documents: any[],
    checkpoint: GoogleDriveCheckpointType
}> {
    // TODO: implement
    return {
        documents: [],
        checkpoint: {
            id: '',
            modifiedTime: ''
        }
    };
}
