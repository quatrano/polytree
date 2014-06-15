/**
 * Method
 */

define([],
	function () {
		return {
			create : function (id) {
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
				var method = Object.create(proto, propertiesObject);
				return method;
			},
			proto : {
				initialize : function (ctx) {
					this.ctx = ctx;
				},
				configure : function (obj) {
					var m = this;
					var ctx = m.ctx;
					var cc = ctx.configConstants;
					// function
					if (typeof(obj[cc.M_FN]) == 'function') {
						m.fn = obj[cc.M_FN];
					}
				},
				execute : function (arguments) {
					var method = this;
					if (typeof(this.fn == 'function')) {
						method.fn.apply(method.ctx, arguments);
					}
				}
			}
		};
	}
);