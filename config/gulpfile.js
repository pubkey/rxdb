const gulp = require('gulp');
const mocha = require('gulp-mocha');

gulp.task('test', function() {
    return gulp
        .src([
            '../test_tmp/node/util.test.js',
            '../test_tmp/node/PouchDB-integration.test.js',
            '../test_tmp/node/RxSchema.test.js',
            '../test_tmp/node/KeyCompression.test.js',
            '../test_tmp/node/Socket.test.js',
            '../test_tmp/node/RxDatabase.test.js',
            '../test_tmp/node/RxCollection.test.js',
            '../test_tmp/node/RxDocument.test.js',
            '../test_tmp/node/Observe.test.js',
            '../test_tmp/node/Primary.test.js',
            '../test_tmp/node/Hooks.test.js',          
            '../test_tmp/node/ORM.test.js',
            '../test_tmp/node/Population.test.js',
            '../test_tmp/node/DataMigration.test.js',
            '../test_tmp/node/LeaderElection.test.js',
            '../test_tmp/node/Replication.test.js',
            '../test_tmp/node/Encryption.test.js',
            '../test_tmp/node/ImportExport.test.js',
            '../test_tmp/node/CrossInstance.test.js'
        ])
        .pipe(mocha({
            bail: true
        }))
        .once('end', function() {
            process.exit();
        });
});
