// Polyfills
import 'babel-polyfill';

import 'zone.js/dist/zone';

console.log('ENV: ' + ENV);
if ('production' === ENV) {
    // Production
} else {
    // Development
    //    Error['stackTraceLimit'] = Infinity;
    require('zone.js/dist/long-stack-trace-zone');
}
