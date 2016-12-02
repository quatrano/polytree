/**
 * Application with only Function Definitions
 */

define([
  'bluebird',
  'lodash',
  'immutable',

  'polytree/dev_util'
], function (Promise, _, Immutable,
             DevUtil) {

var RecordClasses = DevUtil.RecordClasses;

return {

  'syncFn': {
    'noop': {}
  },

  'asyncFn': {
    'noop': {},
  },

  'inputNode': {
    'input0': {
      // value: 'helvetica'
    },
    'arrayOfIds': {
      // value: ['id0', 'id1', 'id2']
    },
    'valuesForIds': {
      // value: {
      //   id0: {
      //     color: 'blue',
      //     text: 'asdf'
      //   }
      // }
    },
    'valuesForIndexes': {
      // value: [
      //   {
      //     color: 'blue',
      //     text: 'asdf',
      //     ids: ['x', 'y', 'z']
      //   }
      // }
    }
  },

  'viewNode': {

    'emptyViewNode': {
      'parent': 'root'
    },

    'viewNode0': {
      'parent': 'root',
      'dataNodeDeps': [],
      'attributeMappings': [
        // [ // TODO: fix constants
        //   ['constant', 'tag'],
        //   ['enter', 'instant', 'tag']
        // ],
        // [
        //   ['constant', 'ns'],
        //   ['enter', 'instant', 'ns']
        // ],
        [
          ['inputNode', 'input0', 'value'],
          ['update', 'instant', 'font-family']
        ],
      ]
    },

    'conditionalViewNode': {
      'parent': 'root',
      'attributeMappings': [
        [
          ['inputNode', 'arrayOfIds', 'value'],
          ['existence']
        ],
        [
          ['inputNode', 'valuesForIds', 'value', ['id', 'conditionalViewNode'], 'color'],
          ['enter', 'instant', 'style', 'color']
        ],
        [
          ['inputNode', 'valuesForIds', 'value', ['id', 'conditionalViewNode'], 'color'],
          ['update', 'transition', 'style', 'background-color']
        ],
        [
          ['inputNode', 'valuesForIds', 'value', ['id', 'conditionalViewNode'], 'color'],
          ['exit', 'transition', 'style', 'color']
        ]
      ]
    },

    'fixedChildOfConditional': {
      'parent': 'conditionalViewNode',
      'attributeMappings': [
        [
          ['inputNode', 'valuesForIndexes', 'value', ['index', 'conditionalViewNode'], 'text'],
          ['update', 'instant', 'text']
        ]
      ]
    },
    
    'conditionalChildOfConditional': {
      'parent': 'conditionalViewNode',
      'attributeMappings': [
        [
          ['inputNode', 'valuesForIndexes', 'value', ['index', 'conditionalViewNode'], 'ids'],
          ['existence']
        ],
        [
          ['inputNode', 'valuesForIndexes', 'value', ['index', 'conditionalChildOfConditional'], 'text'],
          ['enter', 'instant', 'text']
        ],
        [
          ['inputNode', 'valuesForIndexes', 'value', ['index', 'conditionalViewNode'], 'color'],
          ['enter', 'instant', 'color']
        ],
        [
          ['inputNode', 'valuesForIndexes', 'value', ['index', 'conditionalViewNode'], 'text'],
          ['update', 'transition', 'text']
        ]
      ]
    }
  }
};

});