// Procedure Collection Dependencies
define(['polytree/Procedure'],
function (Procedure) {
return {

// Procedure Collection Builder
build : function () {
  var proto = this.proto;
  var propertiesObject = {
    library: {
      value: {}
    }
  };
  var collection = Object.create(proto, propertiesObject);
  return collection;
},

// Procedure Collection Prototype
proto : {

  initialize : function (ctx) {
    this.ctx = ctx;
  },

  configure : function (config) {
    var ctx = this.ctx;
    var cc = ctx.configConstants;
    var pToCreate = config[cc.METHODS];
    _.each(pToCreate, function (obj, index) {
      var p = ctx.p.configureOrCreate(obj);
    });
  },

  configureOrCreate : function (obj) {
    var ctx = this.ctx;
    var cc = ctx.configConstants;
    var p = this.lookup(obj[cc.M_ID]);
    if (p) {
      p.configure(obj);
    } else {
      p = Procedure.build(obj[cc.M_ID]);
      p.initialize(ctx);
      p.configure(obj);
      this.library[p.id] = p;
    }
    return p;
  },

  lookup : function (id) {
    var collection = this;
    return collection.library[id];
  },

  execute : function (id, obj) {
    var collection = this;
    collection.lookup(id).execute(obj);
  }
}

};});