/**
 * Application with only Function Definitions
 */

define([
  'bluebird',
  'lodash',
  'immutable',

  'polytree/dev_util',
  'polytree/special_functions'
], function (Promise, _, Immutable,
             DevUtil, SpecialFunctions) {

return {
  'constant': {
    'foo': {
      value: 'bar'
    },
    'bar': {
      value: 'baz'
    }
  },

  'syncFn': {
    'noop': {},
    'coalescentInputFn': SpecialFunctions.coalescentInputFn,
    'coalescentDoWorkFn': SpecialFunctions.coalescentDoWorkFn,
    'preservativeInputFn': SpecialFunctions.preservativeInputFn,
    'preservativeDoWorkFn': SpecialFunctions.preservativeDoWorkFn,
  },

  'asyncFn': {
    'noop': {},

    'concat': {
      procedure: function (done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        return done(dynamicArgs.reduce(function (reduction, value, key) {
          return '' + reduction + value;
        }));
      }
    },

    // 'controlFlow': {} // injected by test case

    'returnWork': {
      procedure: function (done, progress, constantDeps, syncFnDeps, asyncFnDeps, dynamicArgs) {
        return done(dynamicArgs);
      }
    }
  },

  'inputNode': {
    'input0': {}
  },

  'dataNode': {
    'emptyDn': {
      'inputFn': 'noop',
      'doWorkFn': 'noop',
      'computeFn': 'noop'
    },

    'simple': {
      'constantDeps': ['foo'],
      'inputNodeDeps': ['input0'],
      'dataNodeDeps': [],
      'syncFnDeps': [],
      'asyncFnDeps': [],
      'inputFn': 'coalescentInputFn',
      'doWorkFn': 'coalescentDoWorkFn',
      'computeArgMappings': [
        ['constant', 'foo', 'value'],
        ['inputNode', 'input0', 'value']
      ],
      'computeFn': 'concat'
    },

    'depDataNode': {
      'constantDeps': ['bar'],
      'dataNodeDeps': ['simple'],
      'inputFn': 'coalescentInputFn',
      'doWorkFn': 'coalescentDoWorkFn',
      'computeArgMappings': [
        ['dataNode', 'simple', 'value'],
        ['constant', 'bar', 'value']
      ],
      'computeFn': 'concat'
    },

    'flowControlled': {
      'dataNodeDeps': ['simple'],
      'inputFn': 'coalescentInputFn',
      'doWorkFn': 'coalescentDoWorkFn',
      'computeArgMappings': [
        ['dataNode', 'simple', 'value']
      ],
      'computeFn': 'controlFlow'
    },

    'preservative': {
      'dataNodeDeps': ['flowControlled', 'simple'],
      'inputFn': 'preservativeInputFn',
      'doWorkFn': 'preservativeDoWorkFn',
      'computeArgMappings': [
        ['dataNode', 'flowControlled'],
        ['dataNode', 'simple']
      ],
      'computeFn': 'returnWork'
    }
  }
};

});