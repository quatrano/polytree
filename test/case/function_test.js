define([
  'lodash',
  'immutable',
  'resource/common_resource',

  'polytree/application_methods',
  'polytree/dev_util',

  'resource/function_resource'
], function (_, Immutable, common,
             ApplicationMethods, DevUtil,
             functionDefinitions) {

  var sinon = common.sinon;

  describe('function definition', function() {

    // TODO: make the default prodedure for async fn call done
    it('empty sync', function() {
      var app = common.constructContextWithThingConfigs(functionDefinitions, ['emptySync']);
      _.isUndefined(ApplicationMethods.getSyncFunction(app, 'emptySync')()).should.equal(true);
    });

    it('empty async', function() {
      var app = common.constructContextWithThingConfigs(functionDefinitions, ['emptyAsync']);
      _.isUndefined(ApplicationMethods.getAsyncFunction(app, 'emptyAsync').withCallbacks(_.noop, _.noop)).should.equal(true);
    });

    it('sync', function() {
      var app = common.constructContextWithThingConfigs(functionDefinitions, ['sync']);
      ApplicationMethods.getSyncFunction(app, 'sync')().should.equal(1);
    });

    it('syncDepConstant', function() {
      var app = common.constructContextWithThingConfigs(functionDefinitions, ['foo', 'syncDepConstant']);
      ApplicationMethods.getSyncFunction(app, 'syncDepConstant')().should.equal(true);
    });

    it('async', function(done) {
      var isDone = false;
      var onProgress = sinon.spy();
      var onDone = function (doneVal) {
        if (isDone) throw new Error('onDone called more than once');
        onProgress.callCount.should.equal(1);
        onProgress.args[0].length.should.equal(1);
        onProgress.args[0][0].should.equal(0);
        doneVal.should.equal(1);
        done();
      };
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['async']);
      ApplicationMethods.getAsyncFunction(context, 'async').withCallbacks(onDone, onProgress);
    });

    it('asyncProgress', function(done) {
      var isDone = false;
      var onProgress = sinon.spy();
      var onDone = function (doneVal) {
        if (isDone) throw new Error('onDone called more than once');
        onProgress.callCount.should.equal(2);
        onProgress.args[0].length.should.equal(1);
        onProgress.args[0][0].should.equal(0);
        onProgress.args[1].length.should.equal(1);
        onProgress.args[1][0].should.equal(0.5);
        doneVal.should.equal(1);
        done();
      };
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['asyncProgress']);
      ApplicationMethods.getAsyncFunction(context, 'asyncProgress').withCallbacks(onDone, onProgress);
    });

    it('syncDepSync', function() {
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['syncDepSync', 'sync']);
      ApplicationMethods.getSyncFunction(context, 'syncDepSync')().should.equal(1);
    });

    it('syncDepSyncMultiCall', function() {
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['syncDepSyncMultiCall', 'sync']);
      ApplicationMethods.getSyncFunction(context, 'syncDepSyncMultiCall')().should.equal(1);
    });

    it('syncDepAsync', function(done) {
      var isDone = false;
      var onDone = function (doneVal) {
        if (isDone) throw new Error('onDone called more than once');
        doneVal.should.equal(1);
        done();
      };
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['syncDepAsync', 'async']);
      ApplicationMethods.getSyncFunction(context, 'syncDepAsync')().then(onDone);
    });

    it('asyncDepSync0', function(done) {
      var isDone = false;
      var onProgress = sinon.spy();
      var onDone = function (doneVal) {
        if (isDone) throw new Error('onDone called more than once');
        onProgress.callCount.should.equal(0);
        doneVal.should.equal(1);
        done();
      };
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['asyncDepSync0', 'sync']);
      ApplicationMethods.getAsyncFunction(context, 'asyncDepSync0').withCallbacks(onDone, onProgress);
    });

    it('asyncDepSync1', function(done) {
      var isDone = false;
      var onProgress = sinon.spy();
      var onDone = function (doneVal) {
        if (isDone) throw new Error('onDone called more than once');
        onProgress.callCount.should.equal(1);
        onProgress.args[0].length.should.equal(1);
        onProgress.args[0][0].should.equal(0.5);
        doneVal.should.equal(1);
        done();
      };
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['asyncDepSync1', 'sync']);
      ApplicationMethods.getAsyncFunction(context, 'asyncDepSync1').withCallbacks(onDone, onProgress);
    });

    it('onProgress called synchronously', function () {
      var isDone = false;
      var onProgress = sinon.spy();
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['asyncDepSync1', 'sync']);
      ApplicationMethods.getAsyncFunction(context, 'asyncDepSync1').withCallbacks(_.noop, onProgress);
      onProgress.callCount.should.equal(1);
      onProgress.args[0].length.should.equal(1);
      onProgress.args[0][0].should.equal(0.5);
    });

    it('asyncDepAsync0', function(done) {
      var isDone = false;
      var onProgress = sinon.spy();
      var onDone = function (doneVal) {
        if (isDone) throw new Error('onDone called more than once');
        onProgress.callCount.should.equal(1);
        onProgress.args[0].length.should.equal(1);
        onProgress.args[0][0].should.equal(0.5);
        doneVal.should.equal(1);
        done();
      };
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['asyncDepAsync0', 'asyncProgress']);
      ApplicationMethods.getAsyncFunction(context, 'asyncDepAsync0').withCallbacks(onDone, onProgress);
    });

    it('asyncDepAsync1', function(done) {
      var isDone = false;
      var onProgress = sinon.spy();
      var onDone = function (doneVal) {
        if (isDone) throw new Error('onDone called more than once');
        onProgress.callCount.should.equal(2);
        onProgress.args[0].length.should.equal(1);
        onProgress.args[0][0].should.equal(0);
        onProgress.args[1].length.should.equal(1);
        onProgress.args[1][0].should.equal(0.5);
        doneVal.should.equal(1);
        done();
      };
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['asyncDepAsync1', 'asyncProgress']);
      ApplicationMethods.getAsyncFunction(context, 'asyncDepAsync1').withCallbacks(onDone, onProgress);
    });

    it('asyncDepAsyncMultiCall0', function(done) {
      var isDone = false;
      var onProgress = sinon.spy();
      var onDone = function (doneVal) {
        if (isDone) throw new Error('onDone called more than once');
        onProgress.callCount.should.equal(1);
        onProgress.args[0].length.should.equal(1);
        onProgress.args[0][0].should.equal(0.5);
        doneVal.should.equal(1);
        done();
      };
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['asyncDepAsyncMultiCall0', 'asyncProgress']);
      ApplicationMethods.getAsyncFunction(context, 'asyncDepAsyncMultiCall0').withCallbacks(onDone, onProgress);
    });

    it('asyncDepAsyncMultiCall1', function(done) {
      var isDone = false;
      var onProgress = sinon.spy();
      var onDone = function (doneVal) {
        if (isDone) throw new Error('onDone called more than once');
        onProgress.callCount.should.equal(5);
        onProgress.args[0].length.should.equal(1);
        onProgress.args[0][0].should.equal(1);
        onProgress.args[1].length.should.equal(1);
        onProgress.args[1][0].should.equal(2);
        onProgress.args[2].length.should.equal(1);
        onProgress.args[2][0].should.equal(3);
        onProgress.args[3].length.should.equal(1);
        onProgress.args[3][0].should.equal(4);
        onProgress.args[4].length.should.equal(1);
        onProgress.args[4][0].should.equal(5);
        doneVal.should.equal(6);
        done();
      };
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['asyncDepAsyncMultiCall1', 'asyncProgress']);
      ApplicationMethods.getAsyncFunction(context, 'asyncDepAsyncMultiCall1').withCallbacks(onDone, onProgress);
    });

    it('multiDep0', function(done) {
      var isDone = false;
      var onDone = function (doneVal) {
        if (isDone) throw new Error('onDone called more than once');
        doneVal.should.eql({
          asyncVal: 1,
          syncVal: 1
        });
        done();
      };
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['multiDep0', 'sync', 'async']);
      ApplicationMethods.getAsyncFunction(context, 'multiDep0').asPromise().then(onDone);
    });

    it('multiDep1', function(done) {
      var isDone = false;
      var onProgress = sinon.spy();
      var onDone = function (doneVal) {
        if (isDone) throw new Error('onDone called more than once');
        onProgress.callCount.should.equal(2);
        onProgress.args[0].length.should.equal(1);
        onProgress.args[0][0].should.eql({
          asyncVal: 0,
          syncVal: 1
        });
        onProgress.args[1].length.should.equal(1);
        onProgress.args[1][0].should.eql({
          asyncVal: 0.5,
          syncVal: 1
        });
        doneVal.should.eql({
          asyncVal: 1,
          syncVal: 1
        });
        done();
      };
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['multiDep1', 'sync', 'asyncProgress']);
      ApplicationMethods.getAsyncFunction(context, 'multiDep1').withCallbacks(onDone, onProgress);
    });

    it('nestedDep', function(done) {
      var isDone = false;
      var onProgress = sinon.spy();
      var onDone = function (doneVal) {
        if (isDone) throw new Error('onDone called more than once');
        onProgress.callCount.should.equal(1);
        onProgress.args[0].length.should.equal(1);
        onProgress.args[0][0].should.equal(0.5);
        doneVal.should.equal(1);
        done();
      };
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['nestedDep', 'asyncDepAsync0', 'asyncProgress']);
      ApplicationMethods.getAsyncFunction(context, 'nestedDep').withCallbacks(onDone, onProgress);
    });

    it('dynamicSync', function() {
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['dynamicSync']);
      ApplicationMethods.getSyncFunction(context, 'dynamicSync')(1, 1).should.equal(2);
    });

    describe('function definition', function() {
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['dynamicAsync']);

      it('dynamicAsync_0', function(done) {
        var isDone = false;
        var onDone = function (doneVal) {
          if (isDone) throw new Error('onDone called more than once');
          doneVal.should.equal(2);
          done();
        };
        ApplicationMethods.getAsyncFunction(context, 'dynamicAsync').asPromise(1, 1).then(onDone);
      });

      it('dynamicAsync_1', function(done) {
        var isDone = false;
        var onDone = function (doneVal) {
          if (isDone) throw new Error('onDone called more than once');
          doneVal.should.equal(2);
          done();
        };
        ApplicationMethods.getAsyncFunction(context, 'dynamicAsync').withCallbacks(onDone, _.noop, Immutable.List.of(1, 1));
      });
    });

    it('dynamicAndStaticSync', function() {
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['dynamicAndStaticSync', 'sync']);
      ApplicationMethods.getSyncFunction(context, 'dynamicAndStaticSync')(1, 1).should.equal(2);
    });

    it('dynamicAndStaticAsync', function(done) {
      var isDone = false;
      var onProgress = sinon.spy();
      var onDone = function (doneVal) {
        if (isDone) throw new Error('onDone called more than once');
        onProgress.callCount.should.equal(3);
        onProgress.args[0].length.should.equal(1);
        onProgress.args[0][0].should.equal(0);
        onProgress.args[1].length.should.equal(1);
        onProgress.args[1][0].should.equal(0);
        onProgress.args[2].length.should.equal(1);
        onProgress.args[2][0].should.equal(0.5);
        doneVal.should.equal(1);
        done();
      };
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['dynamicAndStaticAsync', 'asyncProgress']);
      ApplicationMethods.getAsyncFunction(context, 'dynamicAndStaticAsync').withCallbacks(onDone, onProgress, Immutable.List.of(1));
    });

    it('recursiveSync', function() {
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['recursiveSync']);
      ApplicationMethods.getSyncFunction(context, 'recursiveSync')().should.equal(1);
    });

    it('recursiveAsync0', function(done) {
      var isDone = false;
      var onDone = function (doneVal) {
        if (isDone) throw new Error('onDone called more than once');
        doneVal.should.equal(1);
        done();
      };
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['recursiveAsync0']);
      ApplicationMethods.getAsyncFunction(context, 'recursiveAsync0').withCallbacks(onDone, _.noop);
    });

    it('recursiveAsync1', function(done) {
      var isDone = false;
      var onProgress = sinon.spy();
      var onDone = function (doneVal) {
        if (isDone) throw new Error('onDone called more than once');
        onProgress.callCount.should.equal(3);
        onProgress.args[0].length.should.equal(1);
        onProgress.args[0][0].should.equal(0.25);
        onProgress.args[1].length.should.equal(1);
        onProgress.args[1][0].should.equal(0.5);
        onProgress.args[2].length.should.equal(1);
        onProgress.args[2][0].should.equal(0.75);
        doneVal.should.equal(1);
        done();
      };
      var context = common.constructContextWithThingConfigs(functionDefinitions, ['recursiveAsync1']);
      ApplicationMethods.getAsyncFunction(context, 'recursiveAsync1').withCallbacks(onDone, onProgress);
    });

  });

});