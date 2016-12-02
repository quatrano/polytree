define([
  'lodash',
  'immutable',

  'polytree/common',
  'polytree/record_classes'
], function (_, Immutable,
             common, RC) {

// Special functions
//   These are special functions which will be used by tests and production applications

'use strict';

var fns = {

  // input functions
  'coalescentInputFn': {
    value: {
      syncFnDeps: [],
      asyncFnDeps: [],
      procedure: function (constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        var dataNodeState = dynamicArgs.get(0);
        var staticDependencies = dynamicArgs.get(1);
        var depType = dynamicArgs.get(2); // 'dataNode' || 'inputNode'
        var depId = dynamicArgs.get(3);
        var depState = dynamicArgs.get(4);

        if (depType === 'inputNode' || depType === 'dataNode') {

          var work = dataNodeState.workQueue.get(0);
          if (!work) work = new Immutable.Map();
          work = work.setIn([depType, depId], depState);

          // TOOD: cancelWorkInProgress here? 
          return dataNodeState.set('workQueue', Immutable.List.of(work));
        }
      }
    }
  },
  'preservativeInputFn': {
    value: {
      syncFnDeps: [],
      asyncFnDeps: [],
      procedure: function (constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        var dataNodeState = dynamicArgs.get(0);
        var staticDependencies = dynamicArgs.get(1);
        var depType = dynamicArgs.get(2); // 'dataNode' || 'inputNode'
        var depId = dynamicArgs.get(3);
        var depState = dynamicArgs.get(4);

        // add this value to the work queue
        var workQueue = dataNodeState.workQueue;
        var entry = workQueue.findEntry(function (work) {
          return (!work.has(depType) || !work.get(depType).has(depId));
        });
        if (!entry) entry = [workQueue.size, new Immutable.Map()];
        entry[1] = entry[1].setIn([depType, depId], depState);
        workQueue = workQueue.set(entry[0], entry[1]);

        return dataNodeState.set('workQueue', workQueue);
      }
    }
  },

  // do work functions
  'coalescentDoWorkFn': {
    value: {
      syncFnDeps: [],
      asyncFnDeps: [],
      procedure: function (constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        var dataNodeState = dynamicArgs.get(0);
        var staticDependencies = dynamicArgs.get(1);
        var computeArgMappings = dynamicArgs.get(2);
        var compute = dynamicArgs.get(3);
        var asyncMutateDataNodeState = dynamicArgs.get(4);

        // when a data node depends on only constants, it may have depChanged = true, but no work in the work queue
        if (dataNodeState.workQueue.size > 0 || dataNodeState.dirty.depChanged) {
          var isSync = true;
          var isDone = false;
          var work = computeArgMappings.map(function (mapping, index) {
            switch (mapping.get(0)) {
              case 'syncFn':
              case 'asyncFn':
              case 'constant':
                return staticDependencies.getIn(mapping);
                // break;
              case 'literal':
                return mapping.get(1);
              case 'special':
                return dataNodeState.getIn(mapping.slice(1));
                // break;
              default:
                if (!dataNodeState.workQueue.size) {
                  return null; // TODO: return undefined here?
                } else if (dataNodeState.workQueue.get(0).hasIn(mapping.slice(0, 2))) {
                  return dataNodeState.workQueue.get(0).getIn(mapping);
                } else if (dataNodeState.workInProgress) {
                  return dataNodeState.workInProgress.get(index);
                } else if (dataNodeState.workDone) {
                  return dataNodeState.workDone.get(index);
                } else {
                  return null; // TODO: return undefined here?
                }
                // break;
            }
          });

          if (dataNodeState.workInProgress) {
            dataNodeState.cancelWorkInProgress();
          }

          var done = function (doneValue) {
            if (!isDone) {
              isDone = true;

              var mutateFn = function (dataNodeState) {
                if (!_.isUndefined(doneValue)) {
                  var workDone = dataNodeState.workInProgress;
                  dataNodeState = dataNodeState.remove('workInProgress');
                  dataNodeState = dataNodeState.remove('cancelWorkInProgress');
                  dataNodeState = dataNodeState.remove('progress');
                  dataNodeState = dataNodeState.set('value', doneValue);
                  dataNodeState = dataNodeState.set('workDone', workDone);
                } else {
                  if (isSync) {
                    dataNodeState = undefined;
                  } else {
                    dataNodeState = dataNodeState.remove('workInProgress');
                    dataNodeState = dataNodeState.remove('cancelWorkInProgress');
                    dataNodeState = dataNodeState.remove('progress');
                  }
                }
                return dataNodeState;
              };
              
              if (isSync) {
                dataNodeState = mutateFn(dataNodeState);
              } else {
                asyncMutateDataNodeState(mutateFn);
              }
            }
            return doneValue;
          };

          var progress = function (progressValue) {
            if (!isDone) {
              var mutateFn = function function_name (dataNodeState) {
                return dataNodeState.set('progress', progressValue);
              };
              if (isSync) {
                dataNodeState = mutateFn(dataNodeState);
              } else {
                asyncMutateDataNodeState(mutateFn);
              }
            }
            return progressValue;
          };

          dataNodeState = dataNodeState.set('workQueue', new Immutable.List());
          dataNodeState = dataNodeState.set('workInProgress', work);
          dataNodeState = dataNodeState.set('cancelWorkInProgress', function () {

            // TODO: clean this up; can cancel ever be called in an async context?
            // if (!isSync) {
            //   done(undefined);
            // } else {
              isDone = true;
            // }
          });
          compute.withCallbacks(done, progress, work);

          isSync = false;
          return dataNodeState;
        }
      }
    }
  },
  'preservativeDoWorkFn': {
    value: {
      syncFnDeps: [],
      asyncFnDeps: [],
      procedure: function (constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        var dataNodeState = dynamicArgs.get(0);
        var staticDependencies = dynamicArgs.get(1);
        var computeArgMappings = dynamicArgs.get(2);
        var compute = dynamicArgs.get(3);
        var asyncMutateDataNodeState = dynamicArgs.get(4);

        // when a data node depends on only constants, it may have depChanged = true, but no work in the work queue
        if (!dataNodeState.workInProgress && (dataNodeState.workQueue.size > 0 || dataNodeState.dirty.depChanged)) {
          var isSync = true;
          var isDone = false;

          var getListOfStatesFor = function (mapping, index) {
            // dataNodeState.getIn(Immutable.List.of('workQueue', 0).concat(mapping));
            var ret = dataNodeState.workQueue.filter(function (queuedWork) {
              return queuedWork.hasIn(mapping);
            }).map(function (queuedWork) {
              return queuedWork.getIn(mapping);
            });

            // TODO: give the user another way to get the workDone value; don't put it here
              // because in the common case it's annoying to have to slice off those values
            // push the last value of the previous set
            // TODO: take value off work in progress?
            if (dataNodeState.workDone && dataNodeState.workDone.get(index)) {
              ret = ret.unshift(dataNodeState.workDone.get(index).last());
            } else {

              // if there is no previous value, push null
              ret = ret.unshift(null);  // TODO: push undefined instead?
            }
            return ret;
          };

          var work = computeArgMappings.map(function (mapping, index) {
            switch (mapping.get(0)) {
              case 'syncFn':
              case 'asyncFn':
              case 'constant':
                return staticDependencies.getIn(mapping);
                // break;
              case 'literal':
                return mapping.get(1);
              case 'special':
                return dataNodeState.getIn(mapping.slice(1));
                // break;
              default:
                return getListOfStatesFor(mapping, index);
                // break;
            }
          });

          var done = function (doneValue) {
            if (!isDone) {
              isDone = true;

              var mutateFn = function (dataNodeState) {
                if (!_.isUndefined(doneValue)) {
                  var workDone = dataNodeState.workInProgress;
                  dataNodeState = dataNodeState.remove('workInProgress');
                  dataNodeState = dataNodeState.remove('cancelWorkInProgress');
                  dataNodeState = dataNodeState.remove('progress');
                  dataNodeState = dataNodeState.set('value', doneValue);
                  dataNodeState = dataNodeState.set('workDone', workDone);
                } else {
                  dataNodeState = dataNodeState.remove('workInProgress');
                  dataNodeState = dataNodeState.remove('cancelWorkInProgress');
                  dataNodeState = dataNodeState.remove('progress');
                }
                return dataNodeState;
              };

              if (isSync) {
                dataNodeState = mutateFn(dataNodeState);
              } else {
                asyncMutateDataNodeState(mutateFn);
              }
            }
            return doneValue;
          };

          var progress = function (progressValue) {
            if (!isDone) {
              var mutateFn = function (dataNodeState) {
                return dataNodeState.set('progress', progressValue);
              };
              if (isSync) {
                dataNodeState = mutateFn(dataNodeState);
              } else {
                asyncMutateDataNodeState(mutateFn);
              }
            }
            return progressValue;
          };

          dataNodeState = dataNodeState.set('workQueue', new Immutable.List());
          dataNodeState = dataNodeState.set('workInProgress', work);
          dataNodeState = dataNodeState.set('cancelWorkInProgress', function () {

            // TODO: clean this up; can cancel ever be called in an async context?
            // if (!isSync) {
            //   done(undefined);
            // } else {
              isDone = true;
            // }
          });
          compute.withCallbacks(done, progress, work);

          isSync = false;
          return dataNodeState;
        }
      }
    }
  }
};

var SpecialFunctions = Object.create(null, fns);
return SpecialFunctions;

});