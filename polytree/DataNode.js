// Data Node Dependencies
define(['underscore'],
function (_) {
return {

// Data Node Builder
build : function (id) {
  var proto = this.proto;
  var propertiesObject = {
    id: {
      value: id
    },
    cache: {
      value: []
    },
    transformations: {
      value: []
    },
    watchers: {
      value: []
    },
    value: {
      value: undefined,
      writable: true
    }
  };
  var dataNode = Object.create(proto, propertiesObject);
  return dataNode;
},

// Data Node Prototype
proto : {

  initialize : function (ctx) {
    this.ctx = ctx;
  },

  configure : function (obj) {
    var d = this;
    var ctx = d.ctx;
    var cc = ctx.configConstants;
    // dependencies
    _.each(obj[cc.MN_DEP], function (dependency, index) {
      ctx.registerWatcher(dependency, ['d', d.id, index]);
      d.cache.push(ctx.getValue(dependency));
    });
    // transformations
    _.each(obj[cc.MN_T], function (transformation) {
      d.transformations.push(transformation);
    });
    // watchers
    _.each(obj[cc.MN_WATCHERS], function (watcher) {
      d.watchers.push(watcher);
    });
  },

  getValue : function (value) {
    var d = this;
    var ctx = d.ctx;
    if (typeof(value) == 'object') {
      // this value is a reference
      if (value[0] == null) {
        // reference to previous result
        var result = d.value;
      } else {
        var result = d.cache[value[0]];
      }
      // now drill into the value
      for (var i=1; i<value.length; i++) {
        var addressPart = value[i];
        if (result != undefined) {
          result = result[addressPart];
        }
      }
      return result;
    } else {
      return value;
    }
  },

  evaluateArgs : function (args) {
    var d = this;
    var ctx = d.ctx;
    var evaluated = [];
    _.each(args, function (arg) {
      evaluated.push(d.getValue(arg));
    });
    return evaluated;
  },

  recalculate : function () {
    var d = this;
    var ctx = d.ctx;
    var cc = ctx.configConstants;
    d.value = undefined;
    _.each(d.transformations, function (t) {
      var transformation = ctx.t.lookup(t[cc.T_ID]);
      var args = t[cc.MN_T_ARGS];
      var evaluatedArgs = d.evaluateArgs(args);
      d.value = transformation.transform(evaluatedArgs);
    });
    _.each(d.watchers, function (watcher) {
      ctx[watcher[0]].notify(watcher, d.value);
    });
  },

  notify : function (watcher, value) {
    var d = this;
    var ctx = d.ctx;
    this.cache[watcher[2]] = value;
    ctx.d.registerNodesToRecalculate([this.id]);
  }
}

};});