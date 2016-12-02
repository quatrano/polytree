define([
  'resource/common_resource',
  'lodash',
  'immutable',

  'polytree/application_schema',
  'polytree/schema_util'
], function (common, _, Immutable,
             applicationSchema, SchemaUtil) {

  describe('schema util', function() {
    it('constructs', function () {
      var factory = applicationSchema;
      var obj = factory.deserializeObject({
        config: {
          original: {
            dataNode: {
              'foo': {}
            },
            viewNode: {
              'foo': {}
            }
          }
        },
        state: {
          dom: {
            'foo': {}
          }
        }
      }, 'application');
      window.obj = obj;
      window.factory = factory;
    });

    it('self describing object', function () {
      var deser = SchemaUtil.baseSchema.deserializeObject({
        type: '<map>',
        value: {
          'foo': 'bar'
        }
      }, '<self_describing>');
      Immutable.Map.isMap(deser).should.equal(true);
    });
  });

});