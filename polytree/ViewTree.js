// View Tree Dependencies
define(['underscore', 'jquery', 'polytree/ViewNode'],
function (_, $, ViewNode) {
return {

// View Tree Builder
build : function () {
  var proto = this.proto;
  var propertiesObject = {
    library: {
      value: {},
      writable: true
    },
    nodeIndex: {
      value: {},
      writable: true
    },
    dirtyNodes: {
      value: [],
      writable: true
    },
    _uidPrefix: {
      value: '_',
      writable: true
    },
    _uidCount: {
      value: 0,
      writable: true
    },
    uid: {
      set: function (prefix) {
        this._uidPrefix = prefix;
        this._uidCount = 0;
      },
      get: function () {
        return (this._uidPrefix + ++this._uidCount);
      }
    }
  };
  var viewTree = Object.create(proto, propertiesObject);
  return viewTree;
},

// View Tree Prototype
proto : {

  initialize : function (ctx) {
    this.ctx = ctx;
    this.uid = (ctx.prefix + '_v_');
  },

  configure : function (config) {
    var ctx = this.ctx;
    var cc = ctx.configConstants;
    var vToCreate = config[cc.DISTAL_NODES];
    _.each(vToCreate, function (obj, index) {
      var v = ctx.v.configureOrCreate(obj);
      ctx.v.nodeIndex[v.id] = index;
      // TODO: register this node as dirty?
    });
  },

  lookup : function (id) {
    return this.library[id];
  },

  notify : function (watcher, value) {
    var collection = this;
    var v = this.lookup(watcher[1]);
    v.notify(watcher, value);
  },

  registerDirtyNodes : function (idArr) {
    Array.prototype.push.apply(this.dirtyNodes, idArr);
  },

  refreshAll : function (idArr) {
    var collection = this;
    _.each(idArr, function (id) {
      var node = collection.lookup(id);
      node.clearInstanceCache();
      node.refresh();
    });
    // TODO: remove from dirty nodes list to prevent extra cycles?
    // make all nodes refresh through the dirty list mechanism
  },

  refresh : function () {
    while (this.dirtyNodes.length > 0) {
      this.refreshNextDirty();
    }
  },

  refreshNextDirty : function () {
    var collection = this;
    // sort and remove duplicates
    if (this.dirtyNodes.length > 0) {
      this.dirtyNodes = _.chain(this.dirtyNodes)
        .uniq()
        .sortBy(function (id) {
          return collection.nodeIndex[id];
        })
        .value();
      var nodeId = collection.dirtyNodes.shift();
      var node = collection.lookup(nodeId);
      node.refresh();
    }
  },

  configureOrCreate : function (obj) {
    var ctx = this.ctx;
    var cc = ctx.configConstants;
    var v = this.lookup(obj[cc.DN_ID]);
    if (v) {
      v.configure(obj);
    } else {
      v = ViewNode.create(obj[cc.DN_ID]);
      v.initialize(ctx);
      v.configure(obj);
      this.library[v.id] = v;
    }
    return v;
  },

  reinstantiateAll : function (idArr) {
    var collection = this;
    _.each(idArr, function (id) {
      collection.lookup(id).reinstantiate();
    });
  },

  sortNodeSet : function (nodeSetName, topDown) {
    var collection = this;
    if (topDown) {
      this[nodeSetName].sort(function (a, b) {
        collection.sortFn(a, b);
      });
    } else {
      this[nodeSetName].sort(function (a, b) {
        collection.reverseSortFn(a, b);
      });
    }
  },

  sortFn : function (idArrA, idArrB) {
    return (this.nodeIndex[idArrA[0]] > this.nodeIndex[idArrB[0]]);
  },

  reverseSortFn : function (idArrA, idArrB) {
    return (this.nodeIndex[idArrA[0]] < this.nodeIndex[idArrB[0]]);
  }
}

};});
