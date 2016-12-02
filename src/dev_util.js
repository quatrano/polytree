define([
  'immutable',
  'lodash',

  'polytree/common',
  'polytree/record_classes',

  'polytree/application_schema',
  'polytree/schema_util'
], function (Immutable, _,
             common, RecordClasses,
             applicationSchema, SchemaUtil) {

// utilities and constants for constructing a serialized application config
//   serialized = plain old json, functions as strings
//   application config = config and starting state
// these utilities are not used to run an application in production

'use strict';

var DevUtil = {
  applicationFactory: applicationSchema,
  RecordClasses: RecordClasses,
  constants: common.constants,

  map: function (obj, build) {
    return new Immutable.Map(_.map(obj, function (value, key) {
      return [key, build(value)];
    }));
  },

  mapList: function (arr, build) {
    return new Immutable.List(_.map(arr, function (value) {
      return build(value);
    }));
  },

  mapListOfLists: function (arr) {
    return DevUtil.mapList(arr, Immutable.List);
  },

  convertFieldTo: function (obj, field, build) {
    if (obj.hasOwnProperty(field)) {
      var clone = _.extend({}, obj);
      clone[field] = build(obj[field]);
      return clone;
    } else {
      return obj;
    }
  },

  forEachMappingIn: function (obj, fn, path) {

    // in deserialized configs, this is how a mapping is identified
    if (obj instanceof RecordClasses.Mapping) {
      return fn(obj, path);
    } else {
      obj.forEach(function (value, key) {
        DevUtil.forEachMappingIn(value, fn, path.push(key));
      });
    }
  },

  constructDerivedConfig: function (originalConfig) {
    var ret = {
      'inputNode': {},
      'dataNode': {},
      'viewNode': {}
    };

    // process original input nodes
    _.each(originalConfig.inputNode, function (inputNodeConfig, inputNodeId) {
      ret.inputNode[inputNodeId] = {
        'dep': {
          'inputNode': [],
          'dataNode': [],
          'viewNode': []
        }
      };
    });

    // process original data nodes
    _.each(originalConfig.dataNode, function (dataNodeConfig, dataNodeId) {

      // get derived data node config or create it and return it
      function getDerivedDataNodeConfig (map, dataNodeId) {
        if (!map.dataNode[dataNodeId]) {
          map.dataNode[dataNodeId] = {
            'dep': {
              'in': {
                'inputNode': [],
                'dataNode': [],
                'viewNode': []
              },
              'out': {
                'inputNode': dataNodeConfig.inputNodeDeps || [],
                'dataNode': dataNodeConfig.dataNodeDeps || []
              }
            }
          };
        }
        return map.dataNode[dataNodeId];
      }

      // create one for this node, just in case nothing depends on it
      // TODO: shitty pattern
      getDerivedDataNodeConfig(ret, dataNodeId);

      // data node depends on input node
      _.each(dataNodeConfig.inputNodeDeps, function (depId) {
        ret.inputNode[depId].dep.dataNode.push(dataNodeId);
      });

      // data node depends on data node
      _.each(dataNodeConfig.dataNodeDeps, function (depId) {
        getDerivedDataNodeConfig(ret, depId).dep.in.dataNode.push(dataNodeId);
      });
    });

    // process original view nodes
    // assume that a parent will be traversed before children
    // and that children will be traversed in order

    // create a derived view node config for the root node
    var rootNodeId = 'root'; // TODO: do something about this magical id
    ret.viewNode[rootNodeId] = {
      children: []
    };

    // loop throuh view node configs and create derived configs
    _.each(originalConfig.viewNode, function (viewNodeConfig, viewNodeId) {

      // get derived view node config or create it and return it
      function getDerivedViewNodeConfig (map, viewNodeId) {
        if (!map.viewNode[viewNodeId]) {
          map.viewNode[viewNodeId] = {
            'children': [],
            'dep': {
              'in': {
                'viewNode': []
              },
              'out': {
                'inputNode': {},
                'dataNode': {},
                'viewNode': {}
              }
            }
          };
        }
        return map.viewNode[viewNodeId];
      }

      // create one for this node, just in case nothing depends on it
      // TODO: shitty pattern
      var derivedConfig = getDerivedViewNodeConfig(ret, viewNodeId);
      if (viewNodeConfig.children) {
        derivedConfig.children = viewNodeConfig.children;
      }

      // add child to parent
      var parent = getDerivedViewNodeConfig(ret, viewNodeConfig.parent);
      if (_.indexOf(parent.children, viewNodeId) === -1) {
        parent.children.push(viewNodeId);
      }      

      var processMapping = function (src, dst) {
        var path, arr;
        var srcPath = _.slice(src, 2);
        if (src[0] === 'dataNode' || src[0] === 'inputNode') {

          // mark the out dep on this node
          path = ['dep', 'out', src[0], src[1], dst[0]];
          arr = _.get(derivedConfig, path, []);
          arr.push([srcPath, dst]);
          _.set(derivedConfig, path, arr);

          // mark the in dep on that node
          if (src[0] === 'inputNode') {
            path = [src[0], src[1], 'dep', 'viewNode'];
          } else if (src[0] === 'dataNode') {
            path = [src[0], src[1], 'dep', 'in', 'viewNode'];
          } else {
            console.log('error');
          }
          arr = _.get(ret, path, []);
          arr.push(viewNodeId);
          _.set(ret, path, arr);
        }

        // if the srcPath uses the index of a view node ancestor, set up the dep
        srcPath.forEach(function (pathPart) {
          if (_.isArray(pathPart) && pathPart[0] === 'index') {

            // mark the out dep on this node
            path = ['dep', 'out', 'viewNode', pathPart[1]];
            arr = _.get(derivedConfig, path, []);
            arr.push([srcPath, dst]);
            _.set(derivedConfig, path, arr);

            // mark the in dep on that node (the node should already exist)
            path = ['viewNode', pathPart[1], 'dep', 'in', 'viewNode', viewNodeId];
            _.set(ret, path, true);
          }
        });
      };

      // only watch the dependency (implied by a mapping)
      // if the mapping determines the instantiation of this node
      // or the mapping is in the update phase
      var handleAttributeMapping = function (mapping) {
        var src = mapping[0];
        var dst = mapping[1];
        if (dst[0] === 'update') {
          processMapping(src, dst);
        } else if (dst[0] === 'existence') {
          processMapping(src, dst);
          derivedConfig.existence = src;
        }
      };
      _.each(viewNodeConfig.attributeMappings, handleAttributeMapping);

      // also watch dependencies
      // if an event binding updates
      _.each(viewNodeConfig.eventBindings, function (binding) {
        if (binding.phase[0] === 'update') {
          var dst = ['event'];
          _.each(binding.dataMappings, function (dataMapping) {
            processMapping(dataMapping.src, dst);
          });
        }
      });
      ret.viewNode[viewNodeId] = derivedConfig;
    });

    //   // loop through the attribute mappings and create reverse mappings
    //   DevUtil.forEachMappingIn(viewNodeConfig.attributeMappings, processMapping, new Immutable.List());

    //   // add this to viewNodeId to the list of children
    //   if (!ret.viewNodeChildren[viewNodeConfig.parent]) ret.viewNodeChildren[viewNodeConfig.parent] = [];
    //   ret.viewNodeChildren[viewNodeConfig.parent].push(viewNodeId);

    //   // add to parent's children array
    //   ret.viewNode[viewNodeConfig.parentId].children.push(viewNodeId);

    //   // store this derived config
    //   ret.viewNode[viewNodeId] = derivedConfig;
    // });
    return ret;
  },

  constructState: function (originalConfig, derivedConfig) {
    var state = {
      'dataNode': _.fromPairs(_.map(originalConfig.dataNode, function (dataNodeConfig, dataNodeId) {
        return [dataNodeId, {}];
      })),
      'inputNode': _.fromPairs(_.map(originalConfig.inputNode, function (inputNodeConfig, inputNodeId) {
        return [inputNodeId, {}];
      }))
    };

    function getDataNodeDirtyObj (state, dataNodeId) {
      if (!state.dataNode[dataNodeId].dirty) {
        state.dataNode[dataNodeId].dirty = {
          'depDirty': [],
          'depChanged': false
        };
      }
      return state.dataNode[dataNodeId].dirty;
    }

    function recursiveMarkDescendentsDirty (state, derivedConfig, dataNodeId) {
      _.each(derivedConfig.dataNode[dataNodeId].dep.in.dataNode, function (dataNodeDep) {
        getDataNodeDirtyObj(state, dataNodeDep).depDirty.push(dataNodeId);
        recursiveMarkDescendentsDirty(state, derivedConfig, dataNodeDep);
      });
    }

    // for all data nodes who depend on constants
    // mark them as update changed and mark all descendents as dirty
    // TODO: what's the right way to handle this case?
    _.each(originalConfig.dataNode, function (config, key) {
      if (config.constantDeps && config.constantDeps.length) {
        getDataNodeDirtyObj(state, key).depChanged = true;
        recursiveMarkDescendentsDirty(state, derivedConfig, key);
      }
    });
    return state;
  },

  constructApplication: function (originalConfig, derivedConfig, state) {
    if (!derivedConfig) derivedConfig = DevUtil.constructDerivedConfig(originalConfig);
    if (!state) state = DevUtil.constructState(originalConfig, derivedConfig);
    return {
      'config': {
        'original': originalConfig,
        'derived': derivedConfig
      },
      'state': state
    };
  },


  deserializeApplication: function (serApp) {

    return this.applicationFactory.deserializeObject(serApp, 'application');

    // return RecordClasses.Application({
    //   config: DevUtil.deserializeConfig(serApp.config),
    //   state: DevUtil.deserializeState(serApp.state)
    // });
  },

};

return DevUtil;

});