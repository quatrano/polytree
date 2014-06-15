/**
 * Medial Node Collection
 */

define(['polytree/mn'],
	function (MN) {
		return {
			create : function () {
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

				var mnCollection = Object.create(proto, propertiesObject);
				return mnCollection;
			},
			proto : {
				initialize : function (ctx) {
					this.ctx = ctx;
				},
				configure : function (config) {
					var ctx = this.ctx;
					var cc = ctx.configConstants;
					var mnToCreate = config[cc.MEDIAL_NODES];
					_.each(mnToCreate, function (obj, i) {
						var mn = ctx.mn.configureOrCreate(obj);
						ctx.mn.nodeIndex[mn.id] = i;
						ctx.mn.registerNodesToRecalculate([mn.id]);
					});
				},
				configureOrCreate : function (obj) {
					var ctx = this.ctx;
					var cc = ctx.configConstants;
					var mn = this.lookup(obj[cc.MN_ID]);
					if (mn) {
						mn.configure(obj);
					} else {
						mn = MN.create(obj[cc.MN_ID]);
						mn.initialize(ctx);
						mn.configure(obj);
						this.library[mn.id] = mn;
					}
					return mn;
				},
				notify : function (watcher, value) {
					var mn = this.lookup(watcher[1]);
					if (mn) {
						mn.notify(watcher, value);
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
					collection.sortNodeSet('nodesToRecalculate');
					while (this.nodesToRecalculate.length > 0) {
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
				}
			}
		};
	}
);