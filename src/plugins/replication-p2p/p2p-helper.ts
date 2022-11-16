import type {
    HashFunction
} from '../../types';

export function isMasterInP2PReplication(
    hashFunction: HashFunction,
    ownPeerId: string,
    otherPeerId: string
): boolean {
    const isMaster =
        hashFunction([ownPeerId, otherPeerId].join('|'))
        >
        hashFunction([otherPeerId, ownPeerId].join('|'));
    return isMaster;
}
