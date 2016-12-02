/**
 * Common Test Utils
 */

define([
  'lodash',
  'should',
  'sinon',

  'polytree/application_methods',
  'polytree/dev_util'
], function (_, should, sinon,
             ApplicationMethods, DevUtil) {

return {
  // should: should, // should is attached to Object
  sinon: sinon,

  filterThings: function (originalConfig, thingIdsToInclude) {
    var filteredClone = {};
    _.each(originalConfig, function (thingConfigs, thingType) {
      var filteredThingConfigs = {};
      _.each(thingIdsToInclude, function (thingId) {
        if (thingConfigs.hasOwnProperty(thingId)) {
          filteredThingConfigs[thingId] = thingConfigs[thingId];
        }
      });
      filteredClone[thingType] = filteredThingConfigs;
    });
    return filteredClone;
  },

  // filter a jsConfig to a subset of things and construct a Context with it
  constructContextWithThingConfigs: function (originalConfig, thingIdsToInclude) {
    var filteredClone = this.filterThings(originalConfig, thingIdsToInclude);
    var serializedApplication = DevUtil.constructApplication(filteredClone, false, false);
    return DevUtil.deserializeApplication(serializedApplication);
  },

  // filter a jsConfig to a subset of things
  // inject some things,
  // and construct a context with it
  constructAppWithInjections: function (originalConfig, thingIdsToInclude, injections) {
    var filteredClone = this.filterThings(originalConfig, thingIdsToInclude);
    _.each(injections, function (thingConfigs, thingType) {
      if (!filteredClone[thingType]) filteredClone[thingType] = {};
      _.each(thingConfigs, function (thingConfig, thingId) {
        filteredClone[thingType][thingId] = thingConfig;
      });
    });
    var serializedApplication = DevUtil.constructApplication(filteredClone, false, false);
    return DevUtil.deserializeApplication(serializedApplication);
  }
};

});