define([
  'lodash',
  'immutable'
], function (_, Immutable) {


// utilities/constants used by dev and prod

'use strict';

var thingTypes = {
  asyncFn: 'a',
  syncFn: 's',
  viewComponent: 'c',
  viewNode: 'v',
  dataNode: 'd',
  inputNode: 'i'
};

var constants = {
  thingTypes: thingTypes,
  depEvents: {
    done: 'd', // a dependency is done working
    progress: 'p' // a dependency made progress on work
  }
};

var thingConfigPrototypes = {
  asynFn: Immutable.Record({
    argNames: new Immutable.List(),
    deps: new Immutable.List(), // <List <functionId>>
    procedure: _.noop
  }),
  dataNode: Immutable.Record({
    constants: new Immutable.List(), // <List <value>>
    dnDeps: new Immutable.List(), // <List <value>>
    fnDeps: new Immutable.List(), // <List <dataNodeId>>
    enqueueWorkFn: undefined, // <functionId>
    dequeueWorkFn: undefined, // <functionId>
    doWorkFn: undefined // <functionId>
  }),
  inputNode: Immutable.Record({
    type: constants.thingTypes.inputNode
  })
};

var utilities = {
  isFn: function (type) {
    return ((type === thingTypes.asyncFn) || (type === thingTypes.syncFn));
  },
  thingIsFn: function (thingConfig) {
    var type = thingConfig.get(type);
    return this.isFn(type);
  }
  // isInputOrDataNode: function (thingConfig) {
  //   var type = thingConfig.get(type);
  //   return true;
  // }
};

return {
  constants: constants,
  utilities: utilities
};

});