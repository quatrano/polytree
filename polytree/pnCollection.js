/**
 * Peripheral Node Collection
 */

define(['polytree/pn'],
	function (PN) {
		return {
			create : function () {
				var proto = this.proto;
				var propertiesObject = {
					library: {
						value: {}
					}
				};
				var pnCollection = Object.create(proto, propertiesObject);
				return pnCollection;
			},
			proto : {
				initialize : function (ctx) {
					this.ctx = ctx;
				},
				configure : function (config) {
					var ctx = this.ctx;
					var cc = ctx.configConstants;
					var pnToCreate = config[cc.PROXIMAL_NODES];
					_.each(pnToCreate, function (obj, i) {
						var pn = ctx.pn.configureOrCreate(obj);
					});
				},
				configureOrCreate : function (obj) {
					var ctx = this.ctx;
					var cc = ctx.configConstants;
					var pn = this.lookup(obj[cc.PN_ID]);
					if (pn) {
						pn.configure(obj);
					} else {
						pn = PN.create(obj[cc.PN_ID]);
						pn.initialize(ctx);
						pn.configure(obj);
						this.library[pn.id] = pn;
					}
					return pn;
				},
				lookup : function (id) {
					return this.library[id];
				}
			}
		};
	}
);