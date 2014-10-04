// Procedure Dependencies
define([],
function () {
return {

// Procedure Builder
build : function (id) {
  var proto = this.proto;
  var propertiesObject = {
    id: {
      value: id
    },
    fn: {
      value: undefined,
      writable: true
    }
  };
  var procedure = Object.create(proto, propertiesObject);
  return procedure;
},

// Procedure Prototype
proto : {

  initialize : function (ctx) {
    this.ctx = ctx;
  },

  configure : function (obj) {
    var p = this;
    var ctx = p.ctx;
    var cc = ctx.configConstants;
    // function
    if (typeof(obj[cc.M_FN]) == 'function') {
      p.fn = obj[cc.M_FN];
    }
  },

  execute : function (arguments) {
    var p = this;
    var ctx = p.ctx;
    if (typeof(p.fn == 'function')) {
      p.fn.apply(ctx, arguments);
    }
  }
}

};});