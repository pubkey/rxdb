const gulp = require('gulp');
const mocha = require('gulp-mocha');
const tests = require('../test/unit.test');

const mochaSettings = {
    bail: true,
    timeout: 10000,
    exit: true,
    reporter: 'spec'
};

if (process.env.TRAVIS) {
    mochaSettings.timeout = 24000;
    mochaSettings.reporter = 'min';
}

gulp.task('test', function() {
    return gulp
        .src(tests.all)
        .pipe(mocha(mochaSettings))
        .once('end', function() {
            process.exit();
        });
});

gulp.task('profile', function() {
    mochaSettings.bail = false;
    mochaSettings.prof = true;
    return gulp
        .src(tests.all)
        .pipe(mocha(mochaSettings))
        .once('end', function() {
            process.exit();
        });
});

gulp.task('test:typings', function() {
    mochaSettings.timeout = 12000;
    return gulp
        .src(tests.typings)
        .pipe(mocha(mochaSettings))
        .once('end', function() {
            process.exit();
        });
});

gulp.task('test:performance', function() {
    mochaSettings.timeout = 90 * 1000; // this is so high because travis has different machines
    return gulp
        .src(tests.performance)
        .pipe(mocha(mochaSettings))
        .once('end', function() {
            process.exit();
        });
});


gulp.task('test:couchdb', function() {
    mochaSettings.timeout = 40 * 1000;
    return gulp
        .src(tests.couchdb)
        .pipe(mocha(mochaSettings))
        .once('end', function() {
            process.exit();
        });
});
