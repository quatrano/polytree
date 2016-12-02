define([
  'lodash',
  'immutable',
  'd3',
  'bluebird',

  'polytree/common',
  'polytree/record_classes',
  'polytree/application_methods'
], function (_, Immutable, d3, Promise,
             common, RC, AM) {

// Browser Methods
//   This is a stateless utility with methods for the browser loop.

'use strict';

var NAMESPACE_URIS = {
  html: 'http://www.w3.org/1999/xhtml',
  svg: 'http://www.w3.org/2000/svg',
  xbl: 'http://www.mozilla.org/xbl',
  xul: 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul'
};

var fns = {
  updateDom: {
    value: function (application, updateDomMessage, handleInput, getExitingInstances, setExitingInstances) {
      var attributes = updateDomMessage.attributes;

      // for debugging
      // if (_.keys(attributes).length > 0) {
      //   console.log(attributes);
      // }

      var selections = {
      // <parentInstanceId>: <selection>
      };

      // traverse from top to bottom while updating and entering
      Promise.mapSeries(updateDomMessage.traversalOrder, function (parentViewNodeId, index, length) {

        var parentViewNodeConfig = application.config.original.viewNode.get(parentViewNodeId);
        var actuator;
        if (parentViewNodeConfig) {
          actuator = parentViewNodeConfig.actuator;
        } else {

          // this is the root node
          actuator = 'd3'; // TODO: figure out a better way to determine the root actuator
        }
        var viewActuator = application.config.original.viewActuator.get(actuator);
        var updateFn = AM.getAsyncFunction(application, viewActuator.updateFn);
        var enterFn = AM.getAsyncFunction(application, viewActuator.enterFn);

        var handleEventFn = AM.getAsyncFunction(application, viewActuator.handleEventFn);
        var wrappedHandleEventFn = function (eventType, data, e) {
          handleEventFn.asPromise(eventType, data, e, handleInput);
        };

        var promises = [];
        _.each(updateDomMessage.viewNodeInstances[parentViewNodeId], function (parentInstanceId) {
          var joinData = updateDomMessage.joinData[parentInstanceId];
          if (joinData) {

            var joinFn = AM.getAsyncFunction(application, viewActuator.joinFn);
            promises.push(joinFn.asPromise(parentInstanceId, joinData).then(function (selection) {
              selections[parentInstanceId] = selection;

              return updateFn.asPromise(selection, attributes, wrappedHandleEventFn).then(function () {
                enterFn.asPromise(selection, attributes, wrappedHandleEventFn);
              });
            }));
          }
        });

        return Promise.all(promises);
      }).then(function () {

        // then traverse from bottom to top while exiting
        // don't remove a node until all descendents have exited
        // if an instance is exiting, track the exit of its children
        // TODO: keep a map of exiting instance ids in the update dom message for fast lookup
        var exitTransitionTracking = {
          // <instanceId>: {
          //   transitionEnd: true | false,
          //   childrenRemaining: <number>
          // }
        };

        return Promise.mapSeries(updateDomMessage.traversalOrder.reverse(), function (parentViewNodeId, index, length) {

          var parentViewNodeConfig = application.config.original.viewNode.get(parentViewNodeId);
          var actuator;
          if (parentViewNodeConfig) {
            actuator = parentViewNodeConfig.actuator;
          } else {

            // this is the root node
            actuator = 'd3'; // TODO: figure out a better way to determine the root actuator
          }
          var viewActuator = application.config.original.viewActuator.get(actuator);
          var exitFn = AM.getAsyncFunction(application, viewActuator.exitFn);

          var handleEventFn = AM.getAsyncFunction(application, viewActuator.handleEventFn);
          var wrappedHandleEventFn = function (eventType, data, e) {
            handleEventFn.asPromise(eventType, data, e, handleInput);
          };

          _.each(updateDomMessage.viewNodeInstances[parentViewNodeId], function (parentInstanceId) {
            var selection = selections[parentInstanceId];
            if (selection) {
              var onExitTransitionEnd = function (instanceId, node) {
                // handle this instance
                if (exitTransitionTracking[instanceId]) {

                  // this instance has exiting children
                  if (exitTransitionTracking[instanceId].childrenRemaining === 0) {
                    node.remove();
                  } else {
                    exitTransitionTracking[instanceId].transitionEnd = true;
                  }
                } else {

                  // this instance has no exiting children
                  node.remove();
                }

                // handle the parent instance
                if (--exitTransitionTracking[parentInstanceId].childrenRemaining === 0 &&
                  exitTransitionTracking[parentInstanceId].transitionEnd) {
                  console.log('remove the parent instance here');
                }
              };
              exitTransitionTracking[parentInstanceId] = {
                transitionEnd: false,
                childrenRemaining: exitFn.asPromise(selection, attributes, onExitTransitionEnd, wrappedHandleEventFn, getExitingInstances, setExitingInstances)
              };
            }
          });
        });
      });
    }
  },

};

// TODO: convert this pattern to a schema pattern that turns this into a record, or nested records
var BrowserMethods = Object.create(null, fns);
return BrowserMethods;

});