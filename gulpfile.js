/**
 * Gulp File
 * the entry point for all workflows
 * executes synchronously
 */

var requirejs = require('requirejs');
var gulp = require('gulp');

requirejs.config({
  baseUrl: __dirname,
  nodeRequire: require // modules that aren't found by requirejs will use the nodeRequire function
});

// dev is the default workflow
gulp.task('default', ['dev']);

// run while developing
// done is never called; runs indefinitely
gulp.task('dev', function (done) {
  requirejs('build/dev/dev')(gulp);
});

// run after developing
// exit code indicates success/failure
gulp.task('prod', function(done) {
  requirejs('build/prod/prod')(gulp).then(function (err) {
    setTimeout(function () {
      process.exit(0);
    }, 0);
    done();
  }, function (err) {
    console.error(err);
    setTimeout(function () {
      process.exit(145);
    }, 0);
    done();
  });
});

// from http://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits
process.stdin.resume(); // so the program will not close instantly