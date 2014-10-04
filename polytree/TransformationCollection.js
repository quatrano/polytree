// Transformation Collection Dependencies
define(['underscore', 'jquery', 'polytree/Transformation'],
function (_, $, Transformation) {
return {

// Transformation Collection Builder
build : function () {
  var proto = this.proto;
  var propertiesObject = {
    library: {
      value: {}
    },
    uid: {
      set: function (prefix) {
        this.prefix = prefix;
        this.count = 0;
      },
      get: function () {
        return (this.prefix + this.count++);
      }
    }
  };        
  var collection = Object.create(proto, propertiesObject);
  collection.uid = 't_';
  return collection;
},

// Transformation Collection Prototype
proto : {

  initialize : function (ctx) {
    this.ctx = ctx;
  },

  configure : function (config) {
    var ctx = this.ctx;
    var cc = ctx.configConstants;
    var tToCreate = config[cc.TRANSFORMATIONS];
    _.each(tToCreate, function (obj, i) {
      var t = ctx.t.configureOrCreate(obj);
    });
  },

  configureOrCreate : function (obj) {
    var ctx = this.ctx;
    var cc = ctx.configConstants;
    var t = this.lookup(obj[cc.T_ID]);
    if (t) {
      t.configure(obj);
    } else {
      t = Transformation.build(obj[cc.T_ID]);
      t.initialize(ctx);
      t.configure(obj);
      this.library[t.id] = t;
    }
    return t;
  },

  lookup : function (id) {
    return this.library[id];
  },

  transform : function (ts, data) {
    // ts = [['tId', 'arg1', 'arg2'], ...]
    // data = [datum, ...]
    var deferred = $.Deferred();
    var resolve = _.after(ts.length, deferred.resolve);
    function _transform (t, index, list) {
      var id = _.first(t);
      var args = _.rest(t);
      var t = this.lookup(id);
      t.transform(data, args).then(resolve);
    }
    _.defer(_.each, ts, _transform, this);
    return deferred.promise();
  },
}

};});