import { DEFAULT_COMPRESSIBLE_TYPES } from '../../../src/plugins/attachments-compression/index';

export function DefaultCompressibleTypes() {
    return (
        <ul>
            {DEFAULT_COMPRESSIBLE_TYPES.map((type) => (
                <li key={type}><code>{type}</code></li>
            ))}
        </ul>
    );
}
