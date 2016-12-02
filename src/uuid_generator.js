/**
 * Main Loop
 */

define([], function () {

'use strict';

return {
  create : function (prefix) {
    var propertiesObject = {
      _uidPrefix: {
        value: (prefix + '_')
      },
      _uidCount: {
        value: 0,
        writable: true
      },
      uid: {
        get: function () {
          return (this._uidPrefix + (++this._uidCount));
        }
      }
    };
    var uuidGenerator = Object.create(this.proto, propertiesObject);
    return uuidGenerator;
  },
  proto : {
    next: function () {
      return this.uid;
    }
  }
};

});
