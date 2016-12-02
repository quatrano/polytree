define([
  'lodash',
  'immutable',
  'resource/common_resource',

  'polytree/application_methods',
  'polytree/dev_util',
  'polytree/uuid_generator',

  'resource/view_node_resource'
], function (_, Immutable, common,
             ApplicationMethods, DevUtil, UuidGenerator,
             viewNodeResource) {

  var sinon = common.sinon;
 
  describe('view node', function () {

    it('construct empty view node', function () {
      var application = common.constructContextWithThingConfigs(viewNodeResource, [
        'input0',
        'emptyViewNode'
      ]);
      var viewNodeConfig = ApplicationMethods.getViewNodeConfig(application, 'emptyViewNode');
      viewNodeConfig.should.be.ok();
      viewNodeConfig.attributeMappings.should.be.ok();
    });

    it('construct simple view node', function () {
      var application = common.constructContextWithThingConfigs(viewNodeResource, [
        'input0',
        'viewNode0'
      ]);
      var viewNodeConfig = ApplicationMethods.getViewNodeConfig(application, 'viewNode0');
      viewNodeConfig.should.be.ok();
      viewNodeConfig.attributeMappings.should.be.ok();
    });

    it('can add dom', function () {
      var application = common.constructContextWithThingConfigs(viewNodeResource, [
        'input0',
        'viewNode0'
      ]);
      application = ApplicationMethods.addDom(application, 'DOM0');
      application = ApplicationMethods.addDom(application, 'DOM1');

      application.state.dom.get('DOM0').should.be.ok();
      application.state.dom.get('DOM0').viewNode.get('root').toReinstantiate.should.equal(true);

      application.state.dom.get('DOM1').should.be.ok();
      application.state.dom.get('DOM1').viewNode.get('root').toReinstantiate.should.equal(true);
    });

    it('can update dom', function () {
      var uuidGenerator = UuidGenerator.create('a');
      var application = common.constructContextWithThingConfigs(viewNodeResource, [
        'input0',
        'viewNode0'
      ]);
      application = ApplicationMethods.addDom(application, 'DOM0');
      application = ApplicationMethods.updateDom(application, 'DOM0', uuidGenerator, _.noop, _.noop);
      var rootNodeState = application.state.dom.get('DOM0').viewNode.get('root');
      rootNodeState.toReinstantiate.should.equal(false);
      rootNodeState.enteringInstances.size.should.equal(1);
      var enteringInstanceId = rootNodeState.enteringInstances.toList().get(0);
      enteringInstanceId.should.equal('DOM0');
      rootNodeState.persistingInstances.size.should.equal(0);
      rootNodeState.exitingInstances.size.should.equal(0);

      var viewNode0State = application.state.dom.get('DOM0').viewNode.get('viewNode0');
      viewNode0State.toReinstantiate.should.equal(false);
      viewNode0State.enteringInstances.size.should.equal(1);
      enteringInstanceId = viewNode0State.enteringInstances.toList().get(0);
      viewNode0State.groupedRaisonDetre.toJS().should.eql({
        'DOM0': enteringInstanceId
      });
      viewNode0State.persistingInstances.size.should.equal(0);
      viewNode0State.exitingInstances.size.should.equal(0);
      var updateDomMessage = ApplicationMethods.getUpdateDomMessage(application, 'DOM0');
      // TODO: test the updateDomMessage

      application = ApplicationMethods.updateDom(application, 'DOM0', uuidGenerator, _.noop, _.noop);
      rootNodeState = application.state.dom.get('DOM0').viewNode.get('root');
      rootNodeState.toReinstantiate.should.equal(false);
      rootNodeState.enteringInstances.size.should.equal(0);
      rootNodeState.persistingInstances.size.should.equal(1);
      var persistingInstanceId = rootNodeState.persistingInstances.toList().get(0);
      persistingInstanceId.should.equal('DOM0');
      rootNodeState.exitingInstances.size.should.equal(0);

      viewNode0State = application.state.dom.get('DOM0').viewNode.get('viewNode0');
      viewNode0State.enteringInstances.size.should.equal(0);
      viewNode0State.persistingInstances.size.should.equal(1);
      viewNode0State.exitingInstances.size.should.equal(0);
    });

    it('conditional view node', function () {
      var uuidGenerator = UuidGenerator.create('b');
      var application = common.constructContextWithThingConfigs(viewNodeResource, [
        'arrayOfIds',
        'valuesForIds',
        'conditionalViewNode'
      ]);
      application = ApplicationMethods.setInputNodeValue(application, 'arrayOfIds', new Immutable.OrderedSet(['a', 'b']));
      application = ApplicationMethods.addDom(application, 'DOM0');
      application = ApplicationMethods.updateDom(application, 'DOM0', uuidGenerator, _.noop, _.noop);

      var conditionalViewNodeState = application.state.dom.get('DOM0').viewNode.get('conditionalViewNode');
      conditionalViewNodeState.toReinstantiate.should.equal(false);
      conditionalViewNodeState.enteringInstances.size.should.equal(2);
      conditionalViewNodeState.enteringInstances.toJS().should.eql(['b_1', 'b_2']);
      conditionalViewNodeState.groupedRaisonDetre.toJS().should.eql({
        'DOM0': {
          a: 'b_1',
          b: 'b_2'
        }
      });
      conditionalViewNodeState.persistingInstances.size.should.equal(0);
      conditionalViewNodeState.exitingInstances.size.should.equal(0);
      var updateDomMessage = ApplicationMethods.getUpdateDomMessage(application, 'DOM0');
      // TODO: test the updateDomMessage
    });

    it('reinstantiate conditional view node', function () {
      var uuidGenerator = UuidGenerator.create('c');
      var application = common.constructContextWithThingConfigs(viewNodeResource, [
        'arrayOfIds',
        'valuesForIds',
        'conditionalViewNode'
      ]);
      application = ApplicationMethods.addDom(application, 'DOM0');
      application = ApplicationMethods.updateDom(application, 'DOM0', uuidGenerator, _.noop, _.noop);
      var conditionalViewNodeState = application.state.dom.get('DOM0').viewNode.get('conditionalViewNode');
      conditionalViewNodeState.toReinstantiate.should.equal(false);
      conditionalViewNodeState.enteringInstances.size.should.equal(0);
      conditionalViewNodeState.persistingInstances.size.should.equal(0);
      conditionalViewNodeState.exitingInstances.size.should.equal(0);
      var updateDomMessage = ApplicationMethods.getUpdateDomMessage(application, 'DOM0');
      updateDomMessage.toJS().should.eql({
        attributes: {},
        joinData: {},
        traversalOrder: [ 'root', 'conditionalViewNode' ],
        viewNodeInstances: { 
          root: [ 'DOM0' ],
          conditionalViewNode: []
        }
      });

      application = ApplicationMethods.setInputNodeValue(application, 'arrayOfIds', new Immutable.OrderedSet(['a', 'b']));
      application = ApplicationMethods.setInputNodeValue(application, 'valuesForIds', new Immutable.Map({
        'a': Immutable.Map([['color', null]])
      }));
      conditionalViewNodeState = application.state.dom.get('DOM0').viewNode.get('conditionalViewNode');
      conditionalViewNodeState.toReinstantiate.should.equal(true);
      application = ApplicationMethods.updateDom(application, 'DOM0', uuidGenerator, _.noop, _.noop);
      conditionalViewNodeState = application.state.dom.get('DOM0').viewNode.get('conditionalViewNode');
      conditionalViewNodeState.toReinstantiate.should.equal(false);
      conditionalViewNodeState.enteringInstances.size.should.equal(2);
      conditionalViewNodeState.enteringInstances.toJS().should.eql(['c_1', 'c_2']);
      conditionalViewNodeState.groupedRaisonDetre.toJS().should.eql({
        'DOM0': {
          a: 'c_1',
          b: 'c_2'
        }
      });
      conditionalViewNodeState.persistingInstances.size.should.equal(0);
      conditionalViewNodeState.exitingInstances.size.should.equal(0);
      updateDomMessage = ApplicationMethods.getUpdateDomMessage(application, 'DOM0');
      updateDomMessage.toJS().should.eql({
        'attributes': {
          'c_1': { 
            'viewNodeId': 'conditionalViewNode',
            'instant': { 'style': { 'color': null } }
          },
          'c_2': {
            'viewNodeId': 'conditionalViewNode'
          }
        },
        'joinData': { 'DOM0': [ 'c_1', 'c_2' ] },
        'traversalOrder': ['root', 'conditionalViewNode'],
        'viewNodeInstances': { 
          'root': ['DOM0'],
          'conditionalViewNode': ['c_1', 'c_2']
        }
      });

      application = ApplicationMethods.setInputNodeValue(application, 'arrayOfIds', new Immutable.OrderedSet(['a', 'b', 'c']));
      application = ApplicationMethods.setInputNodeValue(application, 'valuesForIds', new Immutable.Map({
        'b': Immutable.Map([['color', 'updateColor']]),
        'c': Immutable.Map([['color', 'enterColor']]),
      }));
      conditionalViewNodeState = application.state.dom.get('DOM0').viewNode.get('conditionalViewNode');
      conditionalViewNodeState.toReinstantiate.should.equal(true);
      application = ApplicationMethods.updateDom(application, 'DOM0', uuidGenerator, _.noop, _.noop);
      conditionalViewNodeState = application.state.dom.get('DOM0').viewNode.get('conditionalViewNode');
      conditionalViewNodeState.toReinstantiate.should.equal(false);
      conditionalViewNodeState.enteringInstances.size.should.equal(1);
      conditionalViewNodeState.enteringInstances.toJS().should.eql(['c_3']);
      conditionalViewNodeState.groupedRaisonDetre.toJS().should.eql({
        'DOM0': {
          a: 'c_1',
          b: 'c_2',
          c: 'c_3'
        }
      });
      conditionalViewNodeState.persistingInstances.size.should.equal(2);
      conditionalViewNodeState.exitingInstances.size.should.equal(0);
      updateDomMessage = ApplicationMethods.getUpdateDomMessage(application, 'DOM0');
      updateDomMessage.toJS().should.eql({
        'attributes': {
          'c_2': {
            'viewNodeId': 'conditionalViewNode',
            'transition': { 'style': { 'background-color': 'updateColor' }}
          },
          'c_3': {
            'viewNodeId': 'conditionalViewNode',
            'instant': {'style': {'color' : 'enterColor'}}
          }
        },
        'joinData': {'DOM0': ['c_1', 'c_2', 'c_3' ]},
        'traversalOrder': ['root', 'conditionalViewNode'],
        'viewNodeInstances': {
          'root': ['DOM0'],
          'conditionalViewNode': ['c_1', 'c_2', 'c_3']
        }
      });

      application = ApplicationMethods.setInputNodeValue(application, 'arrayOfIds', new Immutable.OrderedSet(['a', 'b']));
      application = ApplicationMethods.setInputNodeValue(application, 'valuesForIds', new Immutable.Map({
        'b': Immutable.Map([['color', 'updateColor']]),
        'c': Immutable.Map([['color', 'exitColor']]),
      }));
      conditionalViewNodeState = application.state.dom.get('DOM0').viewNode.get('conditionalViewNode');
      conditionalViewNodeState.toReinstantiate.should.equal(true);
      application = ApplicationMethods.updateDom(application, 'DOM0', uuidGenerator, _.noop, _.noop);
      conditionalViewNodeState = application.state.dom.get('DOM0').viewNode.get('conditionalViewNode');
      conditionalViewNodeState.toReinstantiate.should.equal(false);
      conditionalViewNodeState.enteringInstances.size.should.equal(0);
      conditionalViewNodeState.persistingInstances.size.should.equal(2);
      conditionalViewNodeState.exitingInstances.size.should.equal(1);
      conditionalViewNodeState.exitingInstances.toJS().should.eql(['c_3']);
      conditionalViewNodeState.groupedRaisonDetre.toJS().should.eql({
        'DOM0': {
          a: 'c_1',
          b: 'c_2'
        }
      });
      updateDomMessage = ApplicationMethods.getUpdateDomMessage(application, 'DOM0');
      updateDomMessage.toJS().should.eql({
        'attributes': {
          'c_2': {
            'viewNodeId': 'conditionalViewNode',
            'transition': {'style': {'background-color': 'updateColor'}}
          },
          'c_3': {
            'viewNodeId': 'conditionalViewNode',
            'transition': {'style': {'color': 'exitColor'}}
          }
        },
        'joinData': { 'DOM0': [ 'c_1', 'c_2' ] },
        'traversalOrder': ['root', 'conditionalViewNode'],
        'viewNodeInstances': {
          'root': ['DOM0'],
          'conditionalViewNode': [ 'c_1', 'c_2', 'c_3' ]
        }
      });
      application = ApplicationMethods.setInputNodeValue(application, 'arrayOfIds', new Immutable.OrderedSet(['b', 'a']));
      conditionalViewNodeState = application.state.dom.get('DOM0').viewNode.get('conditionalViewNode');
      conditionalViewNodeState.toReinstantiate.should.equal(true);
      application = ApplicationMethods.updateDom(application, 'DOM0', uuidGenerator, _.noop, _.noop);
      conditionalViewNodeState = application.state.dom.get('DOM0').viewNode.get('conditionalViewNode');
      conditionalViewNodeState.toReinstantiate.should.equal(false);
      conditionalViewNodeState.enteringInstances.size.should.equal(0);
      conditionalViewNodeState.persistingInstances.size.should.equal(2);
      conditionalViewNodeState.exitingInstances.size.should.equal(0);
      conditionalViewNodeState.groupedRaisonDetre.toJS().should.eql({
        'DOM0': {
          a: 'c_1',
          b: 'c_2'
        }
      });
      conditionalViewNodeState.instanceLookup.toJS().should.eql({
        'c_1': {
          provenance: {
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: 'a', index: 1, parent: 'DOM0' }
        },
        'c_2': {
          provenance: {
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: 'b', index: 0, parent: 'DOM0' }
        }
      });
      updateDomMessage = ApplicationMethods.getUpdateDomMessage(application, 'DOM0');
      updateDomMessage.toJS().should.eql({
        'attributes': {
          'c_2': {
            'viewNodeId': 'conditionalViewNode',
            'transition': {'style': {'background-color': 'updateColor'}}
          }
        },
        'joinData': { 'DOM0': [ 'c_2', 'c_1' ] },
        'traversalOrder': ['root', 'conditionalViewNode'],
        'viewNodeInstances': {
          'root': ['DOM0'],
          'conditionalViewNode': ['c_1', 'c_2']
        }
      });
    });

    it('fixed child of conditional view node', function () {
      var uuidGenerator = UuidGenerator.create('d');
      var application = common.constructContextWithThingConfigs(viewNodeResource, [
        'arrayOfIds',
        'valuesForIds',
        'valuesForIndexes',
        'conditionalViewNode',
        'fixedChildOfConditional'
      ]);
      application = ApplicationMethods.setInputNodeValue(application, 'arrayOfIds', new Immutable.OrderedSet(['a', 'b']));
      application = ApplicationMethods.addDom(application, 'DOM0');
      application = ApplicationMethods.updateDom(application, 'DOM0', uuidGenerator, _.noop, _.noop);

      var conditionalViewNodeState = application.state.dom.get('DOM0').viewNode.get('conditionalViewNode');
      conditionalViewNodeState.toReinstantiate.should.equal(false);
      conditionalViewNodeState.enteringInstances.size.should.equal(2);
      conditionalViewNodeState.enteringInstances.toJS().should.eql(['d_1', 'd_2']);
      conditionalViewNodeState.groupedRaisonDetre.toJS().should.eql({
        'DOM0': {
          a: 'd_1',
          b: 'd_2'
        }
      });
      conditionalViewNodeState.persistingInstances.size.should.equal(0);
      conditionalViewNodeState.exitingInstances.size.should.equal(0);

      var fixedChildOfConditionalState = application.state.dom.get('DOM0').viewNode.get('fixedChildOfConditional');
      fixedChildOfConditionalState.toReinstantiate.should.equal(false);
      fixedChildOfConditionalState.enteringInstances.size.should.equal(2);
      fixedChildOfConditionalState.enteringInstances.toJS().should.eql(['d_3', 'd_4']);
      fixedChildOfConditionalState.groupedRaisonDetre.toJS().should.eql({
        'd_1': 'd_3',
        'd_2': 'd_4'
      });
      fixedChildOfConditionalState.instanceLookup.toJS().should.eql({
        'd_3': {
          provenance: {
            root: { id: 'DOM0', index: undefined, parent: undefined },
            conditionalViewNode: { id: 'a', index: 0, parent: 'DOM0' }
          },
          raisonDetre: { id: undefined, index: undefined, parent: 'd_1' }
        },
        'd_4': {
          provenance: {
            root: { id: 'DOM0', index: undefined, parent: undefined },
            conditionalViewNode: { id: 'b', index: 1, parent: 'DOM0' }
          },
          raisonDetre: { id: undefined, index: undefined, parent: 'd_2' }
        }
      });
      fixedChildOfConditionalState.persistingInstances.size.should.equal(0);
      fixedChildOfConditionalState.exitingInstances.size.should.equal(0);
      var updateDomMessage = ApplicationMethods.getUpdateDomMessage(application, 'DOM0');
      updateDomMessage.toJS().should.eql({
        'attributes': {
          'd_1': { viewNodeId: 'conditionalViewNode' },
          'd_2': { viewNodeId: 'conditionalViewNode' },
          'd_3': { viewNodeId: 'fixedChildOfConditional' },
          'd_4': { viewNodeId: 'fixedChildOfConditional' }
        },
        'joinData': {
          'd_1': ['d_3'],
          'd_2': ['d_4'],
          'DOM0': [ 'd_1', 'd_2' ]
        },
        'traversalOrder': ['root', 'conditionalViewNode', 'fixedChildOfConditional'],
        'viewNodeInstances': {
          'root': ['DOM0'],
          'conditionalViewNode': ['d_1', 'd_2'],
          'fixedChildOfConditional': [ 'd_3', 'd_4' ]
        }
      });

      application = ApplicationMethods.setInputNodeValue(application, 'arrayOfIds', new Immutable.OrderedSet(['a', 'b', 'c']));
      application = ApplicationMethods.updateDom(application, 'DOM0', uuidGenerator, _.noop, _.noop);
      conditionalViewNodeState = application.state.dom.get('DOM0').viewNode.get('conditionalViewNode');
      conditionalViewNodeState.enteringInstances.size.should.equal(1);
      conditionalViewNodeState.enteringInstances.toJS().should.eql(['d_5']);
      conditionalViewNodeState.groupedRaisonDetre.toJS().should.eql({
        'DOM0': {
          a: 'd_1',
          b: 'd_2',
          c: 'd_5'
        }
      });
      conditionalViewNodeState.persistingInstances.size.should.equal(2);
      conditionalViewNodeState.exitingInstances.size.should.equal(0);

      fixedChildOfConditionalState = application.state.dom.get('DOM0').viewNode.get('fixedChildOfConditional');
      fixedChildOfConditionalState.enteringInstances.size.should.equal(1);
      fixedChildOfConditionalState.enteringInstances.toJS().should.eql(['d_6']);
      fixedChildOfConditionalState.groupedRaisonDetre.get('d_5').should.equal('d_6');
      fixedChildOfConditionalState.instanceLookup.get('d_6').toJS().should.eql({
        provenance: {
          root: { id: 'DOM0', index: undefined, parent: undefined },
          conditionalViewNode: { id: 'c', index: 2, parent: 'DOM0' }
        },
        raisonDetre: { id: undefined, index: undefined, parent: 'd_5' }
      });
      fixedChildOfConditionalState.persistingInstances.size.should.equal(2);
      fixedChildOfConditionalState.exitingInstances.size.should.equal(0);
      updateDomMessage = ApplicationMethods.getUpdateDomMessage(application, 'DOM0');
      updateDomMessage.toJS().should.eql({
        'attributes': {
          'd_5': { viewNodeId: 'conditionalViewNode' },
          'd_6': { viewNodeId: 'fixedChildOfConditional' }
        },
        'joinData': {
          'd_1': ['d_3'],
          'd_2': ['d_4'],
          'd_5': ['d_6'],
          'DOM0': ['d_1', 'd_2', 'd_5']
        },
        'traversalOrder': ['root', 'conditionalViewNode', 'fixedChildOfConditional'],
        'viewNodeInstances': {
          'root': ['DOM0'],
          'conditionalViewNode': ['d_1', 'd_2', 'd_5'],
          'fixedChildOfConditional': ['d_3', 'd_4', 'd_6']
        }
      });

      application = ApplicationMethods.setInputNodeValue(application, 'arrayOfIds', new Immutable.OrderedSet(['b', 'c']));
      conditionalViewNodeState = application.state.dom.get('DOM0').viewNode.get('conditionalViewNode');
      fixedChildOfConditionalState = application.state.dom.get('DOM0').viewNode.get('fixedChildOfConditional');
      conditionalViewNodeState.toReinstantiate.should.equal(true);
      fixedChildOfConditionalState.toReinstantiate.should.equal(false);
      application = ApplicationMethods.updateDom(application, 'DOM0', uuidGenerator, _.noop, _.noop);
      conditionalViewNodeState = application.state.dom.get('DOM0').viewNode.get('conditionalViewNode');
      conditionalViewNodeState.enteringInstances.size.should.equal(0);
      conditionalViewNodeState.persistingInstances.size.should.equal(2);
      conditionalViewNodeState.exitingInstances.size.should.equal(1);
      conditionalViewNodeState.exitingInstances.toJS().should.eql(['d_1']);
      conditionalViewNodeState.instanceLookup.toJS().should.eql({
        'd_1': {
          provenance: {
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: 'a', index: 0, parent: 'DOM0' }
        },
        'd_2': {
          provenance: {
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: 'b', index: 0, parent: 'DOM0' }
        },
        'd_5': {
          provenance: {
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: 'c', index: 1, parent: 'DOM0' } 
        }
      });

      fixedChildOfConditionalState = application.state.dom.get('DOM0').viewNode.get('fixedChildOfConditional');
      fixedChildOfConditionalState.enteringInstances.size.should.equal(0);
      fixedChildOfConditionalState.persistingInstances.size.should.equal(2);
      fixedChildOfConditionalState.exitingInstances.size.should.equal(1);
      fixedChildOfConditionalState.exitingInstances.toJS().should.eql(['d_3']);
      fixedChildOfConditionalState.groupedRaisonDetre.toJS().should.eql({
        'd_2': 'd_4',
        'd_5': 'd_6'
      });
      fixedChildOfConditionalState.instanceLookup.toJS().should.eql({
        'd_3': {
          provenance: {
            conditionalViewNode: { id: 'a', index: 0, parent: 'DOM0' },
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: undefined, index: undefined, parent: 'd_1' }
        },
        'd_4': {
          provenance: {
            conditionalViewNode: {
              id: 'b',
              index: 1, // TODO: the index should update because although this node doesn't use it, a child might
              parent: 'DOM0'
            },
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: undefined, index: undefined, parent: 'd_2' }
        },
        'd_6': {
          provenance: {
            conditionalViewNode: {
              id: 'c',
              index: 2, // TODO: the index should update
              parent: 'DOM0'
            },
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: undefined, index: undefined, parent: 'd_5' }
        }
      });
      updateDomMessage = ApplicationMethods.getUpdateDomMessage(application, 'DOM0');
      updateDomMessage.toJS().should.eql({
        'attributes': {},
        'joinData': {
          'd_1': [],
          'd_2': ['d_4'],
          'd_5': ['d_6'],
          'DOM0': ['d_2', 'd_5']
        },
        'traversalOrder': ['root', 'conditionalViewNode', 'fixedChildOfConditional'],
        'viewNodeInstances': {
          'root': ['DOM0'],
          'conditionalViewNode': ['d_1', 'd_2', 'd_5'],
          'fixedChildOfConditional': ['d_3', 'd_4', 'd_6']
        }
      });
    });

    it('conditional child of conditional view node', function () {
      var uuidGenerator = UuidGenerator.create('e');
      var application = common.constructContextWithThingConfigs(viewNodeResource, [
        'arrayOfIds',
        'valuesForIds',
        'valuesForIndexes',
        'conditionalViewNode',
        'fixedChildOfConditional',
        'conditionalChildOfConditional'
      ]);

      application = ApplicationMethods.setInputNodeValue(application, 'arrayOfIds', new Immutable.OrderedSet(['a', 'b']));
      application = ApplicationMethods.setInputNodeValue(application, 'valuesForIndexes', new Immutable.List([
        Immutable.Map({
          color: 'blue',
          text: 'asdf',
          ids: Immutable.OrderedSet(['x', 'y', 'z'])
        }),
        Immutable.Map({
          color: 'yellow',
          text: 'qwer',
          ids: Immutable.OrderedSet(['f', 'g'])
        })
      ]));
      application = ApplicationMethods.addDom(application, 'DOM0');
      application = ApplicationMethods.updateDom(application, 'DOM0', uuidGenerator, _.noop, _.noop);
      var conditionalChildOfConditionalState = application.state.dom.get('DOM0').viewNode.get('conditionalChildOfConditional');
      conditionalChildOfConditionalState.instanceLookup.toJS().should.eql({
        'e_5': {
          provenance: {
            conditionalViewNode: { id: 'a', index: 0, parent: 'DOM0' },
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: 'x', index: 0, parent: 'e_1' }
        },
        'e_6': {
          provenance: {
            conditionalViewNode: { id: 'a', index: 0, parent: 'DOM0' },
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: 'y', index: 1, parent: 'e_1' }
        },
        'e_7': {
          provenance: {
            conditionalViewNode: { id: 'a', index: 0, parent: 'DOM0' },
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: 'z', index: 2, parent: 'e_1' }
        },
        'e_8': {
          provenance: {
            conditionalViewNode: { id: 'b', index: 1, parent: 'DOM0' },
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: 'f', index: 0, parent: 'e_2' }
        },
        'e_9': {
          provenance: {
            conditionalViewNode: { id: 'b', index: 1, parent: 'DOM0' },
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: 'g', index: 1, parent: 'e_2' }
        }});

      var updateDomMessage = ApplicationMethods.getUpdateDomMessage(application, 'DOM0');
      updateDomMessage.toJS().should.eql({
        'attributes': {
          'e_1': { 'viewNodeId': 'conditionalViewNode' },
          'e_2': { 'viewNodeId': 'conditionalViewNode' },
          'e_3': { 'viewNodeId': 'fixedChildOfConditional' },
          'e_4': { 'viewNodeId': 'fixedChildOfConditional' },
          'e_5': {
            'viewNodeId': 'conditionalChildOfConditional',
            'instant': {
              'text': 'asdf',
              'color': 'blue'
            }
          },
          'e_6': {
            'viewNodeId': 'conditionalChildOfConditional',
            'instant': {
              'color': 'blue',
              'text': 'qwer'
            }
          },
          'e_7': {
            'viewNodeId': 'conditionalChildOfConditional',
            'instant': {
              'color': 'blue'
            }
          },
          'e_8': {
            'viewNodeId': 'conditionalChildOfConditional',
            'instant': {
              'color': 'yellow',
              'text': 'asdf'
            }
          },
          'e_9': {
            'viewNodeId': 'conditionalChildOfConditional',
            'instant': {
              'color': 'yellow',
              'text': 'qwer'
            }
          }
        },
        'joinData': {
          'e_1': [ 'e_3', 'e_5', 'e_6', 'e_7' ],
          'e_2': [ 'e_4', 'e_8', 'e_9' ],
          'DOM0': [ 'e_1', 'e_2' ]
        },
        'traversalOrder': [
          'root',
          'conditionalViewNode',
          'fixedChildOfConditional',
          'conditionalChildOfConditional'
        ],
        'viewNodeInstances': {
          'root': ['DOM0'],
          'conditionalViewNode': ['e_1', 'e_2'],
          'fixedChildOfConditional': [ 'e_3', 'e_4' ],
          'conditionalChildOfConditional': [ 'e_5', 'e_6', 'e_7', 'e_8', 'e_9' ],
        }
      });

      application = ApplicationMethods.setInputNodeValue(application, 'valuesForIndexes', new Immutable.List([
        Immutable.Map({
          color: 'blue',
          text: 'asdf',
          ids: Immutable.OrderedSet(['z', 'y', 'w'])
        }),
        Immutable.Map({
          color: 'yellow',
          text: 'qwer',
          ids: Immutable.OrderedSet(['g', 'd'])
        })
      ]));
      application = ApplicationMethods.updateDom(application, 'DOM0', uuidGenerator, _.noop, _.noop);

      conditionalChildOfConditionalState = application.state.dom.get('DOM0').viewNode.get('conditionalChildOfConditional');
      conditionalChildOfConditionalState.instanceLookup.toJS().should.eql({
        'e_10': {
          provenance: {
            conditionalViewNode: { id: 'a', index: 0, parent: 'DOM0' },
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: 'w', index: 2, parent: 'e_1' }
        },
        'e_11': {
          provenance: {
            conditionalViewNode: { id: 'b', index: 1, parent: 'DOM0' },
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: 'd', index: 1, parent: 'e_2' }
        },
        'e_5': {
          provenance: {
            conditionalViewNode: { id: 'a', index: 0, parent: 'DOM0' },
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: 'x', index: 0, parent: 'e_1' }
        },
        'e_6': {
          provenance: {
            conditionalViewNode: { id: 'a', index: 0, parent: 'DOM0' },
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: 'y', index: 1, parent: 'e_1' }
        },
        'e_7': {
          provenance: {
            conditionalViewNode: { id: 'a', index: 0, parent: 'DOM0' },
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: 'z', index: 0, parent: 'e_1' }
        },
        'e_8': {
          provenance: {
            conditionalViewNode: { id: 'b', index: 1, parent: 'DOM0' },
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: 'f', index: 0, parent: 'e_2' }
        },
        'e_9': {
          provenance: {
            conditionalViewNode: { id: 'b', index: 1, parent: 'DOM0' },
            root: { id: 'DOM0', index: undefined, parent: undefined }
          },
          raisonDetre: { id: 'g', index: 0, parent: 'e_2' }
        }
      });

      updateDomMessage = ApplicationMethods.getUpdateDomMessage(application, 'DOM0');
      updateDomMessage.toJS().should.eql({
        'attributes': {
          'e_10': {
            viewNodeId: 'conditionalChildOfConditional',
            'instant': {
              'color': 'blue'
            }
          },
          'e_11': {
            viewNodeId: 'conditionalChildOfConditional',
            'instant': {
              'color': 'yellow',
              'text': 'qwer'
            }
          },
          'e_3': {
            viewNodeId: 'fixedChildOfConditional',
            'instant': {
              'text': 'asdf'
            }
          },
          'e_4': {
            viewNodeId: 'fixedChildOfConditional',
            'instant': {
              'text': 'qwer'
            }
          },
          'e_6': {
            viewNodeId: 'conditionalChildOfConditional',
            'transition': {
              'text': 'asdf'
            }
          },
          'e_7': {
            viewNodeId: 'conditionalChildOfConditional',
            'transition': {
              'text': 'asdf'
            }
          },
          'e_9': {
            viewNodeId: 'conditionalChildOfConditional',
            'transition': {
              'text': 'qwer'
            }
          }
        },
        'joinData': {
          'e_1': [ 'e_3', 'e_7', 'e_6', 'e_10' ],
          'e_2': [ 'e_4', 'e_9', 'e_11' ],
          'DOM0': [ 'e_1', 'e_2' ]
        },
        'traversalOrder': [
          'root',
          'conditionalViewNode',
          'fixedChildOfConditional',
          'conditionalChildOfConditional'
        ],
        'viewNodeInstances': {
          'conditionalChildOfConditional': [ 'e_5', 'e_6', 'e_7', 'e_8', 'e_9', 'e_10', 'e_11' ],
          'conditionalViewNode': [ 'e_1', 'e_2' ],
          'fixedChildOfConditional': [ 'e_3', 'e_4' ],
          'root': [ 'DOM0' ]
        }
      });

      application = ApplicationMethods.updateDom(application, 'DOM0', uuidGenerator, _.noop, _.noop);

      updateDomMessage = ApplicationMethods.getUpdateDomMessage(application, 'DOM0');
      updateDomMessage.toJS().should.eql({
        'attributes': {},
        'joinData': {
          'e_1': [ 'e_3', 'e_7', 'e_6', 'e_10' ],
          'e_2': [ 'e_4', 'e_9', 'e_11' ],
          'DOM0': [ 'e_1', 'e_2' ]
        },
        'traversalOrder': [
          'root',
          'conditionalViewNode',
          'fixedChildOfConditional',
          'conditionalChildOfConditional'
        ],
        'viewNodeInstances': {
          'conditionalChildOfConditional': [ 'e_11', 'e_6', 'e_7', 'e_10', 'e_9' ],
          'conditionalViewNode': [ 'e_1', 'e_2' ],
          'fixedChildOfConditional': [ 'e_3', 'e_4' ],
          'root': [ 'DOM0' ]
        }
      });

    });

  });
});