/**
 * Source Hash Manager
 * keep the distribution in sync with source
 */

define([
  'lodash',
  'bluebird',
  'hash-files',
  'build/common/paths',
  'fs'
], function (_, Promise, hashFiles, paths, fs) {

  return function () {

    // promisify some functions
    var asyncHashFiles = Promise.promisify(hashFiles);
    var asyncReadFile = Promise.promisify(fs.readFile);
    var asyncWriteFile = Promise.promisify(fs.writeFile);
    
    // capture some state
    var state = {
      oldHash: undefined,
      newHash: undefined
    };

    // get the hash of the last successful prod build
    function getOldHash () {
      console.log('reading old hash from disk...');
      console.time('read-hash');
      return asyncReadFile(paths.sourceHash, 'utf8')
        .then(function (oldHash) {
          console.timeEnd('read-hash');
          state.oldHash = oldHash;
          return oldHash;
        }, function () {
          console.log('error reading old hash');
          state.oldHash = undefined;
          return;
        });
    }

    // hash the scripts
    function getNewHash () {
      console.log('hashing script files...');
      console.time('hash-scripts');
      return asyncHashFiles({
        files: [paths.source],
        algorithm: 'md5'
      }).then(function (newHash) {
          console.timeEnd('hash-scripts');
          state.newHash = newHash;
          return newHash;
        }, function () {
          console.log(arguments),
          console.log('error hashing scripts');
          throw new Error('error hashing scripts');
        });
    }

    return {

      // check whether files have changed since the last successful build
      // returns a promise which resolves to true if files have changed
      haveFilesChanged: function () {
        return Promise.join(getOldHash(), getNewHash())
          .then(function (hashes) {
            var oldHash = hashes[0];
            var newHash = hashes[1];
            return (_.isUndefined(oldHash) || 
              oldHash !== newHash);
          });
      },

      // write the new hash to disk
      writeNewHash: function () {
        console.log('writing new hash to: ' + paths.sourceHash + ' ...');
        console.time('write-hash');
        return asyncWriteFile(paths.sourceHash, state.newHash)
          .then(function () {
            console.timeEnd('write-hash');
            return state.newHash;
          }, function () {
            console.log('error writing new hash');
            return;
          });
      }
    };
  };
});