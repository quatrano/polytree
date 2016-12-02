/**
 * All loops in one thread
 */

define([
  'polytree/browser_loop',
  'polytree/main_loop'
], function (BrowserLoop, MainLoop) {

return {
  create : function (application) {
    var proto = this.proto;

    var browserLoop = BrowserLoop.create(application);
    var mainLoop = MainLoop.create(application);

    // var workerPool?

    var propertiesObject = {
      browserLoop: {
        value: browserLoop
      },
      mainLoop: {
        value: mainLoop
      }
    };
    var app = Object.create(proto, propertiesObject);
    window.app = app;
    return app;
  },
  proto : {
    start: function () {
      this.mainLoop.registerBrowserLoop(this.browserLoop);
      this.mainLoop.start();
    }
  }
};

});