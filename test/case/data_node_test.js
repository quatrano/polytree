define([
  'lodash',
  'immutable',
  'resource/common_resource',

  'polytree/application_methods',
  'polytree/dev_util',
  'polytree/main_methods',

  'resource/data_node_resource'
], function (_, Immutable, common,
             ApplicationMethods, DevUtil, MainMethods,
             dataNodeResource) {

  var sinon = common.sinon;
 
  describe('data node', function () {

    it('construct empty', function () {
      var context = common.constructContextWithThingConfigs(dataNodeResource, [
        'emptyDn',
        'noop'
      ]);
    });

    it('construct complete', function () {
      var context = common.constructContextWithThingConfigs(dataNodeResource, [
        'foo',
        'concat',
        'input0',
        'simple'
      ]);
    });

    it('set input value', function () {
      var application = common.constructContextWithThingConfigs(dataNodeResource, [
        'foo',
        'concat',
        'coalescentInputFn',
        'coalescentDoWorkFn',
        'input0',
        'simple'
      ]);
      _.isUndefined(application.state.dataNode.get('simple').value).should.be.true();
      application.state.dataNode.get('simple').workQueue.size.should.equal(0);
      application = ApplicationMethods.setInputNodeValue(application, 'input0', 'test');
      application.state.dataNode.get('simple').workQueue.size.should.equal(1);
      application.state.inputNode.get('input0').value.should.equal('test');
    }); 

    it('get snapshot of empty', function () {
      var application = common.constructContextWithThingConfigs(dataNodeResource, [
        'emptyDn',
        'noop'
      ]);
      application = ApplicationMethods.ensureDataNodeSnapshot(application, 'emptyDn');
      application.should.be.ok();
      var snapshot = ApplicationMethods.getDataNodeSnapshot(application, 'emptyDn');
      snapshot.should.be.ok();
      snapshot.get('workQueueSize').should.equal(0);
      snapshot.get('isWorking').should.be.false();
      _.isUndefined(snapshot.get('progress')).should.be.true();
      _.isUndefined(snapshot.get('value')).should.be.true();
    });
 
    it('coalescent do work', function () {
      var application = common.constructContextWithThingConfigs(dataNodeResource, [
        'foo',
        'concat',
        'coalescentInputFn',
        'coalescentDoWorkFn',
        'input0',
        'simple'
      ]);
      var getterSpy = sinon.spy();
      var setterSpy = sinon.spy();

      application = ApplicationMethods.setInputNodeValue(application, 'input0', 'test');
      application = ApplicationMethods.ensureDataNodeSnapshot(application, 'simple', getterSpy, setterSpy);

      getterSpy.args.length.should.equal(0);
      setterSpy.args.length.should.equal(0);

      var dataNodeSnapshot = ApplicationMethods.getDataNodeSnapshot(application, 'simple');
      dataNodeSnapshot.workQueueSize.should.equal(0);
      dataNodeSnapshot.value.should.equal('bartest');
    });

    it('coalescent multiple sets', function () {
      var application = common.constructContextWithThingConfigs(dataNodeResource, [
        'foo',
        'concat',
        'coalescentInputFn',
        'coalescentDoWorkFn',
        'input0',
        'simple'
      ]);
      var getterSpy = sinon.spy();
      var setterSpy = sinon.spy();

      application = ApplicationMethods.setInputNodeValue(application, 'input0', 'shouldIgnoreThis');
      application = ApplicationMethods.setInputNodeValue(application, 'input0', 'test');
      application = ApplicationMethods.ensureDataNodeSnapshot(application, 'simple', getterSpy, setterSpy);

      getterSpy.args.length.should.equal(0);
      setterSpy.args.length.should.equal(0);

      var dataNodeSnapshot = ApplicationMethods.getDataNodeSnapshot(application, 'simple');
      dataNodeSnapshot.workQueueSize.should.equal(0);
      dataNodeSnapshot.value.should.equal('bartest');
    });

    it('data node depends on data node', function () {
      var application = common.constructContextWithThingConfigs(dataNodeResource, [
        'foo',
        'bar',
        'concat',
        'coalescentInputFn',
        'coalescentDoWorkFn',
        'input0',
        'simple',
        'depDataNode'
      ]);
      var getterSpy = sinon.spy();
      var setterSpy = sinon.spy();

      application = ApplicationMethods.setInputNodeValue(application, 'input0', 'shouldIgnoreThis');
      application = ApplicationMethods.setInputNodeValue(application, 'input0', 'test');
      application = ApplicationMethods.ensureDataNodeSnapshot(application, 'simple', getterSpy, setterSpy);
      application = ApplicationMethods.ensureDataNodeSnapshot(application, 'depDataNode', getterSpy, setterSpy);

      getterSpy.args.length.should.equal(0);
      setterSpy.args.length.should.equal(0);

      var simpleSnapshot = ApplicationMethods.getDataNodeSnapshot(application, 'simple');
      simpleSnapshot.workQueueSize.should.equal(0);
      simpleSnapshot.value.should.equal('bartest');
      
      var depDataNodeSnapshot = ApplicationMethods.getDataNodeSnapshot(application, 'depDataNode');
      depDataNodeSnapshot.workQueueSize.should.equal(0);
      depDataNodeSnapshot.value.should.equal('bartestbaz');
    });

    it('control flow', function () {
      var innerDoneFn;
      var innerProgressFn;
      var initialProgressValue = 0.5;

      var injections = {
        'asyncFn': {
          'controlFlow': {
            procedure: function (done, progress, syncFnDeps, asyncFnDeps, dynamicArgs) {

              // register done and progress with the test harness so control can be flowed
              innerDoneFn = done;
              innerProgressFn = progress;
              return initialProgressValue;
            }
          }
        }
      };
      var application = common.constructAppWithInjections(dataNodeResource, [
        'foo',
        'concat',
        'coalescentInputFn',
        'coalescentDoWorkFn',
        'input0',
        'simple',
        'flowControlled'
      ], injections);
      var asyncMutateSpy = sinon.spy(function (dataNodeId, mutateFn) {
        application = MainMethods.asyncMutateDataNodeState(application, dataNodeId, mutateFn);
        return application.state.dataNode.get(dataNodeId);
      });

      application = ApplicationMethods.setInputNodeValue(application, 'input0', 'shouldIgnoreThis');
      application = ApplicationMethods.setInputNodeValue(application, 'input0', 'test');

      application = ApplicationMethods.ensureDataNodeSnapshot(application, 'flowControlled', asyncMutateSpy);
      var flowControlledSnapshot = ApplicationMethods.getDataNodeSnapshot(application, 'flowControlled');
      flowControlledSnapshot.workQueueSize.should.equal(0);
      _.isUndefined(flowControlledSnapshot.value).should.be.true();
      flowControlledSnapshot.progress.should.equal(initialProgressValue);

      // this should be a no-op because ensuring the flowControlled snapshot should also ensure simple
      application = ApplicationMethods.ensureDataNodeSnapshot(application, 'simple', asyncMutateSpy);
      asyncMutateSpy.args.length.should.equal(0);
      var simpleSnapshot = ApplicationMethods.getDataNodeSnapshot(application, 'simple');
      simpleSnapshot.workQueueSize.should.equal(0);
      simpleSnapshot.value.should.equal('bartest');
      
      asyncMutateSpy.args.length.should.equal(0);

      var newProgressValue = 0.75;
      innerProgressFn(newProgressValue);

      asyncMutateSpy.args.length.should.equal(1);
      asyncMutateSpy.args[0][0].should.equal('flowControlled');
      asyncMutateSpy.returnValues[0].workQueue.size.should.equal(0);
      asyncMutateSpy.reset();

      application = ApplicationMethods.ensureDataNodeSnapshot(application, 'flowControlled', asyncMutateSpy);
      asyncMutateSpy.args.length.should.equal(0);
      flowControlledSnapshot = ApplicationMethods.getDataNodeSnapshot(application, 'flowControlled');
      flowControlledSnapshot.progress.should.equal(newProgressValue);

      // changing an input
      var oldInnerDoneFn = innerDoneFn;
      var oldInnerProgressFn = innerProgressFn;
      application = ApplicationMethods.setInputNodeValue(application, 'input0', 'test2');
      application = ApplicationMethods.ensureDataNodeSnapshot(application, 'flowControlled', asyncMutateSpy);
      flowControlledSnapshot = ApplicationMethods.getDataNodeSnapshot(application, 'flowControlled');
      flowControlledSnapshot.workQueueSize.should.equal(0);
      _.isUndefined(flowControlledSnapshot.value).should.be.true();
      flowControlledSnapshot.progress.should.equal(initialProgressValue);
      asyncMutateSpy.args.length.should.equal(0);

      // old inner progress and done functions should be de-activated
      oldInnerProgressFn(0.9);
      oldInnerDoneFn(1);
      asyncMutateSpy.args.length.should.equal(0);

      var finalValue = 1;
      innerDoneFn(finalValue);
      asyncMutateSpy.args.length.should.equal(finalValue);
      asyncMutateSpy.args[0][0].should.equal('flowControlled');
      asyncMutateSpy.reset();

      application = ApplicationMethods.ensureDataNodeSnapshot(application, 'flowControlled', asyncMutateSpy);
      flowControlledSnapshot = ApplicationMethods.getDataNodeSnapshot(application, 'flowControlled');
      flowControlledSnapshot.value.should.equal(finalValue);
    });

    it('preservative function', function () {
      var innerDoneFn;
      var innerProgressFn;
      var initialProgressValue = 0.5;

      var injections = {
        'asyncFn': {
          'controlFlow': {
            procedure: function (done, progress, syncFnDeps, asyncFnDeps, dynamicArgs) {

              // register done and progress with the test harness so control can be flowed
              innerDoneFn = done;
              innerProgressFn = progress;
              return initialProgressValue;
            }
          }
        }
      };
      var application = common.constructAppWithInjections(dataNodeResource, [
        'foo',
        'concat',
        'returnWork',
        'coalescentInputFn',
        'coalescentDoWorkFn',
        'preservativeInputFn',
        'preservativeDoWorkFn',
        'input0',
        'simple',
        'flowControlled',
        'preservative'
      ], injections);

      var asyncMutateSpy = sinon.spy(function (dataNodeId, mutateFn) {
        application = MainMethods.asyncMutateDataNodeState(application, dataNodeId, mutateFn);
        return application.state.dataNode.get(dataNodeId);
      });

      var nodesOfInterest = Immutable.List.of('preservative', 'flowControlled', 'simple');
      application = ApplicationMethods.ensureDataNodeSnapshots(application, nodesOfInterest, asyncMutateSpy);
      var snapshots = ApplicationMethods.getDataNodeSnapshots(application, nodesOfInterest);
      var flowControlledSnapshot = snapshots.get('flowControlled');
      var simpleSnapshot = snapshots.get('simple');
      var preservativeSnapshot = ApplicationMethods.getDataNodeSnapshot(application, 'preservative');
      preservativeSnapshot.value.size.should.equal(2);
      preservativeSnapshot.value.get(0).size.should.equal(2);
      _.isNull(preservativeSnapshot.value.get(0).get(0)).should.be.true();
      Immutable.is(preservativeSnapshot.value.get(0).get(1), flowControlledSnapshot).should.be.true();
      preservativeSnapshot.value.get(1).size.should.equal(2);
      _.isNull(preservativeSnapshot.value.get(1).get(0)).should.be.true();
      Immutable.is(preservativeSnapshot.value.get(1).get(1), simpleSnapshot).should.be.true();

      application = ApplicationMethods.setInputNodeValue(application, 'input0', 'shouldIgnoreThis');
      application = ApplicationMethods.setInputNodeValue(application, 'input0', 'test');

      application = ApplicationMethods.ensureDataNodeSnapshots(application, nodesOfInterest, asyncMutateSpy);
      snapshots = ApplicationMethods.getDataNodeSnapshots(application, nodesOfInterest);
      var flowControlledSnapshot2 = snapshots.get('flowControlled');
      var simpleSnapshot2 = snapshots.get('simple');
      var preservativeSnapshot2 = ApplicationMethods.getDataNodeSnapshot(application, 'preservative');
      
      preservativeSnapshot2.value.size.should.equal(2);
      preservativeSnapshot2.value.get(0).size.should.equal(2);
      Immutable.is(preservativeSnapshot2.value.get(0).get(0), flowControlledSnapshot).should.be.true();
      Immutable.is(preservativeSnapshot2.value.get(0).get(1), flowControlledSnapshot2).should.be.true();
      preservativeSnapshot2.value.get(1).size.should.equal(2);
      Immutable.is(preservativeSnapshot2.value.get(1).get(0), simpleSnapshot).should.be.true();
      Immutable.is(preservativeSnapshot2.value.get(1).get(1), simpleSnapshot2).should.be.true();

      innerProgressFn(0.75);
      innerDoneFn(1);
      application = ApplicationMethods.ensureDataNodeSnapshots(application, nodesOfInterest, asyncMutateSpy);
      snapshots = ApplicationMethods.getDataNodeSnapshots(application, nodesOfInterest);
      preservativeSnapshot = snapshots.get('preservative');
      preservativeSnapshot.value.size.should.equal(2);
      preservativeSnapshot.value.get(0).size.should.equal(3);
      Immutable.is(preservativeSnapshot.value.get(0).get(0), flowControlledSnapshot).should.be.true();
      Immutable.is(preservativeSnapshot.value.get(0).get(2), snapshots.get('flowControlled')).should.be.true();

      preservativeSnapshot.value.get(1).size.should.equal(1);
      Immutable.is(preservativeSnapshot.value.get(1).get(0), simpleSnapshot2).should.be.true();
    });

    // todo data node that depends on own previous value
    // TODO: factor common code out of doWork functions
  });
});