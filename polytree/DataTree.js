// Data Tree Dependencies
define(['underscore', 'polytree/DataNode'],
function (_, DataNode) {
return {

// Data Tree Builder
build : function () {
  var proto = this.proto;
  var propertiesObject = {
    library: {
      value: {}
    },
    nodeIndex: {
      value: {}
    },
    nodesToRecalculate: {
      value: []
    }
  };

  var dataTree = Object.create(proto, propertiesObject);
  return dataTree;
},

// Data Tree Prototype
proto : {

  initialize : function (ctx) {
    this.ctx = ctx;
  },

  configure : function (config) {
    var ctx = this.ctx;
    var cc = ctx.configConstants;
    var dToCreate = config[cc.MEDIAL_NODES];
    _.each(dToCreate, function (obj, i) {
      var d = ctx.d.configureOrCreate(obj);
      ctx.d.nodeIndex[d.id] = i;
      ctx.d.registerNodesToRecalculate([d.id]);
    });
  },

  configureOrCreate : function (obj) {
    var ctx = this.ctx;
    var cc = ctx.configConstants;
    var d = this.lookup(obj[cc.MN_ID]);
    if (d) {
      d.configure(obj);
    } else {
      d = DataNode.build(obj[cc.MN_ID]);
      d.initialize(ctx);
      d.configure(obj);
      this.library[d.id] = d;
    }
    return d;
  },

  notify : function (watcher, value) {
    var d = this.lookup(watcher[1]);
    if (d) {
      d.notify(watcher, value);
    } else {
      console.log('error');
    }
  },

  lookup : function (id) {
    return this.library[id];
  },

  registerNodesToRecalculate : function (idArr) {
    Array.prototype.push.apply(this.nodesToRecalculate, idArr);
  },

  recalculate : function () {
    var collection = this;
    while (this.nodesToRecalculate.length > 0) {
      collection.sortNodeSet('nodesToRecalculate');
      collection.deDupeSortedNodeSet('nodesToRecalculate');
      var nodeId = this.nodesToRecalculate.shift();
      var node = this.lookup(nodeId);
      node.recalculate();
    }
  },

  sortNodeSet : function (nodeSetName) {
    var collection = this;
    this[nodeSetName].sort(function (idA, idB) {
      if (collection.nodeIndex[idA] > collection.nodeIndex[idB]) {
        return 1;
      } else {
        return -1;
      }
    });
  },

  deDupeSortedNodeSet : function (nodeSetName) {
    var i = 1;
    var nodeSet = this[nodeSetName];
    while (i < nodeSet.length) {
      if (nodeSet[i - 1] === nodeSet[i]) {
        nodeSet.splice(i, 1);
      } else {
        i++;
      }
    }
  }
}

};});
