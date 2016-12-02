/**
 * Worker Loop
 */

define([],
  function () {

    return {
      create : function (id) {
        var proto = this.proto;
        var propertiesObject = {
          id: {
            value: id
          },
          asdf: {
            value: false,
            writable: true,
            configurable: true
          }
        };
        var workerLoop = Object.create(proto, propertiesObject);
        return workerLoop;
      },
      proto : {
        start: function () {
          console.log('starting');
        }
      }
    };
  }
);
