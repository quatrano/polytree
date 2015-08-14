/**
 * Distal Node
 */

define(['underscore', 'jquery', 'd3'],
  function (_, $, d3) {
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

          // map of parentInstanceId to an array of instanceIds
          instanceCache: {
            value: false,
            writable: true,
            configurable: true
          },

          // map of childInstanceId to dereferenced data for child instances
          childInstanceData: {
            value: {},
            writable: true
          },

          // for fixed nodes: map of parentInstanceId to instanceId
          // for conditional nodes: map of parentInstanceId to map of conditionalId to instanceId
          instanceLookup: {
            value: {}
          },

          // array of exiting instanceIds
          exitingInstanceIds: {
            value: []
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
          var v = this;
          var ctx = v.ctx;
          var cc = ctx.configConstants;
          // tag
          this.tag = obj[cc.DN_TAG];

          // type
          this.on = obj[cc.DN_ON]

          // parent
          if (obj[cc.DN_PARENT]) {
            this.parent = obj[cc.DN_PARENT];
            var parentNode = ctx.v.lookup(this.parent);
            parentNode.registerChild(this.id);
          }
          // dependencies
          _.each(obj[cc.DN_DEP], function (dependency, index) {
            ctx.registerWatcher(dependency, ['v', v.id, index]);
            v.dependencyCache.push(ctx.getValue(dependency));
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
          var v = this;
          var ctx = v.ctx;
          v.joinAll();
          v.update();
          if (v.instancesChanged || v.childInstancesChanged()) {
            v.enter();
            ctx.v.refreshAll(_.clone(v.children));
            v.exit();
            v.instancesChanged = false;
            v.clearExitedInstanceData();
            v.clearExitedChildInstanceData();
          }
          v.order();
        },
        childInstancesChanged : function () {
          var v = this;
          var ctx = v.ctx;
          for (var i=0; i<v.children.length; i++) {
            var childId = v.children[i];
            if (ctx.v.lookup(childId).instancesChanged) {
              return true;
            }
          }
          return false;
        },
        joinAll : function () {
          var v = this;
          var ctx = v.ctx;
          _.each(v.parentInstanceLookup, function (parentInstanceId, instanceId) {
            v.selectAndJoin(instanceId);
          });
        },
        selectAndJoin : function (instanceId) {
          var v = this;
          var ctx = v.ctx;
          var instanceChildData = [];
          if (v.children.length) { // TODO: this could probably move up the call stack
            _.each(v.children, function (childId) {
              var data = ctx.v.lookup(childId).getData(instanceId);
              if (data) {
                Array.prototype.push.apply(instanceChildData, data);
              }
            });
            v.select(instanceId);
            v.join(instanceId, instanceChildData);
          }
        },
        getData : function (parentInstanceId) {
          var v = this;
          if (!v.instanceCache) {
            // the instance cache was invalidated, recalculate
            v.reinstantiate();
            v.refreshInstanceCache();
          }
          return v.instanceCache[parentInstanceId];
        },
        select : function (instanceId) {
          var instanceSelector = '#' + instanceId;
          var childSelector = instanceSelector + '>*';
          this.selections[instanceId] = d3.select(instanceSelector).selectAll(childSelector);
        },
        join : function (instanceId, data) {
          this.selections[instanceId] = this.selections[instanceId]
            .data(data, function (d) {
              return d;
            });
        },
        hardRefresh : function (parentInstanceId) {
          // render self - this is a special function for the root node because it has no parents :(
          var v = this;
          var ctx = v.ctx;
          var cc = ctx.configConstants;
          var instanceId = ctx.v.uid;

          v.instanceLookup[parentInstanceId] = instanceId;
          v.idLookup[instanceId] = {};
          v.indexLookup[instanceId] = {};
          v.parentInstanceLookup[instanceId] = parentInstanceId;
          var instanceTemporalData = v.extendTemporalData(true, instanceId, [], v.staticAttributes, v.dynamicAttributes);
          v.childInstanceData[instanceId] = {
            tag: v.tag,
            id: instanceId,
            kind: v.id,
            index: 0,
            temporalData: instanceTemporalData
          };
          var parentSelector = '#' + parentInstanceId;
          var rootSelector = parentSelector + '>*';

          var selection = d3.select(parentSelector).selectAll(rootSelector);
          selection = selection.data([instanceId]);
          var enter = selection.enter().append(function (d, i) {
            var element = document.createElement(v.tag);
            element.id = instanceId;
            return element;
          });
          enter = v.instant(enter, cc.DN_ENTER);
          enter = v.transition(enter, cc.DN_ENTER);
          var update = selection;
          update = v.instant(update, cc.DN_UPDATE);
          update = v.transition(update, cc.DN_UPDATE);
          ctx.v.refreshAll([v.id]);
        },
        reinstantiate : function () {
          var v = this;

          var conditionalInstancesChanged = false;

          // check if parent instances have changed
          var parentInstances = this.getParentInstances();
          var existingParentInstances = _.keys(v.instanceLookup);
          var parentInstancesChanged = !_.isEqual(parentInstances, existingParentInstances);

          // update
          // check if conditional instances have changed
          if (v.on) {
            // only fix the conditional instances for existing parent instances, new instances will be ok
            _.each(existingParentInstances, function (parentInstanceId) {
              var conditionalInstances = v.evaluateOn(parentInstanceId);
              var existingConditionalInstances = _.keys(v.instanceLookup[parentInstanceId]);
              if (!_.isEqual(conditionalInstances, existingConditionalInstances)) {
                conditionalInstancesChanged = true;
              }
              var updatingConditionals = _.intersection(conditionalInstances, existingConditionalInstances);
              _.each(updatingConditionals, function (conditionalId) {
                var conditionalIndex = conditionalInstances.indexOf(conditionalId);
                v.updateInstance(parentInstanceId, conditionalId, conditionalIndex);
              });

              if (conditionalInstancesChanged) {
                var enteringConditionals = _.difference(conditionalInstances, existingConditionalInstances);
                var exitingConditionals = _.difference(existingConditionalInstances, conditionalInstances);

                _.each(enteringConditionals, function (conditionalId) {
                  var conditionalIndex = conditionalInstances.indexOf(conditionalId);
                  v.createInstance(parentInstanceId, conditionalId, conditionalIndex);
                });
                _.each(exitingConditionals, function (conditionalId, conditionalIndex) {
                  var instanceId = v.instanceLookup[parentInstanceId][conditionalId];
                  v.removeInstance(instanceId, parentInstanceId, conditionalId);
                });
              }
            });
          } else {
            _.each(existingParentInstances, function (parentInstanceId) {
              v.updateInstance(parentInstanceId);
            });
          }

          // create references to entering instances and remove references to exiting ones
          if (parentInstancesChanged) {
            var enteringParentInstances = _.difference(parentInstances, existingParentInstances);
            if (enteringParentInstances.length > 0) {
              _.each(enteringParentInstances, function (parentInstanceId) {
                // conditional node
                if (v.on) {
                  var parentNode = v.ctx.v.lookup(v.parent);
                  var conditionalInstances = v.evaluateOn(parentInstanceId);
                  _.each(conditionalInstances, function (conditionalId, conditionalIndex) {
                    v.createInstance(parentInstanceId, conditionalId, conditionalIndex);
                  });
                // fixed node
                } else {
                  v.createInstance(parentInstanceId);
                }
              });
            }
            var exitingParentInstances = _.difference(existingParentInstances, parentInstances);
            if (exitingParentInstances.length > 0) {
              _.each(exitingParentInstances, function (parentInstanceId) {
                // fixed node
                if (!v.on) {
                  var instanceId = v.instanceLookup[parentInstanceId];
                  v.removeInstance(instanceId, parentInstanceId);
                // conditional node
                } else {
                  var conditionalInstances = v.evaluateOn(parentInstanceId);
                  _.each(conditionalInstances, function (conditionalId) {
                    var instanceId = v.instanceLookup[parentInstanceId][conditionalId];
                    v.removeInstance(instanceId, parentInstanceId, conditionalId);
                  });
                }
              });
            }
          }

          v.instancesChanged = (parentInstancesChanged || conditionalInstancesChanged);
        },
        updateInstance : function (parentInstanceId, conditionalId, conditionalIndex) {
          // update an instance:
            // indexLookup
          var v = this;
          var ctx = v.ctx;
          var instanceIndexLookup = ctx.v.lookup(v.parent).getInstanceIndexLookup(parentInstanceId);
          // conditional
          if (typeof(conditionalId) != 'undefined' && typeof(conditionalIndex) != 'undefined') {
            var instanceId = v.instanceLookup[parentInstanceId][conditionalId];
            instanceIndexLookup[v.id] = conditionalIndex;
          // fixed
          } else {
            var instanceId = v.instanceLookup[parentInstanceId];
            // don't add anything to the instance index lookup
          }
          // common
          v.indexLookup[instanceId] = instanceIndexLookup;
        },
        createInstance : function (parentInstanceId, conditionalId, conditionalIndex) {
          // add an instance to:
            // instance lookup
            // parent instance lookup
            // idLookup
            // indexLookup
          var v = this;
          var ctx = v.ctx;
          var instanceId = ctx.v.uid;
          var instanceIdLookup = ctx.v.lookup(v.parent).getInstanceIdLookup(parentInstanceId);
          var instanceIndexLookup = ctx.v.lookup(v.parent).getInstanceIndexLookup(parentInstanceId);

          // conditional
          if (typeof(conditionalId) != 'undefined' && typeof(conditionalIndex) != 'undefined') {
            if (!v.instanceLookup[parentInstanceId]) v.instanceLookup[parentInstanceId] = {};
            v.instanceLookup[parentInstanceId][conditionalId] = instanceId;
            instanceIdLookup[v.id] = conditionalId;
            instanceIndexLookup[v.id] = conditionalIndex;
          // fixed
          } else {
            v.instanceLookup[parentInstanceId] = instanceId;
          }
          // common
          v.parentInstanceLookup[instanceId] = parentInstanceId;
          v.idLookup[instanceId] = instanceIdLookup;
          v.indexLookup[instanceId] = instanceIndexLookup;
        },
        removeInstance : function (instanceId, parentInstanceId, conditionalId) {
          // remove instanceId from the instanceLookup,
            // and add it to exitingInstanceIds for cleanup later
          var v = this;

          // conditional
          if (typeof(conditionalId) != 'undefined') {
            delete v.instanceLookup[parentInstanceId][conditionalId];
          // fixed
          } else {
            delete v.instanceLookup[parentInstanceId];
          }
          v.exitingInstanceIds.push(instanceId);
        },
        clearExitedInstanceData : function () {
          // remove data from exited instances
            // selections
            // instance cache
            // instance lookup
            // parent instance lookup
            // id lookup
            // index lookup
          var v = this;
          _.each(v.exitingInstanceIds, function (instanceId) {
            // delete v.instanceCache[instanceId];
            delete v.selections[instanceId];
            delete v.idLookup[instanceId];
            delete v.indexLookup[instanceId];
            delete v.parentInstanceLookup[instanceId];
          });
        },
        clearExitedChildInstanceData : function () {
          var v = this;
          var ctx = this.ctx;
          _.each(v.children, function (childId) {
            var childNode = ctx.v.lookup(childId);
            while (childNode.exitingInstanceIds.length) {
              var instanceId = childNode.exitingInstanceIds.pop();
              delete v.childInstanceData[instanceId];
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
          var v = this;
          var ctx = v.ctx;

          var instanceIdLookup = ctx.v.lookup(v.parent).getInstanceIdLookup(parentInstanceId);
          var instanceIndexLookup = ctx.v.lookup(v.parent).getInstanceIndexLookup(parentInstanceId);
          var value = v.on;
          var result = v.dependencyCache[value[0]];
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
          var v = this;
          var ctx = v.ctx;
          if (toEvaluate && typeof(value) == 'object') {
            if (typeof(value[0]) == 'number') {
              // this is a reference to the dependency cache
              var result = v.dependencyCache[value[0]];
              for (var i=1; i<value.length; i++) {
                if (typeof(result) != 'undefined') {
                  var addressPart = value[i];
                  if (typeof(addressPart) == 'object') {
                    if (addressPart[0] == 'index') {
                      // get the index of a ancestor instance
                      addressPart = v.indexLookup[instanceId][addressPart[1]];
                    } else if (addressPart[0] == 'id') {
                      // get the conditional id 
                      addressPart = v.idLookup[instanceId][addressPart[1]];
                    }
                  }
                  result = result[addressPart];
                }
              }
            } else if (typeof(value[0]) == 'object') {
              // this is a reference to the indexLookup or idLookup
              if (value[0][0] == 'index') {
                // get the index of a ancestor instance
                var result = v.indexLookup[instanceId][value[0][1]];
              } else if (value[0][0] == 'id') {
                // get the conditional id 
                var result = v.idLookup[instanceId][value[0][1]];
              } else if (value[0][0] == '#') {
                var result = instanceId;
              }
            }

            return result;
          } else {
            return value;
          }
        },
        extendTemporalData : function (toEvaluate, instanceId, target /*, sources...*/) {
          var v = this;
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
                    // html, delay, duration (don't go deeper)
                    if (facetKey === cc.DN_HTML ||
                      facetKey === cc.DN_DELAY ||
                      facetKey === cc.DN_DURATION) {
                      target[phaseKey][subphaseKey][facetKey] = v.evaluateValue(toEvaluate, instanceId, facet);
                    // text, delay, duration (don't go deeper)
                    } else if (facetKey === cc.DN_TEXT ||
                      facetKey === cc.DN_DELAY ||
                      facetKey === cc.DN_DURATION) {
                      target[phaseKey][subphaseKey][facetKey] = v.evaluateValue(toEvaluate, instanceId, facet);
                    // style, attribute, property (go one level deeper)
                    } else if (facetKey === cc.DN_STYLE ||
                      facetKey === cc.DN_ATTRIBUTE ||
                      facetKey === cc.DN_PROPERTY) {
                      if (!target[phaseKey][subphaseKey][facetKey]) target[phaseKey][subphaseKey][facetKey] = {};
                      _.each (facet, function (value, name) {
                        target[phaseKey][subphaseKey][facetKey][name] = v.evaluateValue(toEvaluate, instanceId, value);
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
        refreshInstanceCache : function () {
          var v = this;
          var ctx = v.ctx;

          // first, clear the cache
          v.instanceCache = {};

          // next, re-populate it
          // the dynamic attributes will be the same for all instances of this node, so calculate them once:
          var dynamicAttributes = v.extendTemporalData(true, null, [], v.staticAttributes, v.dynamicAttributes);
          var parentNode = ctx.v.lookup(v.parent);
          var dereferenceDataAndStoreToParent = function (instanceId, instanceIndex) {
            var instanceTemporalData = v.extendTemporalData(true, instanceId, [], dynamicAttributes, v.superDynamicAttributes);
            parentNode.childInstanceData[instanceId] = {
              tag: v.tag,
              id: instanceId,
              kind: v.id,
              index: instanceIndex,
              temporalData: instanceTemporalData
            };
          };

          // fixed node
          if (!v.on) {

            // for a fixed node, the instance index will be the same for all instances
            var instanceIndex = parentNode.children.indexOf(v.id);
            _.each(v.instanceLookup, function (instanceId, parentInstanceId) {
              v.instanceCache[parentInstanceId] = [instanceId];
              dereferenceDataAndStoreToParent(instanceId, instanceIndex);
            });
            _.each(v.exitingInstanceIds, function (instanceId) {
              dereferenceDataAndStoreToParent(instanceId, instanceIndex);
            });

          // conditional node
          } else {
            _.each(v.instanceLookup, function (instance, parentInstanceId) {
              var data = [];
              _.each(instance, function (instanceId, conditionalId) {
                var instanceIndex = v.indexLookup[instanceId][v.id];
                dereferenceDataAndStoreToParent(instanceId, instanceIndex);
                data.push(instanceId);
              });
              v.instanceCache[parentInstanceId] = data;
            });
            _.each(v.exitingInstanceIds, function (instanceId) {
              var instanceIndex = v.indexLookup[instanceId][v.id];
              dereferenceDataAndStoreToParent(instanceId, instanceIndex);
            })
          }
        },
        getParentInstances : function () {
          var parent = this.ctx.v.lookup(this.parent);
          return parent.getInstances();
        },
        getInstances : function () {
          return _.keys(this.parentInstanceLookup);
        },
        update : function () {
          var v = this;
          var ctx = v.ctx;
          var cc = ctx.configConstants;

          _.each(this.selections, function (selection) {
            selection = v.instant(selection, cc.DN_UPDATE);
            selection = v.transition(selection, cc.DN_UPDATE);
          });
        },
        enter : function () {
          var v = this;
          var ctx = v.ctx;
          var cc = ctx.configConstants;

          _.each(v.selections, function (selection) {
            var enter = selection.enter().append(function (d, i) {
              var instanceData = v.childInstanceData[d];
              if (instanceData.tag === 'svg') {
                // TODO: handle all name spaces
                var element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              } else if (instanceData.tag === 'path') {
                var element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              } else {
                var element = document.createElement(instanceData.tag);
              }

              // TODO: prevent a duplicate element from entering briefly when the element exits
              // console.log('entering ' + instanceData.id);
              element.id = instanceData.id;
              element.setAttribute('kind', instanceData.kind);
              return element;
            });
            enter = v.instant(enter, cc.DN_ENTER);
            enter = v.transition(enter, cc.DN_ENTER);
          });
        },
        exit : function () {
          var v = this;
          var ctx = v.ctx;
          var cc = ctx.configConstants;

          _.each(this.selections, function (selection) {
            var exit = selection.exit();
            exit = v.instant(exit, cc.DN_EXIT);
            exit = v.transition(exit, cc.DN_EXIT);
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
          var v = this;
          var ctx = v.ctx;
          var cc = ctx.configConstants;

          var instant = selection;
          instant = v.apply(instant, phase, cc.DN_INSTANT);
          return instant;
        },
        transition : function (selection, phase) {
          var v = this;
          var ctx = v.ctx;
          var cc = ctx.configConstants;

          var transition = selection;
          transition = v.apply(transition, phase, cc.DN_TRANSITION);
          return transition;
        },
        apply : function (selection, phase, subphase) {
          var v = this;
          var ctx = v.ctx;
          var cc = ctx.configConstants;

          selection.each(function (d, i) {
            var node = d3.select(this);

            // TODO: why is instanceData sometimes undefined?
            var instanceData = v.childInstanceData[d];
            var temporalData = instanceData ? instanceData.temporalData : undefined;

            if (temporalData && temporalData[phase] && temporalData[phase][subphase]) {
              // transition
              if (subphase == cc.DN_TRANSITION) {
                // cancel any previous transition?
                // node.transition().duration(0);
                node = node.transition();
                node.duration(temporalData[phase][subphase][cc.DN_DURATION]);
                node.delay(temporalData[phase][subphase][cc.DN_DELAY]);
              }

              // html
              var html = temporalData[phase][subphase][cc.DN_HTML];
              if (html) {
                node.html(html);
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
                  var fn = function (d) {
                    _.each(methods, function (method, methodIndex) {
                      var evaluatedArgs = [];
                      _.each(method[cc.DN_H_ARGS], function (arg) {
                        var childViewNode = ctx.v.lookup(instanceData.kind);
                        evaluatedArgs.push(childViewNode.evaluateValue(true, d, arg));
                      });
                      ctx.execute(method[cc.DN_H_METHOD], evaluatedArgs);
                    });
                  };

                  if (eventType == 'always') {
                    node.each(fn);
                  } else {
                    var namespacedType = eventType + '.' + ctx.prefix;
                    node.on(namespacedType, fn, false); // todo: capture: method[cc.DN_H_CAPTURE]
                  }
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
              if (phase == cc.DN_EXIT && subphase == cc.DN_TRANSITION) {
                node = node.remove();
              }
            } else if (phase == cc.DN_EXIT && subphase == cc.DN_TRANSITION) {
              node = node.remove()
            }
          });
          return selection;
        },
        clearInstanceCache : function () {
          this.instanceCache = false;
        },
        notify : function (watcher, value) {
          var v = this;
          var ctx = v.ctx;
          // watcher[0] refers to the collection
          // watcher[1] refers to the node
          // watcher[2] refers to the index of this dependency
          v.dependencyCache[watcher[2]] = value;
          v.clearInstanceCache();
          ctx.v.registerDirtyNodes([v.parent]);
        }
      }
    };
  }
);
