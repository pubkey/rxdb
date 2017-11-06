const gulp = require('gulp');
const mocha = require('gulp-mocha');
const tests = require('../test/unit.test');

gulp.task('test', function() {
    return gulp
        .src(tests.all)
        .pipe(mocha({
            bail: true,
            timeout: 6000,
            exit: true
        }))
        .once('end', function() {
            process.exit();
        });
});

gulp.task('test:typings', function() {
    return gulp
        .src(tests.typings)
        .pipe(mocha({
            bail: true,
            timeout: 6000,
            exit: true
        }))
        .once('end', function() {
            process.exit();
        });
});
