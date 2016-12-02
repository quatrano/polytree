define([
  'immutable',
  'lodash',

  'polytree/project_schema',
  'polytree/dev_util',
  'polytree/schema_util'
], function (Immutable, _,
             projectSchema, DevUtil, SchemaUtil) {

'use strict';

var ProjectUtil = {

  DevUtil: DevUtil,
  projectFactory: projectSchema,

  // TODO: replace this with a function that returns
  // a string version of application.js
  convertProjToOrigAppConfig: function (proj) {
    var schema = SchemaUtil.getFactory(proj.schema);

    // TODO: replace this with a call to the serialize function
    var constants = proj.config.constant.map(function (value, id) {
      console.log('constant: ' + value.name + ' > ' + id);
      return {
        value: schema.deserializeObject(value.config.value, value.schema)
      };
    }).toJS();

    var deserApp = DevUtil.deserializeApplication(DevUtil.constructApplication({
      constant: constants,
      syncFn: proj.config.syncFn.map(function (value, id) {
        console.log('sync fn: ' + value.name + ' > ' + id);
        var ret = value.config;
        var prependedLine = '//# sourceURL=' + value.name.replace(/\s+/g, '-') + '.js \n';

        if (value.constantDeps) {
          value.constantDeps.forEach(function (constantDep) {
            ret = ret.set('constantDeps', ret.constantDeps.add(constantDep.id));
            prependedLine = prependedLine + 'var ' + constantDep.localVariable + ' = constantDeps.get("' + constantDep.id + '").value; ';
          });
        }

        if (value.syncFnDeps) {
          value.syncFnDeps.forEach(function (syncFnDep) {
            ret = ret.set('syncFnDeps', ret.syncFnDeps.add(syncFnDep.id));
            prependedLine = prependedLine + 'var ' + syncFnDep.localVariable + ' = syncFnDeps.get("' + syncFnDep.id + '"); ';
          });
        }

        if (value.asyncFnDeps) {
          value.asyncFnDeps.forEach(function (asyncFnDep) {
            ret = ret.set('asyncFnDeps', ret.asyncFnDeps.add(asyncFnDep.id));
            prependedLine = prependedLine + 'var ' + asyncFnDep.localVariable + ' = asyncFnDeps.get("' + asyncFnDep.id + '"); ';
          });
        }

        if (value.argumentOrder.size) {
          value.argumentOrder.toList().forEach(function (argumentId, index) {
            var argumentData = value.argumentData.get(argumentId);
            prependedLine = prependedLine + 'var ' + argumentData.localVariable + ' = dynamicArgs.get(' + index + '); ';
          });
        }

        if (value.procedure && value.procedure.size) {
          var fnString = prependedLine + '\n' + value.procedure.join('\n');
          var fn;
          try {
            fn = new Function('constantDeps', 'syncFnDeps', 'asyncFnDeps', 'dynamicArgs', fnString);
          } catch (e) {
            debugger;
          }
          ret = ret.set('procedure', fn);
        }
        return ret;
      }).toJS(),
      asyncFn: proj.config.asyncFn.map(function (value, id) {
        console.log('async fn: ' + value.name + ' > ' + id);
        var ret = value.config;
        var prependedLine = '//# sourceURL=' + value.name.replace(/\s+/g, '-') + '.js \n';

        if (value.constantDeps) {
          value.constantDeps.forEach(function (constantDep) {
            ret = ret.set('constantDeps', ret.constantDeps.add(constantDep.id));
            prependedLine = prependedLine + 'var ' + constantDep.localVariable + ' = constantDeps.get("' + constantDep.id + '").value; ';
          });
        }

        if (value.syncFnDeps) {
          value.syncFnDeps.forEach(function (syncFnDep) {
            ret = ret.set('syncFnDeps', ret.syncFnDeps.add(syncFnDep.id));
            prependedLine = prependedLine + 'var ' + syncFnDep.localVariable + ' = syncFnDeps.get("' + syncFnDep.id + '"); ';
          });
        }

        if (value.asyncFnDeps) {
          value.asyncFnDeps.forEach(function (asyncFnDep) {
            ret = ret.set('asyncFnDeps', ret.asyncFnDeps.add(asyncFnDep.id));
            prependedLine = prependedLine + 'var ' + asyncFnDep.localVariable + ' = asyncFnDeps.get("' + asyncFnDep.id + '"); ';
          });
        }

        if (value.argumentOrder.size) {
          value.argumentOrder.toList().forEach(function (argumentId, index) {
            var argumentData = value.argumentData.get(argumentId);
            prependedLine = prependedLine + 'var ' + argumentData.localVariable + ' = dynamicArgs.get(' + index + '); ';
          });
        }

        if (value.procedure && value.procedure.size) {
          var fnString = prependedLine + '\n' + value.procedure.join('\n');
          var fn;
          try {
            fn = new Function('done', 'progress', 'constantDeps', 'syncFnDeps', 'asyncFnDeps', 'dynamicArgs', fnString);
          } catch (e) {
            debugger;
          }
          ret = ret.set('procedure', fn);
        }
        return ret;
      }).toJS(),
      inputNode: proj.config.inputNode.map(function (value, id) {
        console.log('input node: ' + value.name + ' > ' + id);
        return {}; // there is no meaningful input node config yet
      }).toJS(),
      dataNode: proj.config.dataNode.map(function (value, id) {
        console.log('data node: ' + value.name + ' > ' + id);

        // TODO: when config is completely gone, make a data_node_config object here
        var ret = value.config;

        // map input strategy to 'doWorkFn' and 'inputFn'
        if (value.inputStrategy === 'preservative') {
          ret = ret.set('inputFn', 'preservativeInputFn')
            .set('doWorkFn', 'preservativeDoWorkFn');
        } else if (value.inputStrategy === 'coalescent') {
          ret = ret.set('inputFn', 'coalescentInputFn')
            .set('doWorkFn', 'coalescentDoWorkFn');
        } else {
          console.log('error: unknown input strategy');
        }

        // map the compute fn id
        if (value.computeFn) { // TODO: remove condition
          ret = ret.set('computeFn', value.computeFn);
        }

        // map argument mappings to deps and computeArgMappings
        if (value.computeFn) { // TODO: remove condition
          var computeFnConfig = proj.config.asyncFn.get(value.computeFn);
          computeFnConfig.argumentOrder.forEach(function (argumentId) {
            var argMapping = value.argumentMappings.get(argumentId);
            if (argMapping) {
              ret = ret.set('computeArgMappings', ret.computeArgMappings.push(argMapping));
              var argMappingType = argMapping.get(0);
              if (argMappingType === 'constant') {
                ret = ret.set('constantDeps', ret.constantDeps.add(argMapping.get(1)));
              } else if (argMappingType === 'syncFn') {
                ret = ret.set('syncFnDeps', ret.syncFnDeps.add(argMapping.get(1)));
              } else if (argMappingType === 'asyncFn') {
                ret = ret.set('asyncFnDeps', ret.asyncFnDeps.add(argMapping.get(1)));
              } else if (argMappingType === 'inputNode') {
                ret = ret.set('inputNodeDeps', ret.inputNodeDeps.add(argMapping.get(1)));
              } else if (argMappingType === 'dataNode') {
                ret = ret.set('dataNodeDeps', ret.dataNodeDeps.add(argMapping.get(1)));
              } else if (argMappingType === 'special') {
                // do nothing
              } else {
                console.log('unknown argMapping type');
                console.log(argMapping);
              }
            } else {
              console.log('data node has unmapped compute argument');
              ret = ret.computeArgMappings.push(null); // TODO: is null handled properly?
            }
          });
        }
        return ret;
      }).toJS(),
      viewNode: proj.config.viewNode.map(function (value, id) {
        console.log('view node: ' + value.name + ' > ' + id);
        var ret = value.config;

        // actuator
        if (value.get('actuator')) {
          ret = ret.set('actuator', value.get('actuator'));
        }

        // parent
        if (value.get('parent')) {
          ret = ret.set('parent', value.get('parent'));
        }

        // children
        if (value.get('children').size) {
          ret = ret.set('children', value.get('children'));
        }

        var mapDataMapping = function (projectDataMapping) {
          return Immutable.List([projectDataMapping.src, projectDataMapping.dst]);
        };
        // attributeMappings
        if (value.get('attributeMappings').size) {
          ret = ret.set('attributeMappings', value.get('attributeMappings').map(mapDataMapping));
        }

        // eventBindings
        if (value.get('eventBindings').size) {
          ret = ret.set('eventBindings', value.get('eventBindings').map(function (eventBinding) {
            return Immutable.Map({
              phase: eventBinding.phase,
              inputNode: eventBinding.inputNode,
              ids: [],
              dataMappings: eventBinding.dataMappings
            });
          }));
        }

        return ret;
      }).toJS(),
      viewActuator: proj.config.viewActuator
    }));

    return deserApp.setIn(['config', 'original', 'constant', 'schema'], schema);
  },

  deserializeProject: function (serProj) {
    return this.projectFactory.deserializeObject(serProj, 'project');
  },

};

return ProjectUtil;

});