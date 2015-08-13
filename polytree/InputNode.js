// Input Node Dependencies
define(['underscore'],
function (_) {
return {

// Input Node Builder
create : function (id) {
  var proto = this.proto;
  var propertiesObject = {
    id: {
      value: id
    },
    watchers: {
      value: []
    },
    value: {
      value: undefined,
      writable: true
    }
  };
  var state = Object.create(proto, propertiesObject);
  return state;
},

// Input Node Prototype
proto : {

  initialize : function (ctx) {
    this.ctx = ctx;
  },

  configure : function (obj) {
    var i = this;
    var ctx = i.ctx;
    var cc = ctx.configConstants;
    // watchers
    _.each(obj[cc.PN_WATCHERS], function (watcher) {
      i.watchers.push(watcher);
    });
    if (typeof(obj[cc.PN_VALUE]) !== 'undefined') {
      this.update(obj[cc.PN_VALUE]);
    }
  },

  update : function (value) {
    var i = this;
    var ctx = i.ctx;
    i.value = value;
    _.each(i.watchers, function (watcher) {
      ctx[watcher[0]].notify(watcher, value);
    });
  }
}

};});
