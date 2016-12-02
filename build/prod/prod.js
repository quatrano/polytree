/**
 * Production Build
 */

define([
  'bluebird',
  'del',
  'build/common/paths',
  'build/prod/source-hash-manager',
  'build/prod/optimize-main'
], function (Promise, del, paths, SourceHashManager, OptimizeMain) {

  return function (gulp) {

    var sourceHashManager = new SourceHashManager();

    return sourceHashManager.haveFilesChanged().then(function (filesChanged) {
      if (filesChanged) {
        console.log('files have changed');
        return cleanDist().then(function () {
          return OptimizeMain.run();
        }).then(function () {
          return sourceHashManager.writeNewHash();
        });
      } else {
        console.log('files have not changed since the last successful production build');
      }
    });

    function cleanDist () {
      console.log('cleaning dist directory...');
      return del(paths.dist);
    }
  };
});