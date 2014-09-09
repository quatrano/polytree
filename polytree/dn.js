/**
 * Distal Node
 */

define(['jquery', 'underscore', 'd3'],
	function ($, _, d3) {
		return {
			create : function (id) {
				var proto = this.proto;
				var propertiesObject = {
					id: {
						value: id
					},
					children: {
						value: []
					},
					dependencyCache: {
						value: []
					},
					staticAttributes: {
						value: {}
					},
					dynamicAttributes: {
						value: {}
					},
					superDynamicAttributes: {
						value: {}
					},
					selections: {
						value: {}
					},
					instanceCache: {
						value: false,
						writable: true,
						configurable: true
					},
					instanceLookup: {
						value: {}
					},
					parentInstanceLookup: {
						value: {}
					},
					idLookup: {
						value: {}
					},
					indexLookup: {
						value: {}
					}
				};
				var domNode = Object.create(proto, propertiesObject);
				return domNode;
			},
			proto : {
				initialize : function (ctx) {
					this.ctx = ctx;
				},
				configure : function (obj) {
					var dn = this;
					var ctx = dn.ctx;
					var cc = ctx.configConstants;
					// tag
					this.tag = obj[cc.DN_TAG];

					// type
					this.on = obj[cc.DN_ON]

					// parent
					if (obj[cc.DN_PARENT]) {
						this.parent = obj[cc.DN_PARENT];
						var parentNode = ctx.dn.lookup(this.parent);
						parentNode.registerChild(this.id);
					}
					// dependencies
					_.each(obj[cc.DN_DEP], function (dependency, index) {
						ctx.registerWatcher(dependency, ['dn', dn.id, index]);
						dn.dependencyCache.push(ctx.getValue(dependency));
					});
					// static attributes
					if (obj[cc.DN_STATIC_ATTR]) {
						this.extendTemporalData(false, null, this.staticAttributes, obj[cc.DN_STATIC_ATTR])
						// Array.prototype.push.call(this.staticAttributes, obj[cc.DN_STATIC_ATTR]);
					}
					// dynamic attributes
					if (obj[cc.DN_DYNAMIC_ATTR]) {
						this.extendTemporalData(false, null, this.dynamicAttributes, obj[cc.DN_DYNAMIC_ATTR]);
						// Array.prototype.push.call(this.dynamicAttributes, obj[cc.DN_DYNAMIC_ATTR]);
					}
					// super dynamic attributes
					if (obj[cc.DN_SUPERDYNAMIC_ATTR]) {
						this.extendTemporalData(false, null, this.superDynamicAttributes, obj[cc.DN_SUPERDYNAMIC_ATTR]);
						//Array.prototype.push.call(this.superDynamicAttributes, obj[cc.DN_SUPERDYNAMIC_ATTR]);
					}
				},
				registerChild : function (childId) {
					this.children.push(childId);
				},
				refresh : function () {
					// render children
					var dn = this;
					var ctx = dn.ctx;
					dn.joinAll();
					dn.update();
 					if (dn.instancesChanged || dn.childInstancesChanged()) {
						dn.enter();
						ctx.dn.refreshAll(_.clone(dn.children));
						dn.exit();
						dn.instancesChanged = false;
						dn.removeNonexistentInstances();
					}
					dn.order();
				},
				childInstancesChanged : function () {
					var dn = this;
					var ctx = dn.ctx;
					for (var i=0; i<dn.children.length; i++) {
						var childId = dn.children[i];
						if (ctx.dn.lookup(childId).instancesChanged) {
							return true;
						}
					}
					return false;
				},
				joinAll : function () {
					var dn = this;
					var ctx = dn.ctx;
					_.each(dn.parentInstanceLookup, function (parentInstanceId, instanceId) {
						dn.selectAndJoin(instanceId);
					});
				},
				selectAndJoin : function (instanceId) {
					var dn = this;
					var ctx = dn.ctx;
					var instanceChildData = [];
					_.each(dn.children, function (childId) {
						Array.prototype.push.apply(instanceChildData, ctx.dn.lookup(childId).getData(instanceId));
					});
					dn.select(instanceId);
					dn.join(instanceId, instanceChildData);
				},
				getData : function (parentInstanceId) {
	 				var dn = this;
	 				var ctx = dn.ctx;
	 				if (!dn.instanceCache) {
	 					// the instance cache was invalidated, recalculate
	 					dn.reinstantiate();
						dn.refreshInstanceCache();
	 				}
	 				return dn.instanceCache[parentInstanceId];
	 			},
				select : function (instanceId) {
					var instanceSelector = '#' + instanceId;
					var childSelector = instanceSelector + '>*';
					this.selections[instanceId] = d3.select(instanceSelector).selectAll(childSelector);
				},
				join : function (instanceId, data) {
					this.selections[instanceId] = this.selections[instanceId]
						.data(data, function(d) {
							return d.id;
						});
				},
	 			hardRefresh : function (parentInstanceId) {
	 				// render self - this is a special function for the root node because it has no parents :(
	 				var dn = this;
	 				var ctx = dn.ctx;
	 				var cc = ctx.configConstants;
					var instanceId = ctx.dn.uid;

					dn.instanceLookup[parentInstanceId] = instanceId;
					dn.idLookup[instanceId] = {};
					dn.indexLookup[instanceId] = {};
					dn.parentInstanceLookup[instanceId] = parentInstanceId;
					var instanceTemporalData = dn.extendTemporalData(true, instanceId, [], dn.staticAttributes, dn.dynamicAttributes);
	 				var instanceData = {
	 					tag: dn.tag,
	 					id: instanceId,
	 					kind: dn.id,
	 					index: 0,
	 					temporalData: instanceTemporalData
	 				};
	 				var parentSelector = '#' + parentInstanceId;
					var rootSelector = parentSelector + '>*';

					var selection = d3.select(parentSelector).selectAll(rootSelector);
					selection = selection.data([instanceData]);
					var enter = selection.enter().append(function (d, i) {
						var element = document.createElement(d.tag);
						element.id = d.id;
						return element;
					});
					enter = dn.instant(enter, cc.DN_ENTER);
					enter = dn.transition(enter, cc.DN_ENTER);
					var update = selection;
					update = dn.instant(update, cc.DN_UPDATE);
					update = dn.transition(update, cc.DN_UPDATE);
					
 					ctx.dn.refreshAll([dn.id]);
	 			},
				reinstantiate : function () {
					var dn = this;
					
					var conditionalInstancesChanged = false;
					var parentInstancesChanged = false;

					// check if parent instances have changed
					var parentInstances = this.getParentInstances();
					var existingParentInstances = _.keys(dn.instanceLookup);
					var parentInstancesChanged = !_.isEqual(parentInstances, existingParentInstances);

					// update
					// check if conditional instances have changed
					if (dn.on) {
						// only fix the conditional instances for existing parent instances, new instances will be ok
						_.each(existingParentInstances, function (parentInstanceId) {
							var conditionalInstances = dn.evaluateOn(parentInstanceId);
							var existingConditionalInstances = _.keys(dn.instanceLookup[parentInstanceId]);
							if (!_.isEqual(conditionalInstances, existingConditionalInstances)) {
								conditionalInstancesChanged = true;
							}
							var updatingConditionals = _.intersection(conditionalInstances, existingConditionalInstances);
							_.each(updatingConditionals, function (conditionalId) {
									var conditionalIndex = conditionalInstances.indexOf(conditionalId);
									dn.updateInstance(parentInstanceId, conditionalId, conditionalIndex);
								});

							if (conditionalInstancesChanged) {
								var enteringConditionals = _.difference(conditionalInstances, existingConditionalInstances);
								var exitingConditionals = _.difference(existingConditionalInstances, conditionalInstances);
								
								_.each(enteringConditionals, function (conditionalId) {
									var conditionalIndex = conditionalInstances.indexOf(conditionalId);
									dn.createInstance(parentInstanceId, conditionalId, conditionalIndex);
								});
								_.each(exitingConditionals, function (conditionalId, conditionalIndex) {
									var instanceId = dn.instanceLookup[parentInstanceId][conditionalId];
									dn.removeInstance(instanceId, parentInstanceId, conditionalId);
								});
							}
						});
					} else {
						_.each(existingParentInstances, function (parentInstanceId) {
							dn.updateInstance(parentInstanceId);
						});
					}

					// create references to entering instances and remove references to exiting ones
					if (parentInstancesChanged) {
						var enteringParentInstances = _.difference(parentInstances, existingParentInstances);
						if (enteringParentInstances.length > 0) {
							_.each(enteringParentInstances, function (parentInstanceId) {
								// conditional node
								if (dn.on) {
									var parentNode = dn.ctx.dn.lookup(dn.parent);
									var conditionalInstances = dn.evaluateOn(parentInstanceId);
									_.each(conditionalInstances, function (conditionalId, conditionalIndex) {
										dn.createInstance(parentInstanceId, conditionalId, conditionalIndex);
									});
								// fixed node
								} else {
									dn.createInstance(parentInstanceId);
								}
							});
						}
						var exitingParentInstances = _.difference(existingParentInstances, parentInstances);
						if (exitingParentInstances.length > 0) {
							_.each(exitingParentInstances, function (parentInstanceId) {
								// fixed node
								if (!dn.on) {
									var instanceId = dn.instanceLookup[parentInstanceId];
									dn.removeInstance(instanceId, parentInstanceId);
								// conditional node
								} else {
									var conditionalInstances = dn.evaluateOn(parentInstanceId);
									_.each(conditionalInstances, function (conditionalId) {
										var instanceId = dn.instanceLookup[parentInstanceId][conditionalId];
										dn.removeInstance(instanceId, parentInstanceId, conditionalId);
									});
								}
							});
						}
					}

					dn.instancesChanged = (parentInstancesChanged || conditionalInstancesChanged);
				},
				updateInstance : function (parentInstanceId, conditionalId, conditionalIndex) {
					// update an instance:
						// indexLookup
					var dn = this;
					var ctx = dn.ctx;
					var instanceIndexLookup = ctx.dn.lookup(dn.parent).getInstanceIndexLookup(parentInstanceId);
					// conditional
					if (typeof(conditionalId) != 'undefined' && typeof(conditionalIndex) != 'undefined') {
						var instanceId = dn.instanceLookup[parentInstanceId][conditionalId];
						instanceIndexLookup[dn.id] = conditionalIndex;
					// fixed
					} else {
						var instanceId = dn.instanceLookup[parentInstanceId];
						// don't add anything to the instance index lookup
					}
					// common
					dn.indexLookup[instanceId] = instanceIndexLookup;
				},
				createInstance : function (parentInstanceId, conditionalId, conditionalIndex) {
					// add an instance to:
						// instance lookup
						// parent instance lookup
						// idLookup
						// indexLookup
					var dn = this;
					var ctx = dn.ctx;
					var instanceId = ctx.dn.uid;
					var instanceIdLookup = ctx.dn.lookup(dn.parent).getInstanceIdLookup(parentInstanceId);
					var instanceIndexLookup = ctx.dn.lookup(dn.parent).getInstanceIndexLookup(parentInstanceId);

					// conditional
					if (typeof(conditionalId) != 'undefined' && typeof(conditionalIndex) != 'undefined') {
						if (!dn.instanceLookup[parentInstanceId]) dn.instanceLookup[parentInstanceId] = {};
						dn.instanceLookup[parentInstanceId][conditionalId] = instanceId;
						instanceIdLookup[dn.id] = conditionalId;
						instanceIndexLookup[dn.id] = conditionalIndex;
					// fixed
					} else {
						dn.instanceLookup[parentInstanceId] = instanceId;
					}
					// common
					dn.parentInstanceLookup[instanceId] = parentInstanceId;
					dn.idLookup[instanceId] = instanceIdLookup;
					dn.indexLookup[instanceId] = instanceIndexLookup;
				},
				removeInstance : function (instanceId, parentInstanceId, conditionalId) {
					// remove instance from:
						// instance lookup
						// parent instance lookup
						// id lookup
						// index lookup
					var dn = this;
					var ctx = dn.ctx;

					// conditional
					if (typeof(conditionalId) != 'undefined') {
						delete dn.instanceLookup[parentInstanceId][conditionalId];
					// fixed
					} else {
						delete dn.instanceLookup[parentInstanceId];
					}
					// common
					delete dn.idLookup[instanceId];
					delete dn.indexLookup[instanceId];
					delete dn.parentInstanceLookup[instanceId];
				},
				removeNonexistentInstances : function () {
					// remove non-existent instances from:
						// selections
						// instance cache
					var dn = this;
					_.each(dn.instanceCache, function (data, instanceId) {
						if (data.length == 0) {
							delete dn.instanceCache[instanceId];
							delete dn.selections[instanceId];
						}
					});
				},
				getInstanceIdLookup : function (instanceId) {
					return _.extend({}, this.idLookup[instanceId]);
				},
				getInstanceIndexLookup : function (instanceId) {
					return _.extend({}, this.indexLookup[instanceId]);
				},
				evaluateOn : function (parentInstanceId) {
					var dn = this;
					var ctx = dn.ctx;

					var instanceIdLookup = ctx.dn.lookup(dn.parent).getInstanceIdLookup(parentInstanceId);
					var instanceIndexLookup = ctx.dn.lookup(dn.parent).getInstanceIndexLookup(parentInstanceId);
					var value = dn.on;
					var result = dn.dependencyCache[value[0]];
					for (var i=1; i<value.length; i++) {
						if (typeof(result) != 'undefined') {
							var addressPart = value[i];
							if (typeof(addressPart) == 'object') {
								if (addressPart[0] == 'index') {
									// get the index of a ancestor instance
									addressPart = instanceIndexLookup[addressPart[1]];
								} else if (addressPart[0] == 'id') {
									// get the conditional id 
									addressPart = instanceIdLookup[addressPart[1]];
								}
							}
							result = result[addressPart];
						}
					}
					if (typeof(result) == 'object') {
						return result;
					} else {
						return [];
					}
				},
				evaluateValue : function (toEvaluate, instanceId, value) {
					var dn = this;
					var ctx = dn.ctx;
					if (toEvaluate && typeof(value) == 'object') {
						if (typeof(value[0]) == 'number') {
							// this is a reference to the dependency cache
							var result = dn.dependencyCache[value[0]];
							for (var i=1; i<value.length; i++) {
								if (typeof(result) != 'undefined') {
									var addressPart = value[i];
									if (typeof(addressPart) == 'object') {
										if (addressPart[0] == 'index') {
											// get the index of a ancestor instance
											addressPart = dn.indexLookup[instanceId][addressPart[1]];
										} else if (addressPart[0] == 'id') {
											// get the conditional id 
											addressPart = dn.idLookup[instanceId][addressPart[1]];
										}
									}
									result = result[addressPart];
								}
							}
						} else if (typeof(value[0]) == 'object') {
							// this is a reference to the indexLookup or idLookup
							if (value[0][0] == 'index') {
								// get the index of a ancestor instance
								var result = dn.indexLookup[instanceId][value[0][1]];
							} else if (value[0][0] == 'id') {
								// get the conditional id 
								var result = dn.idLookup[instanceId][value[0][1]];
							}
						}
						
						return result;
					} else {
						return value;
					}
				},
				extendTemporalData : function (toEvaluate, instanceId, target /*, sources...*/) {
					var dn = this;
					var ctx = this.ctx;
					var cc = ctx.configConstants;

					var sources = Array.prototype.slice.call(arguments, 2);
					_.each(sources, function(source) {
						if (source) {
							_.each(source, function (phase, phaseKey) {
								_.each(phase, function (subphase, subphaseKey) {
									if (!target[phaseKey]) target[phaseKey] = [];
									_.each(subphase, function (facet, facetKey) {
										if (!target[phaseKey][subphaseKey]) target[phaseKey][subphaseKey] = {};
										// text, delay, duration (don't go deeper)
										if (facetKey === cc.DN_TEXT || 
											facetKey === cc.DN_DELAY || 
											facetKey === cc.DN_DURATION) {
											target[phaseKey][subphaseKey][facetKey] = dn.evaluateValue(toEvaluate, instanceId, facet);
										// style, attribute, property (go one level deeper)
										} else if (facetKey === cc.DN_STYLE ||
											facetKey === cc.DN_ATTRIBUTE ||
											facetKey === cc.DN_PROPERTY) {
											if (!target[phaseKey][subphaseKey][facetKey]) target[phaseKey][subphaseKey][facetKey] = {};
											_.each (facet, function (value, name) {
												target[phaseKey][subphaseKey][facetKey][name] = dn.evaluateValue(toEvaluate, instanceId, value);
											});
										// handle (don't ever evaluate, this will be evaluated during event handling)
										} else if (facetKey === cc.DN_HANDLE) {
											if (!target[phaseKey][subphaseKey][facetKey]) target[phaseKey][subphaseKey][facetKey] = {};
											_.each(facet, function (handlers, eventType) {
												if (!target[phaseKey][subphaseKey][facetKey][eventType]) target[phaseKey][subphaseKey][facetKey][eventType] = [];
												_.each(handlers, function (method) {
													target[phaseKey][subphaseKey][facetKey][eventType].push(method);
												});
											});
										} else {
											console.log('error');
										}
									});
								});
							});
						}
					});
					return target;
				},
				refreshInstanceCache : function (instanceId) {
					var dn = this;
					var ctx = dn.ctx;

					// first, clear the cache
					dn.instanceCache = {};

					// next, re-populate it
					// the dynamic attributes will be the same for all instances of this node, so calculate them once:
					var dynamicAttributes = dn.extendTemporalData(true, null, [], dn.staticAttributes, dn.dynamicAttributes);

					// fixed node
					if (!dn.on) {
						// for a fixed node, the instance index will be the same for all instances
						var parentNode = ctx.dn.lookup(dn.parent);
						var instanceIndex = parentNode.children.indexOf(dn.id);
						_.each(dn.instanceLookup, function (instance, parentInstanceId) {
							var instanceId = instance;
							var instanceTemporalData = dn.extendTemporalData(true, instanceId, [], dynamicAttributes, dn.superDynamicAttributes);
			 				var instanceData = {
			 					tag: dn.tag,
			 					id: instanceId,
			 					kind: dn.id,
			 					index: instanceIndex,
			 					temporalData: instanceTemporalData
			 				};
			 				dn.instanceCache[parentInstanceId] = [instanceData];
						});
					// conditional node
					} else {
						_.each(dn.instanceLookup, function (instance, parentInstanceId) {
							var data = [];
							_.each(instance, function (instanceId, conditionalId) {
								var instanceIndex = dn.indexLookup[instanceId][dn.id];
								var instanceTemporalData = dn.extendTemporalData(true, instanceId, [], dynamicAttributes, dn.superDynamicAttributes);
				 				var instanceData = {
				 					tag: dn.tag,
				 					id: instanceId,
				 					kind: dn.id,
				 					index: instanceIndex,
				 					temporalData: instanceTemporalData
				 				};
				 				data.push(instanceData);
							});
			 				dn.instanceCache[parentInstanceId] = data;
						});
					}
				},
				getParentInstances : function () {
					var parent = this.ctx.dn.lookup(this.parent);
					return parent.getInstances();
				},
				getInstances : function () {
					return _.keys(this.parentInstanceLookup);
				},
				update : function () {
					var dn = this;
					var ctx = dn.ctx;
					var cc = ctx.configConstants;

					_.each(this.selections, function (selection) {
						selection = dn.instant(selection, cc.DN_UPDATE);
						selection = dn.transition(selection, cc.DN_UPDATE);
					});
				},
				enter : function () {
					var dn = this;
					var ctx = dn.ctx;
					var cc = ctx.configConstants;

					_.each(dn.selections, function (selection) {
						var enter = selection.enter().append(function (d, i) {
							if (d.tag === 'svg') {
								// TODO: handle all name spaces
								var element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
							} else if (d.tag === 'path') {
								var element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
							} else {
								var element = document.createElement(d.tag);
							}
// TODO: prevent a duplicate element from entering briefly when the element exits
// console.log('entering ' + d.id);
							element.id = d.id;
							element.setAttribute('kind', d.kind);
							return element;
						});
						enter = dn.instant(enter, cc.DN_ENTER);
						enter = dn.transition(enter, cc.DN_ENTER);
					});
				},
				exit : function () {
					var dn = this;
					var ctx = dn.ctx;
					var cc = ctx.configConstants;

					_.each(this.selections, function (selection) {
						var exit = selection.exit();
						exit = dn.instant(exit, cc.DN_EXIT);
						exit = dn.transition(exit, cc.DN_EXIT);
						//exit = exit.remove();
					});
				},
				order : function () {
					_.each(this.selections, function (selection) {
						selection.sort(function (a, b) {
							return (a.index - b.index);
						});
						//selection.order();
					});
				},
				instant : function (selection, phase) {
					var dn = this;
					var ctx = dn.ctx;
					var cc = ctx.configConstants;

					var instant = selection;
					instant = dn.apply(instant, phase, cc.DN_INSTANT);
					return instant;
				},
				transition : function (selection, phase) {
					var dn = this;
					var ctx = dn.ctx;
					var cc = ctx.configConstants;

					var transition = selection;
					transition = dn.apply(transition, phase, cc.DN_TRANSITION);
					return transition;
				},
				apply : function (selection, phase, subphase) {
					var dn = this;
					var ctx = dn.ctx;
					var cc = ctx.configConstants;

					selection.each(function (d, i) {
						var node = d3.select(this);
						var temporalData = d.temporalData;

						if (temporalData && temporalData[phase] && temporalData[phase][subphase]) {
							// transition
							if (subphase == cc.DN_TRANSITION) {
								// cancel any previous transition?
								// node.transition().duration(0);
								node = node.transition();
								node.duration(temporalData[phase][subphase][cc.DN_DURATION]);
								node.delay(temporalData[phase][subphase][cc.DN_DELAY]);
							}

							// text
							var text = temporalData[phase][subphase][cc.DN_TEXT];
							if (text) {
								node.text(text);
							}

							// handle
							var handle = temporalData[phase][subphase][cc.DN_HANDLE];
							if (handle) {
								_.each(handle, function (methods, eventType) {
									var nsType = eventType + '.' + ctx.ns;
									node.on(nsType, function (d) {
										_.each(methods, function (method, methodIndex) {
											var evaluatedArgs = [];
											_.each(method[cc.DN_H_ARGS], function (arg) {
												var childDn = ctx.dn.lookup(d.kind);
												evaluatedArgs.push(childDn.evaluateValue(true, d.id, arg));
											});
											ctx.execute(method[cc.DN_H_METHOD], evaluatedArgs);
										});
									}, false); // todo: capture: method[cc.DN_H_CAPTURE]
								});
							}

							// style
							var style = temporalData[phase][subphase][cc.DN_STYLE];
							if (style) {
								_.each(style, function (value, name) {
									// TODO: add !important capability?
									node = node.style(name, value);
								});
							}

							// attribute
							var attr = temporalData[phase][subphase][cc.DN_ATTRIBUTE];
							if (attr) {
								_.each(attr, function (value, name) {
									node.attr(name, value);
								});
							}

							// property
							var prop = temporalData[phase][subphase][cc.DN_PROPERTY];
							if (prop) {
								_.each(prop, function (value, name) {
									node.property(name, value);
								});
							}

							// remove
							if (phase == cc.DN_EXIT) {
								node = node.remove();
							}
						}
					});
					return selection;
				},
				clearInstanceCache : function () {
					this.instanceCache = false;
				},
				notify : function (watcher, value) {
					var dn = this;
					var ctx = dn.ctx;
					// watcher[0] refers to the collection
					// watcher[1] refers to the nodex
					// watcher[2] refers to the index of this dependency
					dn.dependencyCache[watcher[2]] = value;
					dn.clearInstanceCache();
					ctx.dn.registerDirtyNodes([dn.parent]);
	 			}
			}
		};
	}
);