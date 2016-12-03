const gulp = require('gulp');
const mocha = require('gulp-mocha');

gulp.task('test', function() {
    return gulp
        .src([
            '../test_tmp/util.test.js',
            '../test_tmp/Schema.test.js',
            '../test_tmp/PouchDB-integration.test.js',
            '../test_tmp/Database.test.js',
            '../test_tmp/Collection.test.js',
            '../test_tmp/Document.test.js',
            '../test_tmp/Primary.test.js',
            '../test_tmp/Replication.test.js',
            '../test_tmp/Encryption.test.js',
            '../test_tmp/ImportExport.test.js',
            '../test_tmp/Observe.test.js',
            '../test_tmp/CrossInstance.test.js'
        ])
        .pipe(mocha({
            bail: true
        }))
        .once('end', function() {
            process.exit();
        });
});
