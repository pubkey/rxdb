import {
    Pipe, PipeTransform
} from '@angular/core';
import {
    AsyncPipe
} from '@angular/common';

/**
 * Because RxDB calculates queries with caching and things,
 * they do not run in angulars zone.
 * @link https://stackoverflow.com/questions/35513015/async-pipe-not-rendering-the-stream-updates
 * To not have to run changeDetection on each emit for each subscribed query,
 * we use a different async-pipe that runs the change-detection on emit.
 */
@Pipe({
    name: 'asyncNoZone',
    pure: false
})
export class AsyncNoZonePipe extends AsyncPipe implements PipeTransform {
}
// monkeypatch the private method with detectChanges() instead of markForCheck()
AsyncNoZonePipe.prototype['_updateLatestValue'] = function (async: any, value: Object): void {
    if (async === this['_obj']) {
        this['_latestValue'] = value;
        this['_ref'].detectChanges();
    }
};
