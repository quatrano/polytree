define([
  'resource/common_resource',
  'lodash',
  'immutable',

  'polytree/application_methods',
  'polytree/project_util',
  'resource/view_node_resource'
], function (common, _, Immutable,
             ApplicationMethods, ProjectUtil,
             viewNodeResource) {

  describe('project util', function() {
    it('converts', function () {
      var proj = ProjectUtil.deserializeProject({});
      var app = ProjectUtil.convertProjToOrigAppConfig(proj);
      app.should.be.ok();
      app.state.should.be.ok();
      app.state.dom.should.be.ok();
      app.config.should.be.ok();
      app.config.original.should.be.ok();
      app.config.original.dataNode.should.be.ok();
    });

    it('deserializes', function () {
      var dataNodeName = 'myDataNode';
      var proj = ProjectUtil.deserializeProject({
        config: {
          dataNode: {
            'foo': {
              name: dataNodeName
            }
          }
        }
      });
      proj.should.be.ok();
      proj.config.dataNode.get('foo').name.should.equal(dataNodeName);
      proj.config.dataNode.get('foo').config.should.be.ok();
    });
  });

});