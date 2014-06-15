/**
 * M Collection
 */

define(['polytree/m'],
	function (M) {
		return {
			create : function () {
				var proto = this.proto;
				var propertiesObject = {
					library: {
						value: {}
					}
				};
				var collection = Object.create(proto, propertiesObject);
				return collection;
			},
			proto : {
				initialize : function (ctx) {
					this.ctx = ctx;
				},
				configure : function (config) {
					var ctx = this.ctx;
					var cc = ctx.configConstants;
					var mToCreate = config[cc.METHODS];
					_.each(mToCreate, function (obj, i) {
						var m = ctx.m.configureOrCreate(obj);
					});
				},
				configureOrCreate : function (obj) {
					var ctx = this.ctx;
					var cc = ctx.configConstants;
					var m = this.lookup(obj[cc.M_ID]);
					if (m) {
						m.configure(obj);
					} else {
						m = M.create(obj[cc.M_ID]);
						m.initialize(ctx);
						m.configure(obj);
						this.library[m.id] = m;
					}
					return m;
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
		};
	}
);