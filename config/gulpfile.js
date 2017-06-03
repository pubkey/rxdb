const gulp = require('gulp');
const mocha = require('gulp-mocha');
const tests = require('../test/unit.test');

gulp.task('test', function() {
    return gulp
        .src(tests)
        .pipe(mocha({
            bail: true,
            timeout: 6000
        }))
        .once('end', function() {
            process.exit();
        });
});
