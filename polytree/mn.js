/**
 * Medial Node
 */

define(['underscore'],
	function (_) {
		return {
			create : function (id) {
				var proto = this.proto;
				var propertiesObject = {
					id: {
						value: id
					},
					cache: {
						value: []
					},
					transformations: {
						value: []
					},
					instances: {
						value: []
					},
					instanceLookup: {
						value: {}
					},
					watchers: {
						value: []
					},
					kvMap: {
						value: {}
					},
					value: {
						value: undefined,
						writable: true
					}
				};
				var schemaNode = Object.create(proto, propertiesObject);
				return schemaNode;
			},
			proto : {
				initialize : function (ctx) {
					this.ctx = ctx;
				},
				configure : function (obj) {
					var mn = this;
					var ctx = mn.ctx;
					var cc = ctx.configConstants;
					// dependencies
					_.each(obj[cc.MN_DEP], function (dependency, index) {
						ctx.registerWatcher(dependency, ['mn', mn.id, index]);
						mn.cache.push(ctx.getValue(dependency));
					});
					// transformations
					_.each(obj[cc.MN_T], function (transformation) {
						mn.transformations.push(transformation);
					});
					// watchers
					_.each(obj[cc.MN_WATCHERS], function (watcher) {
						mn.watchers.push(watcher);
					});
				},
				getValue : function (value) {
					var mn = this;
					var ctx = mn.ctx;
					if (typeof(value) == 'object') {
						// this value is a reference
						if (value[0] == null) {
							// reference to previous result
							var result = mn.value;
						} else {
							var result = mn.cache[value[0]];
						}
						// now drill into the value
						for (var i=1; i<value.length; i++) {
							var addressPart = value[i];
							if (result != undefined) {
								result = result[addressPart];
							}
						}
						return result;
					} else {
						return value;
					}
				},
				evaluateArgs : function (args) {
					var mn = this;
					var ctx = mn.ctx;
					var evaluated = [];
					_.each(args, function (arg) {
						evaluated.push(mn.getValue(arg));
					});
					return evaluated;
				},
				recalculate : function () {
					var mn = this;
					var ctx = mn.ctx;
					var cc = ctx.configConstants;
					mn.value = undefined;
					_.each(mn.transformations, function (t) {
						var transformation = ctx.t.lookup(t[cc.T_ID]);
						var args = t[cc.MN_T_ARGS];
						var evaluatedArgs = mn.evaluateArgs(args);
						mn.value = transformation.transform(evaluatedArgs);
					});
					_.each(mn.watchers, function (watcher) {
						ctx[watcher[0]].notify(watcher, mn.value);
					});
				},
				notify : function (watcher, value) {
					var mn = this;
					var ctx = mn.ctx;
					this.cache[watcher[2]] = value;
					ctx.mn.registerNodesToRecalculate([this.id]);
				}
			}
		};
	}
);