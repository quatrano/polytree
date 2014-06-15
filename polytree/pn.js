/**
 * State
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
					watchers: {
						value: []
					},
					value: {
						value: undefined,
						writable: true
					}
				};
				var state = Object.create(proto, propertiesObject);
				return state;
			},
			proto : {
				initialize : function (ctx) {
					this.ctx = ctx;
				},
				configure : function (obj) {
					var pn = this;
					var ctx = pn.ctx;
					var cc = ctx.configConstants;
					// watchers
					_.each(obj[cc.PN_WATCHERS], function (watcher) {
						pn.watchers.push(watcher);
					});
					if (typeof(obj[cc.PN_VALUE]) !== 'undefined') {
						this.update(obj[cc.PN_VALUE]);
					}
				},
				update : function (value) {
					var pn = this;
					var ctx = pn.ctx;
					pn.value = value;
					_.each(pn.watchers, function (watcher) {
						ctx[watcher[0]].notify(watcher, value);
					});
				}
			}
		};
	}
);