/**
 * Main Loop
 */

define([
  'lodash',
  'polytree/main_methods',
  'polytree/application_methods',
  'polytree/uuid_generator'
], function (_, 
  MainMethods, ApplicationMethods, UuidGenerator) {

return {
  create : function (application) {

    application = ApplicationMethods.setInputNodeValue(application, 'performanceNow', performance.now());
    application = ApplicationMethods.setInputNodeValue(application, 'startTime', Date.now());

    var proto = this.proto;
    var propertiesObject = {
      application: {
        value: application,
        writable: true
      },
      uuidGenerator: {
        value: UuidGenerator.create('dom') // this is the DOMid generator
      },
      browserLoops: {
        value: {}
      },
      asdf: {
        value: false,
        writable: true,
        configurable: true
      }
    };
    var mainLoop = Object.create(proto, propertiesObject);
    return mainLoop;
  },
  proto : {
    start: function () {
      var mainLoop = this;
      var fps = 75;

      function next() {
        window.requestAnimationFrame(doTick);
      }
      function doTick() {
        mainLoop.tick(next);
      }
      next();
    },
    tick: function (next) {
      var tickStart = performance.now();
      var mainLoop = this;
      this.application = ApplicationMethods.setInputNodeValue(this.application, 'performanceNow', tickStart);
      _.each(this.browserLoops, function (browserLoop, domId) {
        mainLoop.updateDom(domId);
      });
      window.setTimeout(function () {
        next();
      });
      return (performance.now() - tickStart);
    },
    registerBrowserLoop: function (browserLoop) {

      var mainLoop = this;

      var domId = this.uuidGenerator.next();
      browserLoop.initialize(domId, this);
      this.browserLoops[domId] = browserLoop;

      this.application = ApplicationMethods.addDom(this.application, domId);
      this.updateDom(domId);
    },
    updateDom: function (domId) {
      var self = this;
      var asyncMutateDataNodeState = function (dataNodeId, mutateFn) {
        self.application = MainMethods.asyncMutateDataNodeState(self.application, dataNodeId, mutateFn);
      };
      this.application = ApplicationMethods.updateDom(this.application, domId, this.uuidGenerator, asyncMutateDataNodeState);
      var updateDomMessage = ApplicationMethods.getUpdateDomMessage(this.application, domId);
      this.browserLoops[domId].handleUpdateDomMessage(updateDomMessage.toJS());
    },
    deregisterBrowser: function (argument) {
      // removes DOM here
      console.log('todo');
    },
    handleBrowserEvent: function (inputNodeId, e) {
      this.application = MainMethods.inputBrowserEvent(this.application, inputNodeId, e);
    },
  }
};

});