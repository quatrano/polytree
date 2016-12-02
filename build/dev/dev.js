/**
 * Development Build
 */

define([
  'gulp-batch',
  'gulp-debug',
  'gulp-jshint',
  'gulp-watch',
  'stream-reduce',

  'build/dev/server',
  'build/common/paths'
], function (batch, debug, jshint, watch, reduce,
  Server, paths) {

function jshintAll (gulp) {
  var jshintPipe = gulp.src(paths.all).pipe(jshint());
  jshintPipe.pipe(reduce(function(allPassed, file) {
      return allPassed && file.jshint.success;
    }, true))
    .on('data', function (allPassed) {
      if (allPassed) {
        console.log('[.ok.. ✔ ] jshint passed');
      }
    });
  jshintPipe.pipe(jshint.reporter('jshint-stylish'));
  return jshintPipe;
}

return function (gulp) {

  var server = Server.build();
  server.start();

  jshintAll(gulp).on('finish', function () {

    // watch all files for changes
    watch(paths.all, batch(function (events, done) {
      events.on('data', function () {
          jshintAll(gulp).on('finish', function () {
            done();
          });
        });
      }))
      .pipe(debug({title: 'fileChanged:'}));

    // watch the test cases
    watch(paths.testCase, batch(function (events, done) {
        events.on('data', function () {
            console.log('[.reload.] test case changed');
            server.reload();
            done();
          });
      }));

    // watch the source code
    watch(paths.source, batch(function (events, done) {
        events.on('data', function () {
            console.log('[.reload.] source code changed');
            server.reload();
            done();
          });
      }));

    console.log('[.ready..] watching all files');
  });

};});