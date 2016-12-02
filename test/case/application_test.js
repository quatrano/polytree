define([
  'resource/common_resource',
  'lodash',
  'immutable',

  'polytree/application_methods',
  'polytree/dev_util'
], function (common, _, Immutable,
             ApplicationMethods, DevUtil) {

  describe('context', function() {
    it('construct empty', function() {
      var application = DevUtil.deserializeApplication(DevUtil.constructApplication({}));
      application.should.be.ok();
    });
  });

});