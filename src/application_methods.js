define([
  'lodash',
  'immutable',

  'polytree/common',
  'polytree/record_classes',
  'polytree/application_schema'
], function (_, Immutable,
             common, RC, schema) {

// Application Methods
//   This is a stateless utility with methods for applications.
//   Functions that don't take an application or part of an application as an argument should go elsewhere.
//   In the future this will be split into many groups of methods; one for each loop.
//   All top-level methods take the application as the first argument 
//     and they return a new application.
//   Lower level methods may take parts of an application and return a new version of that part.
//     todo: factor these out?

'use strict';

var utilities = common.utilities;
var constants = common.constants;
var thingTypes = constants.thingTypes;

var AM = {
  getDataNodeConfig: function (application, dataNodeId) {
    return application.config.original.dataNode.get(dataNodeId);
  },

  getDataNodeState: function (application, dataNodeId) {
    return application.state.dataNode.get(dataNodeId);
  },

  getConstant: function (context, constantId) {
    var constantConfig = context.config.original.constant.get(constantId);
    return constantConfig;
  },
  getConstants: function (context, constantIds) {
    return Immutable.Map(constantIds.map(function (constantId) {
      return [constantId, AM.getConstant(context, constantId)];
    }));
  },

  // OPTIMIZATION: cache functions in this.state.functions
  getAsyncFunction: function (context, functionId) {
    var fnConfig = context.getIn(['config', 'original', 'asyncFn', functionId]);
    return AM.constructAsyncInjectable(context, fnConfig);
  },
  getAsyncFunctions: function (context, functionIds) {
    var ctx = this;
    return Immutable.Map(functionIds.map(function (functionId) {
      return [functionId, AM.getAsyncFunction(context, functionId)];
    }));
  },

  // OPTIMIZATION: cache functions in this.state.functions
  getSyncFunction: function (application, functionId) {
    var fnConfig = application.get('config').get('original').get('syncFn').get(functionId);
    return AM.constructSyncInjectable(application, fnConfig);
  },
  getSyncFunctions: function (context, functionIds) {
    return Immutable.Map(functionIds.map(function (functionId) {
      return [functionId, AM.getSyncFunction(context, functionId)];
    }));
  },

  getInputNodeState: function (application, inputNodeId) {
    return application.state.inputNode.get(inputNodeId);
  },
  getInputNodeStates: function (application, inputNodeIds) {
    return new Immutable.Map(inputNodeIds.map(function (inputNodeId) {
        return [inputNodeId, AM.getInputNodeState(application, inputNodeId)];
      }));
  },

  getViewNodeConfig: function (application, viewNodeId) {
    return application.config.original.viewNode.get(viewNodeId);
  },

  execute: function (methodId) {
    var api = this.getApi(methodId);
    console.log(this.config);
  },

  constructAsyncInjectable: function (application, config) {

    // OPTIMIZATION: cache deps in the closure so they aren't fetched for every call
    // var syncFnDeps, asyncFnDeps;
    return new RC.AsyncInjectable({
      asPromise: function () {
        var constantDeps = AM.getConstants(application, config.get('constantDeps'));
        var syncFnDeps = AM.getSyncFunctions(application, config.get('syncFnDeps'));
        var asyncFnDeps = AM.getAsyncFunctions(application, config.get('asyncFnDeps'));
        var dynamicArgs = Immutable.List(arguments);
        return new Promise(function (resolve) {
          config.get('procedure').call(null, resolve, _.noop, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs);
        });
      },
      withCallbacks: function (onDone, onProgress, dynamicArgs) {
        var constantDeps = AM.getConstants(application, config.get('constantDeps'));
        var syncFnDeps = AM.getSyncFunctions(application, config.get('syncFnDeps'));
        var asyncFnDeps = AM.getAsyncFunctions(application, config.get('asyncFnDeps'));
        if (!dynamicArgs) {
          dynamicArgs = Immutable.List();
        }

        var doneCalled = false;
        var doneValue;
        var progressCalled = false;

        var done = function (doneVal) {

          // done may only be called once
          if (!doneCalled) {
            doneCalled = true;
            doneValue = doneVal;
            onDone(doneVal);
          }
          return doneVal;
        };
        
        var progress = function (progressVal) {

          // progress may not be called after done
          if (!doneCalled) {
            progressCalled = true;
            onProgress(progressVal);
          }
          return progressVal;
        };

        var ret = config.get('procedure').call(null, done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs);

        if (doneCalled) {

          // if done has been called
          // return doneValue
          return doneValue;

        } else if (progressCalled) {

          // if progress was called syncronously
          // return ret, don't call progress again
          return ret;

        } else if (!progressCalled) {

          // if neither done nor progress have been called
          // call progress with ret, and return ret
          return progress(ret);
        }
      }
    });
  },

  constructSyncInjectable: function (application, config) {

    // OPTIMIZATION: cache deps in the closure so they aren't fetched for every call
    // var syncFnDeps, asyncFnDeps;
    return function () {
      var constantDeps = AM.getConstants(application, config.get('constantDeps'));
      var syncFnDeps = AM.getSyncFunctions(application, config.get('syncFnDeps'));
      var asyncFnDeps = AM.getAsyncFunctions(application, config.get('asyncFnDeps'));
      var dynamicArgs = Immutable.List(arguments);
      return config.get('procedure').apply(null, [constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs]);
    };
  },

  constructDataNodeSnapshotFromState: function (application, dataNodeId) {
    var dataNodeState = AM.getDataNodeState(application, dataNodeId);
    var dataNodeSnapshot = schema.deserializeObject({
      'value': dataNodeState.value,
      'isWorking': !_.isUndefined(dataNodeState.workInProgress),
      'workQueueSize': dataNodeState.workQueue.size,
      'progress': dataNodeState.progress
    }, 'data_node_snapshot');
    return application.setIn(['state', 'dataNodeSnapshot', dataNodeId], dataNodeSnapshot);
  },

  computeViewChanges: function (application) {
    // identify which view nodes are entering, persisting, or exiting
    // for all entering, persisting and exiting nodes, compute their attributes
  },

  getConstantDependencies: function (application, dataNodeId) {
    var dataNodeConfig = AM.getDataNodeConfig(application, dataNodeId);

    // TODO: merge with derived deps
    return new RC.StaticDeps({
      'constant': AM.getConstants(application, dataNodeConfig.constantDeps),
      'syncFn': AM.getSyncFunctions(application, dataNodeConfig.syncFnDeps),
      'asyncFn': AM.getAsyncFunctions(application, dataNodeConfig.asyncFnDeps)
    });
    // OPTIMIZATION cache this on the data node state
  },

  constructDoWorkArgs: function (application, dataNodeId, asyncMutateDataNodeState) {
    var dataNodeState = AM.getDataNodeState(application, dataNodeId);
    var constantDependencies = AM.getConstantDependencies(application, dataNodeId);
    var dataNodeConfig = AM.getDataNodeConfig(application, dataNodeId);
    var computeArgMappings = dataNodeConfig.computeArgMappings;
    var compute = AM.getAsyncFunction(application, dataNodeConfig.computeFn);

    var asyncMutateThisDataNodeState = function (mutateFn) {
      asyncMutateDataNodeState(dataNodeId, mutateFn);
    };
    return [dataNodeState, constantDependencies, computeArgMappings, compute, asyncMutateThisDataNodeState];
  },

  // some other node thinks this data node might be dirty
  updateDataNode: function (application, dataNodeId, asyncMutateDataNodeState) {
    var dataNodeState = AM.getDataNodeState(application, dataNodeId);

    // update all dirty deps
    // the followind line throws an error if something depends on a non-existent data node
    while (dataNodeState.dirty.depDirty.size) {
      application = AM.updateDataNode(application, dataNodeState.dirty.depDirty.first(), asyncMutateDataNodeState);
      dataNodeState = AM.getDataNodeState(application, dataNodeId);
    }

    if (dataNodeState.dirty.depChanged) {
      // switch dataNodeState.dirty.depChanged to false

      var dataNodeConfig = AM.getDataNodeConfig(application, dataNodeId);
      var doWork = AM.getSyncFunction(application, dataNodeConfig.doWorkFn);
      var doWorkArgs = AM.constructDoWorkArgs(application, dataNodeId, asyncMutateDataNodeState);
      dataNodeState = doWork.apply(null, doWorkArgs);
      if (dataNodeState) {

        // this data node has changed
        application = AM.setDataNodeState(application, dataNodeId, dataNodeState);
      } else {

        // this dataNode has not changed
        // leave it on children dirty list and don't set depChanged to false
        application = AM.constructDataNodeSnapshotFromState(application, dataNodeId);
      }
    } else if (!application.state.dataNodeSnapshot.has(dataNodeId)) {
      application = AM.constructDataNodeSnapshotFromState(application, dataNodeId);
    }

    // this node should either have changed or it is clean
    // so mark depChanged to false
    application = application.setIn(['state', 'dataNode', dataNodeId, 'dirty', 'depChanged'], false);
    // and no child should think this node is dirty
    application = AM.markDescendentsClean(application, dataNodeId);
    // this function removes this node from the dirty list, but doesn't affect depChanged

    return application;
  },

  // including the requested dataNodeId and all ancestor data nodes
  // asyncMutateDataNodeState are used in callbacks when dataNodeStates change asynchronously
  ensureDataNodeSnapshot: function (application, dataNodeId, asyncMutateDataNodeState) {

    // TODO: should it always update the data node? or check if its dirty?
    application = AM.updateDataNode(application, dataNodeId, asyncMutateDataNodeState);
    return application;
  },
  ensureDataNodeSnapshots: function (application, dataNodeIds, asyncMutateDataNodeState) {
    dataNodeIds.forEach(function (dataNodeId) {
      application = AM.ensureDataNodeSnapshot(application, dataNodeId, asyncMutateDataNodeState);
    });
    return application;
  },

  // always ensure the existence of a snapshot before getting it
  getDataNodeSnapshot: function (application, dataNodeId) {
    return application.state.dataNodeSnapshot.get(dataNodeId);
  },
  getDataNodeSnapshots: function (application, dataNodeIds, asyncMutateDataNodeState) {
    return Immutable.Map(dataNodeIds.map(function (dataNodeId) {
      return [dataNodeId, AM.getDataNodeSnapshot(application, dataNodeId)];
    }));
  },

  // removeDataNodeSnapshotAndDescendents: function (application, dataNodeId) {
  //   if (application.state.dataNodeSnapshot.has(dataNodeId)) {
  //     var newDataNodeSnapshots = application.state.dataNodeSnapshot.remove(dataNodeId);
  //     application = application.setIn(['state', 'dataNodeSnapshot'], newDataNodeSnapshots);
  //   }

  //   var derivedDataNodeConfig = application.config.derived.dataNode.get(dataNodeId);

  //   // remove snapshots of all 'in' deps
  //   derivedDataNodeConfig.dep.in.dataNode.forEach(function (depId) {
  //     application = AM.removeDataNodeSnapshotAndDescendents(application, depId);
  //   });

  //   // mark view node 'in' deps to reinstantiate
  //   derivedDataNodeConfig.dep.in.viewNode.forEach(function (depId) {
  //     application = AM.viewNodeInput(application, depId, 'dataNode', dataNodeId, undefined);
  //   });
 
  //   return application;
  // },

  markDescendentsClean: function (application, dataNodeId) {
    var derivedDataNodeConfig = application.config.derived.dataNode.get(dataNodeId);
    var depState;
    derivedDataNodeConfig.dep.in.dataNode.forEach(function (depId) {
      depState = AM.getDataNodeState(application, depId);
      depState = depState.updateIn(['dirty', 'depDirty'], function (set) {
        return set.remove(dataNodeId);
      });
      application = application.setIn(['state', 'dataNode', depId], depState);

      // if this node is now completely clean, mark all descendents clean
      if (!depState.dirty.depChanged && depState.dirty.depDirty.size === 0) {
        application = AM.markDescendentsClean(application, depId);
      }
    });

    // mark view node dependents clean
    derivedDataNodeConfig.dep.in.viewNode.forEach(function (depId) {
      application.state.dom.forEach(function (domState, domId) {
        application = application.updateIn(['state', 'dom', domId, 'viewNode', depId, 'dirty', 'depDirty'], function (set) {
          return set.remove(dataNodeId);
        });
      });
    });
    return application;
  },

  markDescendentsDirty: function (application, dataNodeId) {
    var derivedDataNodeConfig = application.config.derived.dataNode.get(dataNodeId);
    derivedDataNodeConfig.dep.in.dataNode.forEach(function (depId) {
      application = application.updateIn(['state', 'dataNode', depId, 'dirty', 'depDirty'], function (set) {
        return set.add(dataNodeId);
      });
      application = AM.markDescendentsDirty(application, depId);
    });    
    derivedDataNodeConfig.dep.in.viewNode.forEach(function (depId) {
      application = application.updateIn(['state', 'dom'], function (domStates) {
        return domStates.map(function (domState) {
          return domState.updateIn(['viewNode', depId, 'dirty', 'depDirty'], function (set) {
            return set.add(dataNodeId);
          });
        });
      });
    });
    return application;
  },

  dataNodeInput: function (application, dataNodeId, inputType, inputNodeId, newValue) {
    var dataNodeState = AM.getDataNodeState(application, dataNodeId);
    var staticDependencies = AM.getConstantDependencies(application, dataNodeId);
    var dataNodeConfig = AM.getDataNodeConfig(application, dataNodeId);
    var input = AM.getSyncFunction(application, dataNodeConfig.inputFn);
    var inputArgs = [dataNodeState, staticDependencies, inputType, inputNodeId, newValue];
    dataNodeState = input.apply(null, inputArgs);
    if (dataNodeState) {
      dataNodeState = dataNodeState.setIn(['dirty', 'depChanged'], true);
      application = application.setIn(['state', 'dataNode', dataNodeId], dataNodeState);
      application = AM.markDescendentsDirty(application, dataNodeId);
    } else {
      // TODO: remove this from the dirty set?
    }
    return application;
  },

  // saves data node state
  // updates snapshot
  // sends input to all children
  setDataNodeState: function (application, dataNodeId, dataNodeState) {
    var dataNodeConfig = AM.getDataNodeConfig(application, dataNodeId);
    application = application.setIn(['state', 'dataNode', dataNodeId], dataNodeState);
    application = AM.constructDataNodeSnapshotFromState(application, dataNodeId);
    var dataNodeSnapshot = AM.getDataNodeSnapshot(application, dataNodeId);
    var derivedDataNodeConfig = application.config.derived.dataNode.get(dataNodeId);
    derivedDataNodeConfig.dep.in.dataNode.forEach(function (depId) {
      application = AM.dataNodeInput(application, depId, 'dataNode', dataNodeId, dataNodeSnapshot);
    });    
    derivedDataNodeConfig.dep.in.viewNode.forEach(function (viewNodeId) {
      application = AM.viewNodeInput(application, viewNodeId, 'dataNode', dataNodeId, dataNodeSnapshot);
    });
    return application;
  },
  setInputNodeValue: function (application, inputNodeId, newValue) {
    var derivedInputNodeConfig = application.config.derived.inputNode.get(inputNodeId);
    application = application.setIn(['state', 'inputNode', inputNodeId, 'value'], newValue);
    var newState = application.getIn(['state', 'inputNode', inputNodeId]);

    derivedInputNodeConfig.dep.dataNode.forEach(function (dataNodeId) {
      application = AM.dataNodeInput(application, dataNodeId, 'inputNode', inputNodeId, newState);
    });
    derivedInputNodeConfig.dep.viewNode.forEach(function (viewNodeId) {
      application = AM.viewNodeInput(application, viewNodeId, 'inputNode', inputNodeId, newState);
    });
    return application;
  },

  // TODO: this doesn't actually use srcNodeValue
  //   this is good in the case that a data node snapshot is removed, because srcNodeValue is undefined
  //   this is bad in that it breaks the pattern.. clean that up somehow
  viewNodeInput: function (application, viewNodeId, srcNodeType, srcNodeId, srcNodeValue) {
    var viewNodeConfig = application.config.original.viewNode.get(viewNodeId);
    var derivedViewNodeConfig = application.config.derived.viewNode.get(viewNodeId);

    // get the mappings relevant to this src node
    var relevantMappings = derivedViewNodeConfig.dep.out[srcNodeType].get(srcNodeId);

    // this src node affects instantiation
    if (relevantMappings.get('existence')) {

      // filter to doms where 
        // the node is not already marked as "toReinstantiate" 
        // and there are parent instances
      var parent = viewNodeConfig.parent;
      var domWithParentInstances = application.state.dom.filter(function (domState, domId) {
        return (!domState.viewNode.get(viewNodeId).toReinstantiate && 
          domState.viewNode.get(parent).instanceLookup.size);
      });
      domWithParentInstances.forEach(function (domState, domId) {
        application = application.setIn(['state', 'dom', domId, 'viewNode', viewNodeId, 'toReinstantiate'], true);
      });
    }

    // this srcNode affects update attributes
    if (relevantMappings.get('update')) {

      // filter to doms where
        // there are instances of the node
      var domWithInstances = application.state.dom.filter(function (domState, domId) {
        return (domState.viewNode.get(viewNodeId).instanceLookup.size);
      });
      domWithInstances.forEach(function (domState, domId) {
        application = application.updateIn(['state', 'dom', domId, 'viewNode', viewNodeId, 'dirty', 'depChanged', srcNodeType], function (set) {
          return set.add(srcNodeId);
        });
      });
    }
    return application;
  },

  setChildrenToReinstantiate: function (application, domId, viewNodeId) {
    var derivedViewNodeConfig = application.config.derived.viewNode.get(viewNodeId);
    derivedViewNodeConfig.children.forEach(function (childId) {
      application = application.setIn(['state', 'dom', domId, 'viewNode', childId, 'toReinstantiate'], true);
    });
    return application;
  },

  // TODO: only call this for instance-level paths
  // TODO: make this fn small and inline it?
  // TODO: add index%2 functionality here? eg: to implement even/odd styles
  // TODO: make this recursive
    // replace all arrays (nested or otherwise) that start with 'id' or 'index'
  dereferencePath: function (viewNodeId, viewNodeInstanceState, instanceId, path) {

    var instanceLookup = viewNodeInstanceState.instanceLookup.get(instanceId);
    var dereferenceValue = function (value) {
      if (value.get(1) === viewNodeId) { // getting a value from this raisonDetre
        return instanceLookup.raisonDetre.get(value.get(0));
      } else { // getting a value from provenance
        return instanceLookup.provenance.get(value.get(1)).get(value.get(0));
      }
    };
    var pathType = path.get(0);
    if (pathType === 'id' || pathType === 'index') {
      return dereferenceValue(path);
    } else {
      return path.map(function (value, index) {
        if (Immutable.List.isList(value)) {
          return dereferenceValue(value);
        } else {
          return value;
        }
      });
    }
  },

  ensurePathValue: function (application, asyncMutateDataNodeState, pathSeq) {
    var objectType = pathSeq.get(0);
    if (objectType === 'literal' || objectType === 'constant' || objectType === 'inputNode' || objectType === 'id' || objectType === 'index') {
      return application;
    } else if (objectType === 'dataNode') {
      return AM.ensureDataNodeSnapshot(application, pathSeq.get(1), asyncMutateDataNodeState);
    } else {
      console.log('error');
    }
  },

  getPathValue1: function (application, viewNodeId, viewNodeInstanceState, instanceId, path) {
    var objectType = path.get(0);
    var reducer = function (reduction, key) {
      if (_.isUndefined(reduction) || _.isUndefined(key)) return reduction;

      if (Immutable.List.isList(key)) {
        key = AM.getPathValue1(application, viewNodeId, viewNodeInstanceState, instanceId, key);
      }

      // TODO: implement this better; simplify, optimize based on allowed types
        // maybe ask immutable.js to implement 'has()' on records
      if (_.isFunction(reduction.has) && reduction.has(key)) { // this handles lists and maps
        return reduction.get(key);
      } else if (reduction.hasOwnProperty(key) || key in reduction) { // this handles pojos and records
        return reduction[key];
      } else if (_.isFunction(reduction.has) && reduction.has('_')) { // this handles lists and maps
        return reduction.get('_');
      } else if (reduction.hasOwnProperty('_') || '_' in reduction) { // this handles pojos and records
        return reduction._;
      }
    };

    if (objectType === 'literal') {
      return path.get(1);
    } else if (objectType === 'constant') {
      return path.slice(2).reduce(reducer, application.config.original.constant.get(path.get(1)));
    } else if (objectType === 'inputNode') {
      return path.slice(2).reduce(reducer, application.state.inputNode.get(path.get(1)));
    } else if (objectType === 'dataNode') {
      return path.slice(2).reduce(reducer, application.state.dataNodeSnapshot.get(path.get(1)));
    } else if (objectType === 'id' || objectType === 'index') {
      var instanceLookup = viewNodeInstanceState.instanceLookup.get(instanceId);
      if (path.get(1) === viewNodeId) { // getting a value from this raisonDetre
        return instanceLookup.raisonDetre.get(objectType);
      } else { // getting a value from provenance
        return instanceLookup.provenance.get(path.get(1)).get(objectType);
      }
    }
  },

  // TODO: handle fn? eg if it's a function, run it on the remaining path parts? no
  getPathValue: function (application, pathSeq, dereferencedPathSeq) {
    var objectType = pathSeq.get(0);
    var objectId = pathSeq.get(1);
    var reducer = function (reduction, value) {
      if (_.isUndefined(reduction)) return reduction;

      // TODO: implement this better; simplify, optimize based on allowed types
        // maybe ask immutable.js to implement 'has()' on records
      if (_.isFunction(reduction.has) && reduction.has(value)) { // this handles lists and maps
        return reduction.get(value);
      } else if (reduction.hasOwnProperty(value) || value in reduction) { // this handles pojos and records
        return reduction[value];
      } else if (_.isFunction(reduction.has) && reduction.has('_')) { // this handles lists and maps
        return reduction.get('_');
      } else if (reduction.hasOwnProperty('_') || '_' in reduction) { // this handles pojos and records
        return reduction._;
      }
    };
    if (objectType === 'literal') {
      return objectId;
    } else if (objectType === 'constant') {
      return dereferencedPathSeq.slice(2).reduce(reducer, application.config.original.constant.get(objectId));
    } else if (objectType === 'inputNode') {
      return dereferencedPathSeq.slice(2).reduce(reducer, application.state.inputNode.get(objectId));
    } else if (objectType === 'dataNode') {
      return dereferencedPathSeq.slice(2).reduce(reducer, application.state.dataNodeSnapshot.get(objectId));
    } else if (objectType === 'id' || objectType === 'index') {
      return dereferencedPathSeq;
    }
  },

  addAttributesToUpdateDomMessage: function (application, domId, viewNodeId, instanceId, attributes, dereferencedEventBindings) {
    return application.updateIn(['state', 'dom', domId, 'updateDomMessage', 'attributes', instanceId], new Immutable.Map(), function (map) {
      return map.withMutations(function (mutableMap) {
        attributes.forEach(function (attribute) {
          if (Immutable.Map.isMap(attribute.get(1))) {
            mutableMap.updateIn(attribute.get(0), new Immutable.Map(), function (map) {
              return map.mergeDeep(attribute.get(1));
            });
          } else {
            mutableMap.setIn(attribute.get(0), attribute.get(1));
          }
        });
        dereferencedEventBindings.forEach(function (dereferencedEventBinding) {
          var phase = dereferencedEventBinding.phase;
          mutableMap.setIn([phase.get(1), 'events', phase.get(2)], schema.deserializeObject({
            'inputNode': dereferencedEventBinding.inputNode,
            'ids': dereferencedEventBinding.ids,
            'data': dereferencedEventBinding.data
          }, 'dereferenced_event_binding_without_phase'));
        });
        mutableMap.set('viewNodeId', viewNodeId);
      });
    });
  },

  refreshViewNode: function (application, domId, viewNodeId, uuidGenerator, asyncMutateDataNodeState) {

    var removeExitedInstances = function (viewNodeState) {
      viewNodeState.exitingInstances.forEach(function (exitedInstanceId) {
        viewNodeState = viewNodeState.removeIn(['instanceLookup', exitedInstanceId]);
      });
      viewNodeState = viewNodeState.remove('exitingInstances');
      return viewNodeState;
    };

    var moveEnteredInstances = function (viewNodeState) {
      var enteringInstances = viewNodeState.get('enteringInstances');
      var persistingWithEntering = viewNodeState.get('persistingInstances').union(enteringInstances);
      viewNodeState = viewNodeState.set('persistingInstances', persistingWithEntering);
      viewNodeState = viewNodeState.remove('enteringInstances');
      return viewNodeState;
    };

    var enterInstance = function (viewNodeId, viewNodeState, parentId, parentState, parentInstanceId, enteringInstanceId, conditionalId, conditionalIndex) {
      viewNodeState = viewNodeState.updateIn(['enteringInstances'], function (set) {
        return set.add(enteringInstanceId);
      });

      // update groupedRaisonDetre
      var path = ['groupedRaisonDetre', parentInstanceId];
      if (conditionalId) {
        path.push(conditionalId);
      }
      viewNodeState = viewNodeState.setIn(path, enteringInstanceId);
      var raisonDetre = schema.deserializeObject({
        id: conditionalId,
        index: conditionalIndex,
        parent: parentInstanceId
      }, 'raison_detre');
      var parentInstanceRaisonDetre = parentState.instanceLookup.get(parentInstanceId).raisonDetre;
      var provenance = parentState.instanceLookup.get(parentInstanceId).provenance;

      // add to the provenance if the parent is a conditional node
      if (parentInstanceRaisonDetre.has('id')) {
        provenance = provenance.set(parentId, parentInstanceRaisonDetre);
      }
      var viewNodeInstanceProperties = schema.deserializeObject({
        'raisonDetre': raisonDetre,
        'provenance': provenance
      }, 'view_node_instance_properties');
      viewNodeState = viewNodeState.setIn(['instanceLookup', enteringInstanceId], viewNodeInstanceProperties);
      return viewNodeState;
    };

    var exitConditional = function (viewNodeState, conditionalId, parentId) {

      // note: calling code will call 'exitParent' if this is the last conditional of the group
      var newGroupedRaisonDetre, newExitingInstances, newPersistingInstances, newUpdatingInstances;
      if (parentId) {

        // only one instance is exiting
        var path = [parentId, conditionalId];
        var exitingInstanceId = viewNodeState.groupedRaisonDetre.getIn(path);
        newGroupedRaisonDetre = viewNodeState.groupedRaisonDetre.removeIn(path);
        newExitingInstances = viewNodeState.exitingInstances.add(exitingInstanceId);
        newPersistingInstances = viewNodeState.persistingInstances.remove(exitingInstanceId);
        newUpdatingInstances = viewNodeState.updatingInstances.remove(exitingInstanceId);
      } else {

        // class-level optimization; remove the conditional instance for each parent
        console.log('TODO: test this; this is a class-level optimization that has not been tested');
        var exitingInstances = [];
        newGroupedRaisonDetre = viewNodeState.groupedRaisonDetre.map(function (conditionalMap, parentId) {
          exitingInstances.push(conditionalMap.get(conditionalId)); // TODO: it's strange to have a side effect inside a map
          return conditionalMap.remove(conditionalId);
        });
        newExitingInstances = viewNodeState.exitingInstances.union(exitingInstances);
        newPersistingInstances = viewNodeState.persistingInstances.subtract(exitingInstances);
        newUpdatingInstances = viewNodeState.updatingInstances.subtract(exitingInstances);
      }
      return viewNodeState.withMutations(function (state) {
        state.set('groupedRaisonDetre', newGroupedRaisonDetre);
        state.set('exitingInstances', newExitingInstances);
        state.set('persistingInstances', newPersistingInstances);
        state.set('updatingInstances', newUpdatingInstances);
      });
    };

    var exitParent = function (viewNodeState, parentId, isConditional) {
      var newExitingInstances, newPersistingInstances, newUpdatingInstances;
      if (isConditional) {

        // conditional; there may be zero or more than one exiting instance
        if (viewNodeState.groupedRaisonDetre.get(parentId)) {
          var exitingInstances = viewNodeState.groupedRaisonDetre.get(parentId).valueSeq();
          newExitingInstances = viewNodeState.exitingInstances.union(exitingInstances);
          newPersistingInstances = viewNodeState.persistingInstances.subtract(exitingInstances);
          newUpdatingInstances = viewNodeState.updatingInstances.subtract(exitingInstances);
        } else {
          return viewNodeState;
        }
      } else {

        // not conditional; only one instance is exiting
        var exitingInstanceId = viewNodeState.groupedRaisonDetre.get(parentId);
        newExitingInstances = viewNodeState.exitingInstances.add(exitingInstanceId);
        newPersistingInstances = viewNodeState.persistingInstances.remove(exitingInstanceId);
        newUpdatingInstances = viewNodeState.updatingInstances.remove(exitingInstanceId);
      }
      return viewNodeState.withMutations(function (state) {
        state.set('groupedRaisonDetre', viewNodeState.groupedRaisonDetre.remove(parentId));
        state.set('exitingInstances', newExitingInstances);
        state.set('persistingInstances', newPersistingInstances);
        state.set('updatingInstances', newUpdatingInstances);
      });
    };

    // OPTIMIZATION: also implement for removing entire groups rather than once instance at a time
    var exitInstance = function (viewNodeState, instanceId) {
      var raisonDetre = viewNodeState.instanceLookup.get(instanceId).raisonDetre;
      if (raisonDetre.id) { // assume ids are never falsy!
        viewNodeState = viewNodeState.removeIn(['groupedRaisonDetre', raisonDetre.parent, raisonDetre.id]);
        if (viewNodeState.groupedRaisonDetre.get(raisonDetre.parent).size === 0) {
          viewNodeState = viewNodeState.removeIn(['groupedRaisonDetre', raisonDetre.parent]);
        }
      } else {
        viewNodeState = viewNodeState.removeIn(['groupedRaisonDetre', raisonDetre.parent]);
      }
      viewNodeState = viewNodeState.updateIn(['persistingInstances'], function (set) {
        return set.remove(exitingInstanceId);
      });
      viewNodeState = viewNodeState.updateIn(['updatingInstances'], function (set) {
        return set.remove(exitingInstanceId);
      });
      viewNodeState = viewNodeState.updateIn(['exitingInstances'], function (set) {
        return set.add(exitingInstanceId);
      });
      // don't remove lookups yet        
      // most lookups are removed in removeExitedInstances
      return viewNodeState;
    };

    // TODO: this fn leaks 'application,' find the right pattern for this
    var getConditionalIds = function (parentId, parentState, parentInstanceId, existenceSeq) {

      // dereference the path wrt parent because existence is special
      var dereferencedPathSeq = AM.dereferencePath(parentId, parentState, parentInstanceId, existenceSeq);
      application = AM.ensurePathValue(application, asyncMutateDataNodeState, existenceSeq);
      var val = AM.getPathValue(application, existenceSeq, dereferencedPathSeq);
      if (Immutable.OrderedSet.isOrderedSet(val)) {
        return val;
      } else {
        return new Immutable.OrderedSet();
      }
    };

    // ordered sets don't have a convenient way to get the index of a member
    var indexConditionalIds = function (conditionalIds) {
      return new Immutable.Map(conditionalIds.toList().map(function (id, index) {
        return [id, index];
      }));
    };

    // assume that the parent is already refreshed
    var viewNodeState = application.getIn(['state', 'dom', domId, 'viewNode', viewNodeId]);
    var viewNodeConfig = application.config.original.viewNode.get(viewNodeId);
    var parentId = viewNodeConfig.parent;
    var parentState = application.state.dom.get(domId).viewNode.get(parentId);
    var derivedViewNodeConfig = application.config.derived.viewNode.get(viewNodeId);
    var reordered = false;

    // TODO: check if we were notified that the index of an ancestor has changed,
      // update it before doing anything
    // TODO: process other input here
    while (viewNodeState.dirty.depDirty.size) {
      application = AM.updateDataNode(application, viewNodeState.dirty.depDirty.first(), asyncMutateDataNodeState);
      viewNodeState = application.getIn(['state', 'dom', domId, 'viewNode', viewNodeId]);
    }

    // update the lists of entering/persisting/exiting instances
    viewNodeState = moveEnteredInstances(viewNodeState);
    viewNodeState = removeExitedInstances(viewNodeState);

    if (viewNodeState.toReinstantiate) { // this node was marked for reinstantiation

      // OPTIMIZATION: also distinguish between class-level and instance-level mapping
        // for class-level existence mapping, don't calculate for every instance

      var isConditional = !!derivedViewNodeConfig.existence;
      if (isConditional) { // conditional

        var existenceSeq = derivedViewNodeConfig.existence.valueSeq();

        // persisting parent instances may result in entering, persisting, exiting or reordering instances
        parentState.persistingInstances.forEach(function (persistingParent) {
          var newConditionalIds = getConditionalIds(parentId, parentState, persistingParent, existenceSeq);

          var oldGroupedRaisonDetre = viewNodeState.groupedRaisonDetre.get(persistingParent, new Immutable.Map());
          // this error on the following line: oldGroupedRaisonDetre.keySeq is not a function(…)
          // is due to a conditionalId being undefined
          var oldConditionalIds = oldGroupedRaisonDetre.keySeq().toSet();
          var newConditionalIdIndex = indexConditionalIds(newConditionalIds);

          var persistingConditionalIds = newConditionalIds.intersect(oldConditionalIds);
          var enteringConditionalIds = newConditionalIds.subtract(oldConditionalIds);
          var exitingConditionalIds = oldConditionalIds.subtract(newConditionalIds);

          exitingConditionalIds.forEach(function (exitingConditionalId) {
            viewNodeState = exitConditional(viewNodeState, exitingConditionalId, persistingParent);
          });

          enteringConditionalIds.forEach(function (enteringConditionalId) {
            var conditionalIndex = newConditionalIdIndex.get(enteringConditionalId);
            var enteringInstanceId = uuidGenerator.next();
            viewNodeState = enterInstance(viewNodeId, viewNodeState, parentId, parentState, persistingParent, enteringInstanceId, enteringConditionalId, conditionalIndex);
          });

          // check if the index has changed for any persisting instance
          persistingConditionalIds.forEach(function (conditionalId) {

            // TODO: there is an error on the following line if a conditionalId is undefined
            var instanceId = viewNodeState.groupedRaisonDetre.get(persistingParent).get(conditionalId);
            var oldIndex = viewNodeState.instanceLookup.get(instanceId).raisonDetre.index;
            var newIndex = newConditionalIdIndex.get(conditionalId);
            if (oldIndex !== newIndex) {
              reordered = true;
              viewNodeState = viewNodeState.setIn(['instanceLookup', instanceId, 'raisonDetre', 'index'], newIndex);
            }
          });
        });
        if (reordered) {
          // necessary?:
          // application = application.setIn(['state', 'dom', domId, 'viewNode', viewNodeId], viewNodeState);
          console.log('TODO: notify descendents that this node has been reordered');
          derivedViewNodeConfig.dep.in.viewNode.forEach(function (depId) {
            application = AM.viewNodeInput(application, depId, 'viewNode', viewNodeId, viewNodeState.persistingInstances);
          });
        }

        // entering parent instances may cause entering instances
        parentState.enteringInstances.forEach(function (enteringParent) {
          var conditionalIds = getConditionalIds(parentId, parentState, enteringParent, existenceSeq);
          var conditionalIdIndex = indexConditionalIds(conditionalIds);
          conditionalIdIndex.forEach(function (conditionalIndex, conditionalId) {
            var enteringInstanceId = uuidGenerator.next();
            viewNodeState = enterInstance(viewNodeId, viewNodeState, parentId, parentState, enteringParent, enteringInstanceId, conditionalId, conditionalIndex);
          });
        });

        // exiting parent instances may cause exiting instances
        parentState.exitingInstances.forEach(function (exitingParent) {
          viewNodeState = exitParent(viewNodeState, exitingParent, isConditional);
        });

      } else { // fixed

        // persisting parent instances cause persisting instances - nothing to do
        // parentState.persistingInstances.forEach(function (persistingParent) {});

        // entering parent instances cause entering instances
        parentState.enteringInstances.forEach(function (enteringParent) {
          var enteringInstanceId = uuidGenerator.next();
          viewNodeState = enterInstance(viewNodeId, viewNodeState, parentId, parentState, enteringParent, enteringInstanceId, undefined, undefined);
        });
        
        // exiting parent instances cause exiting instances
        parentState.exitingInstances.forEach(function (exitingParent) {
          viewNodeState = exitParent(viewNodeState, exitingParent, isConditional);
        });
      }
      viewNodeState = viewNodeState.set('toReinstantiate', false);
    }

    application = application.setIn(['state', 'dom', domId, 'viewNode', viewNodeId], viewNodeState);

    // if there are entering or exiting instances, mark all children 'toReinstantiate'
    // OPTIMIZATION: only some child instances need to reinstantiate (send instanceIds)
    if (viewNodeState.enteringInstances.size || viewNodeState.exitingInstances.size) {
      application = AM.setChildrenToReinstantiate(application, domId, viewNodeId);
    }

    // OPTIMIZATION: fetch class-level attributes outside of the loop
    // entering instance attributes
    if (viewNodeState.enteringInstances.size) {
      viewNodeState.enteringInstances.forEach(function (enteringInstanceId) {
        var attributes = viewNodeConfig.attributeMappings.filter(function (attributeMapping) {
            return attributeMapping.get(1).get(0) === 'enter';
          }).map(function (attributeMapping) {
            var src = attributeMapping.get(0);
            var dereferencedPathSeq = AM.dereferencePath(viewNodeId, viewNodeState, enteringInstanceId, src);
            application = AM.ensurePathValue(application, asyncMutateDataNodeState, src);
            var val = AM.getPathValue(application, src, dereferencedPathSeq);
            if (!_.isUndefined(val)) {
              return Immutable.List.of(attributeMapping.get(1).slice(1), val);
            }
          }).filter(function (attr) {
            return !_.isUndefined(attr);
          });

        var dereferencedEventBindings = viewNodeConfig.eventBindings.filter(function (eventBinding) {
            return eventBinding.phase.get(0) === 'enter';
          }).map(function (eventBinding) {

            var data = {};
            eventBinding.dataMappings.forEach(function (dataMapping) {
              var dereferencedPathSeq = AM.dereferencePath(viewNodeId, viewNodeState, enteringInstanceId, dataMapping.src);
              application = AM.ensurePathValue(application, asyncMutateDataNodeState, dataMapping.src);
              var val = AM.getPathValue(application, dataMapping.src, dereferencedPathSeq);
              if (!_.isUndefined(val)) {
                _.set(data, dataMapping.dst.toJS(), val);
              }
            });

            var dereferencedEventBinding = schema.deserializeObject({
              phase: eventBinding.phase,
              inputNode: eventBinding.inputNode,
              ids: eventBinding.ids.map(function (path) {
                return AM.getPathValue1(application, viewNodeId, viewNodeState, enteringInstanceId, path);
              }),
              data: Immutable.fromJS(data)
            }, 'dereferenced_event_binding');

            return dereferencedEventBinding;
          });
        // entering must always be in attributes has because there is view node id
        // TODO: pass the namespace here as well?
        // or put viewNodeId and ns in the join data?
        application = AM.addAttributesToUpdateDomMessage(application, domId, viewNodeId, enteringInstanceId, attributes, dereferencedEventBindings);
      });
    }

    // OPTIMIZATION: fetch class-level attributes outside of the loop
    // exiting instance attributes
    if (viewNodeState.exitingInstances.size) {
      viewNodeState.exitingInstances.forEach(function (exitingInstanceId) {
        var attributes = viewNodeConfig.attributeMappings.filter(function (attributeMapping) {
            return attributeMapping.get(1).get(0) === 'exit';
          }).map(function (attributeMapping) {
            var src = attributeMapping.get(0);
            var dereferencedPathSeq = AM.dereferencePath(viewNodeId, viewNodeState, exitingInstanceId, src);
            application = AM.ensurePathValue(application, asyncMutateDataNodeState, src);
            var val = AM.getPathValue(application, src, dereferencedPathSeq);
            if (!_.isUndefined(val)) {
              return Immutable.List.of(attributeMapping.get(1).slice(1), val);
            }
          }).filter(function (attr) {
            return !_.isUndefined(attr);
          });

        var eventBindings = viewNodeConfig.eventBindings.filter(function (eventBinding) {
            return eventBinding.phase.get(0) === 'enter';
          }).map(function (eventBinding) {
            return eventBinding.set('ids', eventBinding.ids.map(function (path) {
              return AM.getPathValue1(application, viewNodeId, viewNodeState, exitingInstanceId, path);
            }));
          });

        if (attributes.size || eventBindings.size) {
          application = AM.addAttributesToUpdateDomMessage(application, domId, viewNodeId, exitingInstanceId, attributes, eventBindings);
        }
      });
    }

    // OPTIMIZATION: fetch class-level attributes outside of the loop
    // updating instance attributes
    if (viewNodeState.persistingInstances.size) {
      if (viewNodeState.dirty.depDirty.size) {
        // TODO: this might unecessarily update a data node
        // the list doesn't update after each iteration
        viewNodeState.dirty.depDirty.forEach(function (dataNodeId) {
          application = AM.updateDataNode(application, dataNodeId, asyncMutateDataNodeState);
        });
        viewNodeState = application.getIn(['state', 'dom', domId, 'viewNode', viewNodeId]);
      }

      if (viewNodeState.dirty.depChanged.inputNode.size || viewNodeState.dirty.depChanged.dataNode.size) {

        viewNodeState.persistingInstances.forEach(function (persistingInstanceId) {

          // if (viewNodeState.updatingInstances.has(persistingInstanceId)) {

          //   // for updating instances, go through the updateDepChanged set,
          //   // mapping a dep to attribute paths, and only calculate those paths
          //   console.log('TODO: if there is a transition, it will cancel any previous transition, so actually send all transition data');
          //   console.log('TODO: this instance has already updated, send only the changes');
          // } else { v }

          // this is the first update, send all attributes
          var attributes = viewNodeConfig.attributeMappings.filter(function (attributeMapping) {
            return attributeMapping.get(1).get(0) === 'update';
          }).map(function (attributeMapping) {
            var src = attributeMapping.get(0);
            var dereferencedPathSeq = AM.dereferencePath(viewNodeId, viewNodeState, persistingInstanceId, src);
            application = AM.ensurePathValue(application, asyncMutateDataNodeState, src);
            var val = AM.getPathValue(application, src, dereferencedPathSeq);
            if (!_.isUndefined(val)) {
              return Immutable.List.of(attributeMapping.get(1).slice(1), val);                  
            }
          }).filter(function (attr) {
            return !_.isUndefined(attr);
          });

        var dereferencedEventBindings = viewNodeConfig.eventBindings.filter(function (eventBinding) {
            return eventBinding.phase.get(0) === 'update';
          }).map(function (eventBinding) {

            var data = {};
            eventBinding.dataMappings.forEach(function (dataMapping) {
              var dereferencedPathSeq = AM.dereferencePath(viewNodeId, viewNodeState, persistingInstanceId, dataMapping.src);
              application = AM.ensurePathValue(application, asyncMutateDataNodeState, dataMapping.src);
              var val = AM.getPathValue(application, dataMapping.src, dereferencedPathSeq);
              if (!_.isUndefined(val)) {
                _.set(data, dataMapping.dst.toJS(), val);

              }
            });

            var dereferencedEventBinding = schema.deserializeObject({
              phase: eventBinding.phase,
              inputNode: eventBinding.inputNode,
              ids: eventBinding.ids.map(function (path) {
                return AM.getPathValue1(application, viewNodeId, viewNodeState, persistingInstanceId, path);
              }),
              data: Immutable.fromJS(data)
            }, 'dereferenced_event_binding');

            return dereferencedEventBinding;
          });

        if (attributes.size || dereferencedEventBindings.size) {
          application = AM.addAttributesToUpdateDomMessage(application, domId, viewNodeId, persistingInstanceId, attributes, dereferencedEventBindings);
        }

          // add the id to the updating set
          viewNodeState = viewNodeState.set('updatingInstances', viewNodeState.updatingInstances.add(persistingInstanceId));
        });
      }
    }

    // clear out the dirty info
    viewNodeState = viewNodeState.remove('dirty');
    application = application.setIn(['state', 'dom', domId, 'viewNode', viewNodeId], viewNodeState);

    // add this viewNodeId to the front of the traversal order (traverse from top to bottom)
    // OPTIMIZATION: OPT1: only add this if _children_ are u/e/e/reordered
    application = application.updateIn(['state', 'dom', domId, 'updateDomMessage', 'traversalOrder'], function (list) {
      return list.push(viewNodeId);
    });

    // add instance ids to the lookup
    // OPTIMIZATION: OPT1: only add this if _children_ are u/e/e/reordered
    application = application.setIn(['state', 'dom', domId, 'updateDomMessage', 'viewNodeInstances', viewNodeId], 
      viewNodeState.instanceLookup.keySeq().toList());

    // if there are u/e/e or reordered instances
    if (viewNodeState.updatingInstances.size || viewNodeState.enteringInstances.size || 
      viewNodeState.exitingInstances.size || reordered) {
      // OPTIMIZATION: OPT1: this means that the parent should be traversed, and add the ids of the parent
    }

    // if any are p/e/e
    if (viewNodeState.persistingInstances.size || viewNodeState.enteringInstances.size || viewNodeState.exitingInstances.size) {

      // add all instanceIds to joinData
      application = application.updateIn(['state', 'dom', domId, 'updateDomMessage', 'joinData'], function (map) {
        return map.withMutations(function (map) {

          // add persisting and entering instances
          // OPTIMIZATION: decide once whether this is fixed or conditional
          viewNodeState.groupedRaisonDetre.forEach(function (conditionalMap, parentInstanceId) {
            var instanceList;
            if (Immutable.Map.isMap(conditionalMap)) {

              // conditional
              instanceList = map.get(parentInstanceId, new Immutable.List());
              instanceList = instanceList.concat(conditionalMap.valueSeq().sortBy(function (value, key) {
                return viewNodeState.instanceLookup.get(value).raisonDetre.index;
              }));
              map.set(parentInstanceId, instanceList);
            } else {

              // fixed
              instanceList = map.get(parentInstanceId, new Immutable.List());
              map.set(parentInstanceId, instanceList.push(conditionalMap));
            }
          });

          // add (the absense of) exiting instances to joinData
          viewNodeState.exitingInstances.forEach(function (instanceId) {
            var viewNodeInstanceProperties = viewNodeState.instanceLookup.get(instanceId);
            var parentInstanceId = viewNodeInstanceProperties.raisonDetre.parent;

            // ensure that the parent has an array to note the absense of this instance
            if (!map.has(parentInstanceId)) {
              map.set(parentInstanceId, new Immutable.List());
            }
          });
        });
      });

      // recurse down the tree
      derivedViewNodeConfig.children.forEach(function (childId) {
        application = AM.refreshViewNode(application, domId, childId, uuidGenerator, asyncMutateDataNodeState);
      });
    }
    return application;
  },

  updateDom: function (application, domId, uuidGenerator, asyncMutateDataNodeState) {

    // clear updateDomMessage
    application = application.setIn(['state', 'dom', domId, 'updateDomMessage'], new RC.UpdateDomMessage({
      'traversalOrder': Immutable.List.of('root'),
      'viewNodeInstances': Immutable.Map([['root', Immutable.List.of(domId)]])
    }));

    // ensure that the root node has exactly one instance
    var derivedRootNodeConfig = application.config.derived.viewNode.get('root');
    var rootNodeInstanceState = application.getIn(['state', 'dom', domId, 'viewNode', 'root']);
    if (!rootNodeInstanceState.persistingInstances.size) {
      if (!rootNodeInstanceState.enteringInstances.size) {

        // this is the first update for this dom
        rootNodeInstanceState = schema.deserializeObject({
          // 'groupedRaisonDetre': new Immutable.Map([[undefined, domId]]), // not necessary
          'instanceLookup': new Immutable.Map([
            [domId, new RC.ViewNodeInstanceProperties({
              'raisonDetre': new RC.RaisonDetre({
                id: domId
              })
            })]
          ]),
          'enteringInstances': Immutable.Set.of(domId),
          toReinstantiate: false
        }, 'view_node_instance_state');
        application = AM.setChildrenToReinstantiate(application, domId, 'root');
      } else {

        // root node was entering; move it to persisting
        var setOfOne = rootNodeInstanceState.get('enteringInstances');
        rootNodeInstanceState = rootNodeInstanceState.set('enteringInstances', new Immutable.Set());
        rootNodeInstanceState = rootNodeInstanceState.set('persistingInstances', setOfOne);
      }
      application = application.setIn(['state', 'dom', domId, 'viewNode', 'root'], rootNodeInstanceState);
    }
    derivedRootNodeConfig.children.forEach(function (childId) {
      application = AM.refreshViewNode(application, domId, childId, uuidGenerator, asyncMutateDataNodeState);
    });
    return application;
  },

  getUpdateDomMessage: function (application, domId) {
    return application.state.dom.get(domId).updateDomMessage;
  },

  addDom: function (application, domId) {
    var newDom = new RC.DomState({
      'viewNode': application.config.original.viewNode.map(function (viewNodeConfig, viewNodeId) {
        return schema.deserializeObject({}, 'view_node_instance_state');
      })
    });
    newDom = newDom.setIn(['viewNode', 'root'], schema.deserializeObject({
      toReinstantiate: true
    }, 'view_node_instance_state'));
    application = application.setIn(['state', 'dom', domId], newDom);
    return application;
  },

  removeDom: function (application, domId) {
    console.log('TODO');
  }
};

return AM;

});