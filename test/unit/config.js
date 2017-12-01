const {
    detect
} = require('detect-browser');

export default {
    platform: detect()
};
