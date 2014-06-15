/**
 * polytree context
 */

define(['jquery', 'polytree/mCollection', 'polytree/tCollection', 'polytree/pnCollection', 'polytree/mnCollection', 'polytree/dnCollection'],
	function ($, mCollection, tCollection, pnCollection, mnCollection, dnCollection) {
		return {
			create : function (ns, rootInstanceId) {
				var proto = this.proto;
				var propertiesObject = {
					ns: {
						value: ns
					},
					rootInstanceId: {
						value: rootInstanceId
					}
				};
				var ctx = Object.create(proto, propertiesObject);

				// create the collections
				ctx.m = mCollection.create();
				ctx.t = tCollection.create();
				ctx.pn = pnCollection.create();
				ctx.mn = mnCollection.create();
				ctx.dn = dnCollection.create();

				return ctx;
			},
			proto : {
				projectConstants : {
					METHODS: 'methods',
						M_ID: 'id',
						M_FN: 'fn',
					TRANSFORMATIONS: 'transformations',
						T_ID: 'id',
						T_FN: 'fn',
					PROXIMAL_NODES: 'originalDataNodes',
						PN_ID: 'id',
						PN_VALUE: 'value',
					MEDIAL_NODES: 'derivedDataNodes',
						MN_ID: 'id',
						MN_T: 'transformations',
							MN_T_ID: 'id',
							MN_T_ARGS: 'arguments',
						MN_DEP: null,
					DISTAL_NODES: 'viewNodes',
						DN_ID: 'id',
						DN_TAG: 'tag',
						DN_ON: 'on',
						DN_PARENT: 'parent',
						DN_DEP: null,
						DN_ENTER: 'enter',
							DN_INSTANT: 'instant',
								DN_TEXT: 'text',
								DN_HANDLE: 'handle',
									DN_H_METHOD: 'method',
									DN_H_ARGS: 'arguments',
									// DN_H_CAPTURE: 'capture',
								DN_STYLE: 'style',
									// styleName : styleValue
								DN_ATTRIBUTE: 'attribute',
									// attrName : attrValue
								DN_PROPERTY: 'property',
									// propName : propValue
							DN_TRANSITION: 'transition',
								DN_DELAY: 'delay',
								DN_DURATION: 'duration',
						DN_UPDATE: 'update',
						DN_EXIT: 'exit'
				},
				configConstants : {
					METHODS: 0,
						M_ID: 0,
						M_FN: 1,
					TRANSFORMATIONS: 1,
						T_ID: 0,
						T_FN: 1,
						T_ARGS: 2,
					PROXIMAL_NODES: 2,
						PN_ID: 0,
						PN_WATCHERS: 1,
						PN_VALUE: 2,
					MEDIAL_NODES: 3,
						MN_ID: 0,
						MN_WATCHERS: 1,
						MN_T: 2,
							MN_T_ID: 0,
							MN_T_ARGS: 1,
						MN_DEP: 3,
					DISTAL_NODES: 4,
						DN_ID: 0,
						DN_TAG: 1,
						DN_ON: 2,
						DN_PARENT: 3,
						DN_DEP: 4,
						DN_STATIC_ATTR: 5,
							DN_ENTER: 0,
								DN_INSTANT: 0,
									DN_TEXT: 't',
									DN_HANDLE: 'h',
										DN_H_METHOD: 0,
										DN_H_ARGS: 1,
										// DN_H_CAPTURE: 2,
									DN_STYLE: 's',
										// styleName : styleValue
									DN_ATTRIBUTE: 'a',
										// attrName : attrValue
									DN_PROPERTY: 'p',
										// propName : propValue
								DN_TRANSITION: 1,
									DN_DELAY: 'w',
									DN_DURATION: 'd',
							DN_UPDATE: 1,
							DN_EXIT: 2,
						DN_DYNAMIC_ATTR: 6,
						DN_SUPERDYNAMIC_ATTR:7
				},
				initialize : function () {
					this.m.initialize(this);
					this.t.initialize(this);
					this.pn.initialize(this);
					this.mn.initialize(this);
					this.dn.initialize(this);
				},
				configure : function (config) {
					this.m.configure(config);
					this.t.configure(config);
					// for the time being pn doesn't require configuration
					this.pn.configure(config);
					this.mn.configure(config);
					this.dn.configure(config);

					// insert the root node
					this.dn.lookup('root').hardRefresh(this.rootInstanceId);
					this.render();
				},
				getValue : function (nodeReference) {
					var node = this[nodeReference[0]].lookup(nodeReference[1]);
					if (node) {
						return node.value;
					} else {
						return undefined;
					}
				},
				getState : function (id) {
					var proximalNode = this.pn.lookup(id);
					if (proximalNode) {
						return proximalNode.value;
					} else {
						return undefined;
					}
				},
				setState : function (id, value) {
					var ctx = this;
					var cc = ctx.configConstants;
					var obj = [];
					obj[cc.PN_ID] = id;
					obj[cc.PN_VALUE] = value;
					ctx.pn.configureOrCreate(obj);
				},
				render : function () {
					// recalculate the medial nodes whose dependencies have changed
					this.mn.recalculate();
					// refresh the distal nodes whose dependencies have changed
					this.dn.refresh();
				},
				run : function (id, arguments) {
					var ctx = this;
					ctx.m.execute(id, arguments);
				},
				execute : function (id, arguments) {
					var ctx = this;
					ctx.m.execute(id, arguments);
					ctx.render();
				},
				dispatch : function (event) {
					var data = event.data;
					var id = _.first(data);
					var arguments = _.rest(data);
					this.methodCollection.run(id, arguments);
				},
				expand : function (keyArr) {
					var node = this[keyArr[0]].lookup(keyArr[1]);
					var value = node.getValue(keyArr);
					return value;
				},
				registerWatcher : function (watched, watcher) {
					var cc = this.configConstants;
					var obj = [];
					// there are two types of nodes that can be watched
					if (watched[0] == 'mn') {
						obj[cc.MN_ID] = watched[1];
						obj[cc.MN_WATCHERS] = [watcher];
					} else if (watched[0] == 'pn') {
						obj[cc.PN_ID] = watched[1];
						obj[cc.PN_WATCHERS] = [watcher];
					}
					this[watched[0]].configureOrCreate(obj);
				},
				extractDependencies : function (obj, dependencyLookup, dependencies) {
					// extract dependencies and measure degree of dynamism
					// returns { dynamism: degree, result: result }
					var ctx = this;
					var cc = ctx.configConstants;
					var result = obj;
					var degree = cc.DN_STATIC_ATTR;
					if (typeof(obj) == 'object' && typeof(obj[0]) == 'string') {
						// obj is a nodeReference: [collectionName, objectName, address ... ]
						result = [];
						degree = cc.DN_DYNAMIC_ATTR;
						// add or locate the dependency
						var dependencyIndex = undefined;
						var collectionPointer = dependencyLookup[obj[0]];
						if (collectionPointer) {
							dependencyIndex = collectionPointer[obj[1]];
						} else {
							dependencyLookup[obj[0]] = {};
						}
						if (typeof(dependencyIndex) == 'undefined') {
							// the dependency does not yet exist
							dependencyIndex = dependencies.length;
							dependencies.push([obj[0], obj[1]]);
							dependencyLookup[obj[0]][obj[1]] = dependencyIndex;
						}
						// create the resulting reference
						result.push(dependencyIndex);
						// add the remaining address parts
						for (var i=2; i<obj.length; i++) {
							if (typeof(obj[i]) == 'object') {
								degree = cc.DN_SUPERDYNAMIC_ATTR;
							}
							result.push(obj[i]);
						}
					}
					return { dynamism: degree, result: result };
				},
				compressProject : function (project) {
					var ctx = this;
					var cc = ctx.configConstants;
					var pc = ctx.projectConstants;

					var config = [];

					// methods
					var methods = [];
					config[cc.METHODS] = methods;
					_.each(project[pc.METHODS], function (method) {
						var m = [];
						m[cc.M_ID] = method[pc.M_ID];
						m[cc.M_FN] = method[pc.M_FN];
						methods.push(m);
					});

					// transformations
					var transformations = [];
					_.each(project[pc.TRANSFORMATIONS], function (transformation) {
						var t = [];
						t[cc.T_ID] = transformation[pc.T_ID];
						t[cc.T_FN] = transformation[pc.T_FN];
						transformations.push(t);
					});
					config[cc.TRANSFORMATIONS] = transformations;

					// proximalNodes
					var proximalNodes = [];
					_.each(project[pc.PROXIMAL_NODES], function (proximalNode) {
						var pn = [];
						pn[cc.PN_ID] = proximalNode[pc.PN_ID];
						pn[cc.PN_VALUE] = proximalNode[pc.PN_VALUE];
						proximalNodes.push(pn);
					});
					config[cc.PROXIMAL_NODES] = proximalNodes;

					// medialNodes
					var medialNodes = [];
					_.each(project[pc.MEDIAL_NODES], function (medialNode) {
						var mn = [];
						mn[cc.MN_ID] = medialNode[pc.MN_ID];
						var dependencyLookup = {};
						var dependencies = [];
						mn[cc.MN_DEP] = dependencies;
						mn[cc.MN_T] = [];
						_.each(medialNode[pc.MN_T], function (transformation) {
							var t = [];
							t[cc.MN_T_ID] = transformation[pc.MN_T_ID];
							var args = [];
							t[cc.MN_T_ARGS] = args;
							_.each(transformation[pc.MN_T_ARGS], function (argument) {
								var arg = ctx.extractDependencies(argument, dependencyLookup, dependencies);
								args.push(arg.result);
							});
							mn[cc.MN_T].push(t);
						});
						medialNodes.push(mn);
					});
					config[cc.MEDIAL_NODES] = medialNodes;

					// Distal Nodes
					var distalNodes = [];
					_.each(project[pc.DISTAL_NODES], function (outputNode) {
						var dn = [];
						dn[cc.DN_ID] = outputNode[pc.DN_ID];
						dn[cc.DN_TAG] = outputNode[pc.DN_TAG];
						dn[cc.DN_PARENT] = outputNode[pc.DN_PARENT];
						var dependencies = [];
						dn[cc.DN_DEP] = dependencies;
						var dependencyLookup = {};

						// conditional
						if (outputNode[pc.DN_ON]) {
							var on = ctx.extractDependencies(outputNode[pc.DN_ON], dependencyLookup, dependencies);
							dn[cc.DN_ON] = on.result;
						} else {
							dn[cc.DN_ON] = false;
						}

						var dynamismKeys = ['DN_STATIC_ATTR', 'DN_DYNAMIC_ATTR', 'DN_SUPERDYNAMIC_ATTR'];
						var phaseKeys = ['DN_ENTER', 'DN_UPDATE', 'DN_EXIT'];
						var subphaseKeys = ['DN_INSTANT', 'DN_TRANSITION'];

						_.each(dynamismKeys, function (dynamismKey) {
							dn[cc[dynamismKey]] = [];
							_.each(phaseKeys, function (phaseKey) {
								dn[cc[dynamismKey]][cc[phaseKey]] = [];
								_.each(subphaseKeys, function (subphaseKey) {
									dn[cc[dynamismKey]][cc[phaseKey]][cc[subphaseKey]] = {};
								});
							});
						});

						_.each(phaseKeys, function (phaseKey) {
							_.each(subphaseKeys, function (subphaseKey) {

								if (subphaseKey == 'DN_TRANSITION') {
									// duration
									if (outputNode[pc.DN_DURATION] && 
										outputNode[pc.DN_DURATION][pc[phaseKey]]) {
										// there can only be one duration per sub-phase
										var duration = ctx.extractDependencies(outputNode[pc.DN_DURATION][pc[phaseKey]], dependencyLookup, dependencies);
										dn[duration.dynamism][cc[phaseKey]][cc[subphaseKey]][cc.DN_DURATION] = duration.result;
									} else {
										// TODO: remove these defaults?
										dn[cc.DN_STATIC_ATTR][cc[phaseKey]][cc[subphaseKey]][cc.DN_DURATION] = 400;
									}

									// delay
									if (outputNode[pc.DN_DELAY] && 
										outputNode[pc.DN_DELAY][pc[phaseKey]]) {
										// there can only be one delay per sub-phase
										var delay = ctx.extractDependencies(outputNode[pc.DN_DELAY][pc[phaseKey]], dependencyLookup, dependencies);
										dn[delay.dynamism][cc[phaseKey]][cc[subphaseKey]][cc.DN_DELAY] = delay.result;
									} else {
										dn[cc.DN_STATIC_ATTR][cc[phaseKey]][cc[subphaseKey]][cc.DN_DELAY] = 0;
									}
								}

								// text
								if (outputNode[pc.DN_TEXT] && 
									outputNode[pc.DN_TEXT][pc[phaseKey]] && 
									outputNode[pc.DN_TEXT][pc[phaseKey]][pc[subphaseKey]]) {
									// there can only be one text per sub-phase
									var text = ctx.extractDependencies(outputNode[pc.DN_TEXT][pc[phaseKey]][pc[subphaseKey]], dependencyLookup, dependencies);
									dn[text.dynamism][cc[phaseKey]][cc[subphaseKey]][cc.DN_TEXT] = text.result;
								}
								// handle
								if (outputNode[pc.DN_HANDLE] && 
									outputNode[pc.DN_HANDLE][pc[phaseKey]] &&
									outputNode[pc.DN_HANDLE][pc[phaseKey]][pc[subphaseKey]]) {
									var h = {};
									_.each(outputNode[pc.DN_HANDLE][pc[phaseKey]][pc[subphaseKey]], function (methods, eventType) {
										var e = [];
										_.each(methods, function (method, methodIndex) {
											var m = [];
											m[cc.DN_H_METHOD] = method[pc.DN_H_METHOD];
											m[cc.DN_H_ARGS] = method[pc.DN_H_ARGS];
											// m[cc.DN_H_CAPTURE] = method[pc.DN_H_CAPTURE];
											e.push(m);
										});
										h[eventType] = e;
									});
									// handles are evaluated when the event is triggered, so treat them all as static
									dn[cc.DN_STATIC_ATTR][cc[phaseKey]][cc[subphaseKey]][cc.DN_HANDLE] = h;
								}
								// style
								if (outputNode[pc.DN_STYLE] && 
									outputNode[pc.DN_STYLE][pc[phaseKey]] &&
									outputNode[pc.DN_STYLE][pc[phaseKey]][pc[subphaseKey]]) {
									_.each(outputNode[pc.DN_STYLE][pc[phaseKey]][pc[subphaseKey]], function (value, name) {
										var v = ctx.extractDependencies(value, dependencyLookup, dependencies);
										var styles = dn[v.dynamism][cc[phaseKey]][cc[subphaseKey]][cc.DN_STYLE];
										if (!styles) {
											styles = {};
											dn[v.dynamism][cc[phaseKey]][cc[subphaseKey]][cc.DN_STYLE] = styles;
										}
										styles[name] = v.result;
									});
								}
								// attribute
								if (outputNode[pc.DN_ATTRIBUTE] && 
									outputNode[pc.DN_ATTRIBUTE][pc[phaseKey]] &&
									outputNode[pc.DN_ATTRIBUTE][pc[phaseKey]][pc[subphaseKey]]) {
									_.each(outputNode[pc.DN_ATTRIBUTE][pc[phaseKey]][pc[subphaseKey]], function (value, name) {
										var v = ctx.extractDependencies(value, dependencyLookup, dependencies);
										var attributes = dn[v.dynamism][cc[phaseKey]][cc[subphaseKey]][cc.DN_ATTRIBUTE];
										if (!attributes) {
											attributes = {};
											dn[v.dynamism][cc[phaseKey]][cc[subphaseKey]][cc.DN_ATTRIBUTE] = attributes;
										}
										attributes[name] = v.result;
									});
								}
								// property
								if (outputNode[pc.DN_PROPERTY] && 
									outputNode[pc.DN_PROPERTY][pc[phaseKey]] &&
									outputNode[pc.DN_PROPERTY][pc[phaseKey]][pc[subphaseKey]]) {
									_.each(outputNode[pc.DN_PROPERTY][pc[phaseKey]][pc[subphaseKey]], function (value, name) {
										var v = ctx.extractDependencies(value, dependencyLookup, dependencies);
										var properties = dn[v.dynamism][cc[phaseKey]][cc[subphaseKey]][cc.DN_PROPERTY];
										if (!properties) {
											properties = {};
											dn[v.dynamism][cc[phaseKey]][cc[subphaseKey]][cc.DN_PROPERTY] = properties;
										}
										properties[name] = v.result;
									});
								}
							});
						});
						distalNodes.push(dn);
					});
					config[cc.DISTAL_NODES] = distalNodes;

					return config;
				}
			}
		};
	});