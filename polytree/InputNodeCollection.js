// Input Node Collection Dependencies
define(['underscore', 'polytree/InputNode'],
function (_, InputNode) {
return {

// Input Node Collection Builder
build : function () {
  var proto = this.proto;
  var propertiesObject = {
    library: {
      value: {}
    }
  };
  var InputNodeCollection = Object.create(proto, propertiesObject);
  return InputNodeCollection;
},

// Input Node Collection Prototype
proto : {
  initialize : function (ctx) {
    this.ctx = ctx;
  },
  configure : function (config) {
    var ctx = this.ctx;
    var cc = ctx.configConstants;
    var iToCreate = config[cc.PROXIMAL_NODES];
    _.each(iToCreate, function (obj, i) {
      var inputNode = ctx.i.configureOrCreate(obj);
    });
  },
  configureOrCreate : function (obj) {
    var ctx = this.ctx;
    var cc = ctx.configConstants;
    var i = this.lookup(obj[cc.PN_ID]);
    if (i) {
      i.configure(obj);
    } else {
      i = InputNode.create(obj[cc.PN_ID]);
      i.initialize(ctx);
      i.configure(obj);
      this.library[i.id] = i;
    }
    return i;
  },
  lookup : function (id) {
    return this.library[id];
  }
}

};});
