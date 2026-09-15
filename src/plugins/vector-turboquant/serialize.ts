import { newRxError } from '../../rx-error.ts';
import {
    arrayBufferToString,
    stringToArrayBuffer
} from '../utils/index.ts';
import { TurboQuantIndex } from './turboquant-index.ts';
import type {
    TurboQuantBitWidth,
    TurboQuantDistance
} from './types.ts';

/**
 * Magic bytes 'RXTQ' at the start of every serialized index.
 */
const MAGIC = [82, 88, 84, 81];
const FORMAT_VERSION = 1;
const HEADER_BYTES = 32;
const FLAG_CALIBRATED = 1;

const DISTANCE_CODES: TurboQuantDistance[] = ['dotProduct', 'cosine', 'euclidean'];

/**
 * Writes the whole index into a single binary blob.
 * Store this with the RxDB attachments plugin or as a base64 string
 * in a local document to skip rebuilding the index on the next start.
 */
export function serializeTurboQuantIndex(index: TurboQuantIndex): Uint8Array {
    const count = index.count;
    const idBytes = stringToArrayBuffer(JSON.stringify(index.getIds()));
    const scaleBytes = index.scales ? index.paddedDim * 4 : 0;
    const totalBytes = HEADER_BYTES +
        scaleBytes +
        count * 4 * 2 +
        count * index.bytesPerVector +
        idBytes.length;

    const result = new Uint8Array(totalBytes);
    const view = new DataView(result.buffer);
    MAGIC.forEach((byte, i) => result[i] = byte);
    view.setUint8(4, FORMAT_VERSION);
    view.setUint8(5, index.bitWidth);
    view.setUint8(6, index.scales ? FLAG_CALIBRATED : 0);
    view.setUint8(7, DISTANCE_CODES.indexOf(index.distance));
    view.setUint32(8, index.dimensions, true);
    view.setUint32(12, index.paddedDim, true);
    view.setInt32(16, index.seed, true);
    view.setUint32(20, count, true);
    view.setUint32(24, idBytes.length, true);
    view.setUint32(28, 0, true);

    let offset = HEADER_BYTES;
    if (index.scales) {
        for (let j = 0; j < index.paddedDim; j++) {
            view.setFloat32(offset, index.scales[j], true);
            offset += 4;
        }
    }
    for (let i = 0; i < count; i++) {
        view.setFloat32(offset, index.norms[i], true);
        offset += 4;
    }
    for (let i = 0; i < count; i++) {
        view.setFloat32(offset, index.renorms[i], true);
        offset += 4;
    }
    const codeBytes = count * index.bytesPerVector;
    result.set(index.codes.subarray(0, codeBytes), offset);
    offset += codeBytes;
    result.set(idBytes, offset);
    return result;
}

/**
 * Rebuilds an index from the output of serializeTurboQuantIndex().
 */
export function deserializeTurboQuantIndex(data: Uint8Array): TurboQuantIndex {
    if (data.length < HEADER_BYTES || MAGIC.some((byte, i) => data[i] !== byte)) {
        throw newRxError('VQ5', {
            have: data.length
        });
    }
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const version = view.getUint8(4);
    if (version !== FORMAT_VERSION) {
        throw newRxError('VQ6', {
            have: version,
            should: FORMAT_VERSION
        });
    }
    const bitWidth = view.getUint8(5) as TurboQuantBitWidth;
    const isCalibrated = (view.getUint8(6) & FLAG_CALIBRATED) === FLAG_CALIBRATED;
    const distance = DISTANCE_CODES[view.getUint8(7)];
    const dimensions = view.getUint32(8, true);
    const paddedDim = view.getUint32(12, true);
    const seed = view.getInt32(16, true);
    const count = view.getUint32(20, true);
    const idByteLength = view.getUint32(24, true);

    const index = new TurboQuantIndex({
        dimensions,
        bitWidth,
        seed,
        distance
    });
    if (index.paddedDim !== paddedDim) {
        throw newRxError('VQ6', {
            have: paddedDim,
            should: index.paddedDim
        });
    }

    let offset = HEADER_BYTES;
    if (isCalibrated) {
        const scales = new Float64Array(paddedDim);
        for (let j = 0; j < paddedDim; j++) {
            scales[j] = view.getFloat32(offset, true);
            offset += 4;
        }
        index.applyScales(scales);
    }

    index.reserve(count);
    for (let i = 0; i < count; i++) {
        index.norms[i] = view.getFloat32(offset, true);
        offset += 4;
    }
    for (let i = 0; i < count; i++) {
        index.renorms[i] = view.getFloat32(offset, true);
        offset += 4;
    }
    const codeBytes = count * index.bytesPerVector;
    index.codes.set(data.subarray(offset, offset + codeBytes));
    offset += codeBytes;

    const ids: string[] = JSON.parse(
        arrayBufferToString(data.subarray(offset, offset + idByteLength) as Uint8Array<ArrayBuffer>)
    );
    index.ids = ids;
    index.count = count;
    index.idToSlot = new Map();
    for (let i = 0; i < count; i++) {
        index.idToSlot.set(ids[i], i);
    }
    return index;
}
