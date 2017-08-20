/**
 * functions that can or should be overwritten by plugins
 */

import RxError from './RxError';

const funs = {
    /**
     * validates if a password can be used
     * @overwritten by plugin (optional)
     * @param  {any} password
     * @throws if password not valid
     * @return {void}
     */
    validatePassword: function(password) {
        throw RxError.pluginMissing('encryption');
    }
};

export default funs;
