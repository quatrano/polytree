/**
 * Distal Node Collection
 */

define(['jquery', 'underscore', 'polytree/dn'],
	function ($, _, DN) {
		return {
			create : function () {
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
				var dnCollection = Object.create(proto, propertiesObject);
				return dnCollection;
			},
			proto : {
				initialize : function (ctx) {
					this.ctx = ctx;
					this.uid = (ctx.ns + '_dn_');
				},
				configure : function (config) {
					var ctx = this.ctx;
					var cc = ctx.configConstants;
					var dnToCreate = config[cc.DISTAL_NODES];
					_.each(dnToCreate, function (obj, i) {
						var dn = ctx.dn.configureOrCreate(obj);
						ctx.dn.nodeIndex[dn.id] = i;
						// TODO: register this node as dirty?
					});
				},
				lookup : function (id) {
					return this.library[id];
				},
				notify : function (watcher, value) {
					var collection = this;
					var dn = this.lookup(watcher[1]);
					dn.notify(watcher, value);
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
					if (idArr.length > 0) {
						idArr.unshift(collection.dirtyNodes);
						collection.dirtyNodes = _.without.apply(collection, idArr);
					}
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
					var dn = this.lookup(obj[cc.DN_ID]);
					if (dn) {
						dn.configure(obj);
					} else {
						dn = DN.create(obj[cc.DN_ID]);
						dn.initialize(ctx);
						dn.configure(obj);
						this.library[dn.id] = dn;
					}
					return dn;
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
		};
	}
);