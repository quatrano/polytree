/**
 * Transformation
 */

define([],
	function () {
		return {
			create : function (id) {
				var proto = this.proto;
				var propertiesObject = {
					id: {
						value: id
					}
				};
				var transformation = Object.create(proto, propertiesObject);
				return transformation;
			},
			proto : {
				initialize : function (ctx) {
					this.ctx = ctx;
				},
				configure : function (obj) {
					var t = this;
					var ctx = t.ctx;
					var cc = ctx.configConstants;
					// function
					if (typeof(obj[cc.T_FN]) == 'function') {
						this.fn = obj[cc.T_FN];
					}
				},
				transform : function (args) {
					var t = this;
					return t.fn.apply(t.ctx, args);
				}
			}
		};
	}
);