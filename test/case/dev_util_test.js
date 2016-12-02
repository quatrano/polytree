define([
  'resource/common_resource',
  'lodash',
  'immutable',

  'polytree/application_methods',
  'polytree/dev_util',
  'resource/view_node_resource'
], function (common, _, Immutable,
             ApplicationMethods, DevUtil,
             viewNodeResource) {

  describe('map', function() {
    it('returns an immutable map', function () {
      var map = DevUtil.map({}, _.noop);
      Immutable.Map.isMap(map).should.be.true();
    });

    it('returns mapped values', function () {
      var map = DevUtil.map({
        'one': 1,
        'two': 2
      }, function (num) {
        return Number(++num);
      });

      map.get('one').should.equal(2);
      map.get('two').should.equal(3);
    });
  });

  describe('convert field to', function() {
    it('converts field', function () {
      var converted = DevUtil.convertFieldTo({
        'one': 1,
        'two': 2
      }, 'one', function (num) {
        return Number(++num);
      });

      converted.one.should.equal(2);
      converted.two.should.equal(2);
    });

    it('handles absent field', function () {
      var converted = DevUtil.convertFieldTo({
        'one': 1,
        'two': 2
      }, 'three', function (num) {
        return Number(++num);
      });

      converted.one.should.equal(1);
      converted.two.should.equal(2);
      converted.hasOwnProperty('three').should.be.false();
    });
  });

  describe('derived config', function() {
    it('construct', function () {
      var derived = DevUtil.constructDerivedConfig({
        'inputNode': {
          'in0': {},
          'in1': {}
        },
        'dataNode': {
          'dn0': {
            'inputNodeDeps': ['in0']
          },
          'dn1': {
            'inputNodeDeps': ['in0'],
            'dataNodeDeps': ['dn0']
          }
        }
      });

      derived.inputNode.in0.dep.dataNode.should.eql(['dn0', 'dn1']);
      derived.inputNode.in0.dep.viewNode.should.eql([]);

      derived.dataNode.dn0.dep.out.inputNode.should.eql(['in0']);
      derived.dataNode.dn0.dep.out.dataNode.should.eql([]);
      derived.dataNode.dn0.dep.in.dataNode.should.eql(['dn1']);

      derived.dataNode.dn1.dep.out.inputNode.should.eql(['in0']);
      derived.dataNode.dn1.dep.out.dataNode.should.eql(['dn0']);
      derived.dataNode.dn1.dep.in.dataNode.should.eql([]);
    });

    it('derives view tree', function () {
      var derived = DevUtil.constructDerivedConfig(viewNodeResource);
      derived.viewNode.root.children.should.eql(['emptyViewNode', 'viewNode0', 'conditionalViewNode']);
      derived.viewNode.conditionalViewNode.dep.out.inputNode.arrayOfIds.should.eql({
        existence: [
          [
            ['value'],
            ['existence']
          ]
        ]
      });
      derived.viewNode.conditionalViewNode.dep.out.inputNode.valuesForIds.should.eql({
        update: [
          [
            ['value', [ 'id', 'conditionalViewNode' ], 'color' ],
            [ 'update', 'transition', 'style', 'background-color']
          ]
        ]
      });

      derived.viewNode.conditionalViewNode.existence.should.eql([ 'inputNode', 'arrayOfIds', 'value' ]);
    });

  });

});