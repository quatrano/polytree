/**
 * Browser Loop
 */

define([
  'jquery',
  'd3',
  'immutable',
  'polytree/browser_methods'
],
  function ($, d3, Immutable,
    BrowserMethods) {

return {
  create : function (application) {
    var proto = this.proto;
    var propertiesObject = {
      application: {
        value: application
      },
      namespace: {
        value: undefined,
        writable: true,
        configurable: true
      },
      mainLoop: {
        value: undefined,
        writable: true,
        configurable: true
      },
      exitingInstances: {
        value: new Immutable.Set(),
        writable: true,
        configurable: true
      }
    };
    var browserLoop = Object.create(proto, propertiesObject);
    return browserLoop;
  },
  proto : {
    initialize: function (namespace, mainLoop) {
      this.namespace = namespace;
      this.mainLoop = mainLoop;
      this.exitingInstances = new Immutable.Set();

      // add the root node
      $('<div/>', {
        id: namespace,
        style: 'position: absolute; top: 0; bottom: 0; right: 0; left: 0;'
      }).appendTo('body');
    },
    handleUpdateDomMessage: function (updateDomMessage) {
      var self = this;
      BrowserMethods.updateDom(this.application, updateDomMessage, function (inputNodeId, eventData) {
        self.mainLoop.handleBrowserEvent(inputNodeId, eventData);
      }, function () {
        return self.exitingInstances;
      }, function (exitingInstances) {
        self.exitingInstances = exitingInstances;
      });
    },
    start: function () {
      console.log('starting');
    }
  }
};});