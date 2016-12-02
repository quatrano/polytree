/**
 * originalConfig with only function definitions
 */

define([
  'bluebird',
  'lodash',
  'immutable',

  'polytree/dev_util'
], function (Promise, _, Immutable,
             DevUtil) {

var async = DevUtil.constants.thingTypes.asyncFn;
var sync = DevUtil.constants.thingTypes.syncFn;

return {
  'constant': {
    'foo': {
      value: 'bar'
    }
  },

  'syncFn': {

    'emptySync': {},

    'sync': {
      procedure: function (constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        return 1;
      }
    },

    'syncDepConstant': {
      constantDeps: ['foo'],
      procedure: function (constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        return constantDeps.get('foo').value === 'bar';
      }
    },

    'syncDepSync': {
      syncFnDeps: ['sync'],
      procedure: function (constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        return syncFnDeps.get('sync')();
      }
    },

    'syncDepSyncMultiCall': {
      syncFnDeps: ['sync'],
      procedure: function (constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        var dep = syncFnDeps.get('sync');
        if (dep() && dep()) {
          return dep();
        }
      }
    },

    'syncDepAsync': {
      asyncFnDeps: ['async'],
      procedure: function (constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        return asyncFnDeps.get('async').asPromise();
      }
    },

    'dynamicSync': {
      procedure: function (constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        return dynamicArgs.get(0) + dynamicArgs.get(1);
      }
    },

    'dynamicAndStaticSync': {
      syncFnDeps: ['sync'],
      procedure: function (constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        if (syncFnDeps.get('sync')() === 1) {
          return dynamicArgs.get(0) + dynamicArgs.get(1);
        }
      }
    },

    'recursiveSync': {
      syncFnDeps: ['recursiveSync'],
      procedure: function (constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        if (dynamicArgs.get(0)) {
          return 1;
        } else {
          return syncFnDeps.get('recursiveSync')(true);
        }
      }
    },

  },
  'asyncFn': {

    'emptyAsync': {},

    'async': {
      procedure: function (done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        setTimeout(function() {
          done(1);
        }, 0);
        return 0;
      }
    },

    'asyncProgress': {
      procedure: function (done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        setTimeout(function() {
          progress(0.5);
          setTimeout(function () {
            done(1);
          }, 0);
        }, 0);
        return 0;
      }
    },

    'asyncDepSync0': {
      syncFnDeps: ['sync'],
      procedure: function (done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        return done(syncFnDeps.get('sync')());
      }
    },

    'asyncDepSync1': {
      syncFnDeps: ['sync'],
      procedure: function (done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        var ret = syncFnDeps.get('sync')();
        progress(0.5);
        done(ret);
        progress('should ignore this');
        return 'should ignore this';
      }
    },

    'asyncDepAsync0': {
      asyncFnDeps: ['asyncProgress'],
      procedure: function (done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        asyncFnDeps.get('asyncProgress').asPromise().then(function (depDone) {
            done(depDone);
          });
        return 0.5;
      }
    },

    'asyncDepAsync1': {
      asyncFnDeps: ['asyncProgress'],
      procedure: function (done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        return asyncFnDeps.get('asyncProgress').withCallbacks(function (depDone) {
            done(depDone);
          }, function (depProg) {
            progress(depProg);
          });
      }
    },

    'asyncDepAsyncMultiCall0': {
      asyncFnDeps: ['asyncProgress'],
      procedure: function (done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        var dep = asyncFnDeps.get('asyncProgress');
        Promise.join(dep.asPromise(), dep.asPromise(), function (depDone1, depDone2) {
          if (depDone1 && depDone2) {
            done(1);
          }
        });
        return 0.5;
      }
    },

    'asyncDepAsyncMultiCall1': {
      asyncFnDeps: ['asyncProgress'],
      procedure: function (done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        var progValue = 0;
        var doneCount = 0;
        var getProgValue = function () {
          return progValue += 1;
        };
        var onDone = function (depDone) {
          if (++doneCount === 2) {
            done(6);
          }
        };
        var onProgress = function (depProg) {
          progress(getProgValue());
        };
        var dep = asyncFnDeps.get('asyncProgress');
        window.setTimeout(function () {
          dep.withCallbacks(onDone, onProgress);
          dep.withCallbacks(onDone, onProgress);
        });
        return getProgValue();
      }
    },

    'multiDep0': {
      syncFnDeps: ['sync'],
      asyncFnDeps: ['async'],
      procedure: function (done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        asyncFnDeps.get('async').asPromise().then(function (depVal) {
          done({
            syncVal: syncFnDeps.get('sync')(),
            asyncVal: depVal
          });
        });
      }
    },

    'multiDep1': {
      syncFnDeps: ['sync'],
      asyncFnDeps: ['asyncProgress'],
      procedure: function (done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        var syncVal = syncFnDeps.get('sync')();
        return {
          syncVal: syncVal,
          asyncVal: asyncFnDeps.get('asyncProgress').withCallbacks(function (depDone) {
              done({
                syncVal: syncVal,
                asyncVal: depDone
              });
            }, function (depProg) {
              progress({
                syncVal: syncVal,
                asyncVal: depProg
              });
            })
        };
      }
    },

    'nestedDep': {
      asyncFnDeps: ['asyncDepAsync0'],
      procedure: function (done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        return asyncFnDeps.get('asyncDepAsync0').withCallbacks(function (depDone) {
            done(depDone);
          }, function (depProg) {
            progress(depProg);
          });
      }
    },

    'dynamicAsync': {
      procedure: function (done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        setTimeout(function() {
          done(dynamicArgs.get(0) + dynamicArgs.get(1));
        }, 0);
        return 0;
      }
    },

    'dynamicAndStaticAsync': {
      asyncFnDeps: ['asyncProgress'],
      procedure: function (done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        // return'ing progress() is redundant, but should work
        return progress(asyncFnDeps.get('asyncProgress').withCallbacks(function (depDone) {
          if (depDone === 1) {
            done(dynamicArgs.get(0));
          }
        }, function (depProg) {
          progress(depProg);
        }));
      }
    },

    'recursiveAsync0': {
      asyncFnDeps: ['recursiveAsync0'],
      procedure: function (done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        if (dynamicArgs.get(0)) {
          done(0.5);
        } else {
          asyncFnDeps.get('recursiveAsync0').asPromise(true).then(function (depDone) {
            done(depDone + 0.5);
          });
        }
      }
    },

    'recursiveAsync1': {
      asyncFnDeps: ['recursiveAsync1'],
      procedure: function (done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        if (dynamicArgs.get(0)) {
          progress(0.25);
          done(0.5);
        } else {
          return asyncFnDeps.get('recursiveAsync1').withCallbacks(function (depDone) {
            progress(depDone);
            progress(0.75);
            done(1);
          }, function (depProg) {
            progress(depProg);
          }, Immutable.List.of(true));
        }
        return 0;
      }
    }

  }
};

});