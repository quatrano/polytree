define([
  'lodash',
  'immutable',

  'polytree/common',
  'polytree/application_schema',
  'polytree/application_methods'
], function (_, Immutable,
             common, ApplicationSchema, AM) {

// Main Methods
//   This is a stateless utility with methods for the main loop.
//   TODO: maybe pull some things out of application_methods into here?

'use strict';

var fns = {

  inputBrowserEvent: {
    value: function (application, inputNodeId, e) {
      // set the appropriate input node value
      // e = {
      //   time: <Date>,
      //   id: <idParts>
      //   data: <data>
      // }

      var deserializedE = ApplicationSchema.deserializeObject(e, 'browser_event');
      return AM.setInputNodeValue(application, inputNodeId, deserializedE);
    }
  },

  asyncMutateDataNodeState: {
    value: function (application, dataNodeId, mutateFn) {
      var dataNodeState = AM.getDataNodeState(application, dataNodeId);
      dataNodeState = mutateFn(dataNodeState);
      application = AM.setDataNodeState(application, dataNodeId, dataNodeState);
      return application;
    }
  }

};


// TODO: convert this to schema pattern
var MainMethods = Object.create(null, fns);
return MainMethods;

});