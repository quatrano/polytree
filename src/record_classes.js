define([
  'lodash',
  'immutable'
], function (_, Immutable) {

// Record Classes
//  to be divided based on usage

'use strict';

var RecordClasses = {};

RecordClasses.AsyncInjectable = Immutable.Record({
  asPromise: _.noop,
  withCallbacks: _.noop
});

// use in transformations
RecordClasses.DataNodeSnapshot = Immutable.Record({
  'value': undefined, // <value>
  'isWorking': false, // <boolean>
  'workQueueSize': 0, // <number>
  'progress': undefined // <progress>
});

// use in methods
RecordClasses.InputNode = Immutable.Record({
  'setValue': _.noop,
  'getValue': _.noop
});

RecordClasses.InputNodeState = Immutable.Record({
  'value': undefined // <value>
});

RecordClasses.DataNodeState = Immutable.Record({

  // TODO: rename this as 'inputCache' because that's what it is
  'workQueue': new Immutable.List(), // <List <Work>>
  'workInProgress': null, // null | <Work>
  'cancelWorkInProgress': _.noop,
  'progress': null, // null | <progress>
  'value': null, // null | <value>
  'workDone': null // null | <Work>
});

RecordClasses.UpdateDepChanged = Immutable.Record({
  'inputNode': Immutable.Set(), // <Set<InputNodeId>>
  'dataNode': Immutable.Set() // <Set<DataNodeId>>
});

RecordClasses.RaisonDetre = Immutable.Record({
  id: undefined,
  index: undefined,
  parent: undefined
});

RecordClasses.ViewNodeInstanceProperties = Immutable.Record({
  'raisonDetre': RecordClasses.RaisonDetre(),
  'provenance': Immutable.Map() // <Map<viewNodeId, raisonDetre>>
});

// this holds facts about view node instances within a particular dom
RecordClasses.ViewNodeInstanceState = Immutable.Record({

  // this one only contains entering and persisting instances, not exiting ones
  // for conditional view nodes: <Map <parentInstanceId, <Map<conditionalId, instanceId>>>
  // for fixed view nodes:       <Map <parentInstanceId, instanceId>>
  'groupedRaisonDetre': Immutable.Map(),

  'instanceLookup': Immutable.Map(), // <Map<instanceId, viewNodeInstanceProperties>>
  'toReinstantiate': false,

  // map of 'dataNode': Immutable.Set(), 'inputNode': Immutable.Set()
  // set of <dataNodeId>|<inputNodeId> of dataNodes or inputNodes 
  // which have changed while instances existed
  'updateDepChanged': RecordClasses.UpdateDepChanged(),

  'enteringInstances': Immutable.Set(),
  'persistingInstances': Immutable.Set(),
  'updatingInstances': Immutable.Set(), // subset of persisting
  'exitingInstances': Immutable.Set()
});

// this holds facts about a view node class
RecordClasses.ViewNodeClassState = Immutable.Record({
  // OPTIMIZATION: cache computed attributes here
    // cache the constants in one group; won't ever change
    // cache the dynamic ones in another group; invalidate when it changes
});

RecordClasses.UpdateDomMessage = Immutable.Record({
  'traversalOrder': Immutable.List(), // List<viewNodeId>,
  'viewNodeInstances': Immutable.Map(), // Map<viewNodeId, List<instanceId>>
  'joinData': Immutable.Map(), // Map<parentInstanceId, List<childInstanceId>>
  'attributes': Immutable.Map() // Map<instanceId, Map...<key, value>>
});

RecordClasses.DomState = Immutable.Record({
  'viewNode': Immutable.Map(), // <Map <ViewNodeId, ViewNodeInstanceState>>
  'updateDomMessage': RecordClasses.UpdateDomMessage()
});

RecordClasses.State = Immutable.Record({
  // TODO: move snapshots into data node state: dataNode:snapshot?
  'dataNodeSnapshot': Immutable.Map(),
  'dataNode': Immutable.Map(),
  'inputNode': Immutable.Map(),
  'dom': Immutable.Map(), // <Map<DomId, DomState>> view node instance data
  //'viewNode': Immutable.Map() // <Map<ViewNodeId, ViewNodeClassState>> view node class data

  // OPTIMIZATIONS:
  // 'syncFnCache': Immutable.Map(),
  // 'asyncFnCache': Immutable.Map(),
});

RecordClasses.DepSetByType = Immutable.Record({
  'dataNode': Immutable.Set(),
  'inputNode': Immutable.Set(),
  'viewNode': Immutable.Set()
});

RecordClasses.DepMapByType = Immutable.Record({
  'inputNode': Immutable.Map(),
  'dataNode': Immutable.Map(),
  'viewNode': Immutable.Map()
});

RecordClasses.ViewNodeDepByPhase = Immutable.Record({
  'existence': Immutable.Set(),
  'update': Immutable.Set()
});

RecordClasses.ViewNodeDepMapByType = Immutable.Record({
  'inputNode': RecordClasses.ViewNodeDepByPhase(),
  'dataNode': RecordClasses.ViewNodeDepByPhase(),
  'viewNode': RecordClasses.ViewNodeDepByPhase()
});

RecordClasses.ViewNodeDepByDirection = Immutable.Record({
  'in': RecordClasses.DepSetByType(), // is depended on
  'out': RecordClasses.ViewNodeDepMapByType() // depends on
});

RecordClasses.DerivedViewNodeConfig = Immutable.Record({
  'children': Immutable.Set(), // <List <ViewNodeId>>
  
  // <Mapping> is a length 2 array
  // 0 is the src: a path to the data source
  // 1 is a dst: a path into where this is used
  // depending on the grouping leading up to the mapping, some items may be sliced off

  // where 'exist' indicates that the dep will impact instantiation
  //   when dep changes, if the parent is instantiated, mark this 'toReinstantiate'=true
  // and 'attr' indicates that the dep will cause an update
  //   if this node is instantiated, add the id to the 'updateDepChanged' set

  // 'dep'/'out'/<type>/'existence'|'update'/[src, dst]
  'dep': RecordClasses.ViewNodeDepByDirection(),


  // at this level the mappings are grouped into dataNodes, InputNodes, and ViewNodes to gurantee that ids are unique
  // next, group the mappings by the first entry in dst: 'existence' and 'update'
  // 'dataNodeDeps': Immutable.Map(), // <Map<DataNodeId, <GroupedMappings>>>
  // 'inputNodeDeps': Immutable.Map(), // <Map<InputNodeId, <GroupedMappings>>>

  // A viewNode can depend on the index of an ancestor viewNode (which can change)
  // TODO: this can replicate a mapping in one of the above sets
  // 'viewNodeDeps': Immutable.Map(), // <Map<ViewNodeId, <GroupedMappings>>>

  // OPTIMIZATION: figure out how to encode the dynamism 
  // TODO: put the dynamism in the first frame: 'class' | 'instance'
  'existence': undefined // undefined | <Mapping>

  // TOOD: organize mappings by their phase and dynamism etc.
  // wait until uses are clear
});

RecordClasses.DataNodeDepByDirection = Immutable.Record({
  'in': RecordClasses.DepSetByType(),
  'out': RecordClasses.DepSetByType()
});

RecordClasses.DerivedDataNodeConfig = Immutable.Record({
  'dep': RecordClasses.DataNodeDepByDirection()
});

RecordClasses.DerivedInputNodeConfig = Immutable.Record({
  'dep': RecordClasses.DepSetByType() // there is no 'out', only 'in' deps
});

RecordClasses.DerivedConfig = Immutable.Record({
  // TODO: make them derived view node config
  // and derived data node config instead of these confusing things
  // 'dataNodeDepInputNode': Immutable.Map(), // <Map<InputNodeId, <Set <DataNodeId>>>
  // 'dataNodeDepDataNode': Immutable.Map(), // <Map<DataNodeId, <Set <DataNodeId>>>
  // 'viewNodeDepInputNode': Immutable.Map(), // <Map<InputNodeId, <Set <ViewNodeId>>>
  // 'viewNodeDepDataNode': Immutable.Map(), // <Map<DataNodeId, <Set <ViewNodeId>>>

  'inputNode': Immutable.Map(), // <Map<InputNodeId, <DerivedInputNodeConfig>>
  'dataNode': Immutable.Map(), // <Map<ViewNodeId, <DerivedDataNodeConfig>>>
  'viewNode': Immutable.Map(), // <Map<ViewNodeId, <DerivedViewNodeConfig>>>
});

RecordClasses.InternalRef = Immutable.Record({
  'type': undefined, // 'constants' | 'dnDeps' | ...
  'id': undefined // <ConstantKey> | <DataNodeId> | ...
});

RecordClasses.ViewNodeConfig = Immutable.Record({
  // 'actuator': undefined, // 'd3' | ...
  'parent': undefined, // <viewNodeId> | undefined = root
  'attributeMappings': Immutable.List() // <List <List>>
});

RecordClasses.StaticDeps = Immutable.Record({
  'constant': Immutable.Map(),
  'syncFn': Immutable.Map(),
  'asyncFn': Immutable.Map()
});

RecordClasses.DataNodeConfig = Immutable.Record({

  // TODO: remove these and derive them from the mappings
    // what if the doWorkFn needs deps? it only gets static deps?
  'constantDeps': Immutable.Set(),
  'inputNodeDeps': Immutable.Set(),
  'dataNodeDeps': Immutable.Set(),
  'syncFnDeps': Immutable.Set(),
  'asyncFnDeps': Immutable.Set(),
  'inputFn': undefined,
  'doWorkFn': undefined,
  'computeArgMappings': Immutable.List(), // <List <List>>
  'computeFn': undefined // always an async function (for now)
});

RecordClasses.InputNodeConfig = Immutable.Record({});

RecordClasses.ConstantConfig = Immutable.Record({
  'value': undefined
});

RecordClasses.SyncFnConfig = Immutable.Record({
  'constantDeps': Immutable.Set(),
  'syncFnDeps': Immutable.Set(),
  'asyncFnDeps': Immutable.Set(),
  'procedure': _.noop
});

RecordClasses.AsyncFnConfig = Immutable.Record({
  'constantDeps': Immutable.Set(),
  'syncFnDeps': Immutable.Set(),
  'asyncFnDeps': Immutable.Set(),
  'procedure': _.noop
});

RecordClasses.OriginalConfig = Immutable.Record({

  // OPTIMIZATION: factor out constants
  'constant': Immutable.Map(),
  'syncFn': Immutable.Map(),
  'asyncFn': Immutable.Map(),
  'inputNode': Immutable.Map(),
  'dataNode': Immutable.Map(),
  'viewNode': Immutable.Map()
});

RecordClasses.Config = Immutable.Record({
  'original': RecordClasses.OriginalConfig(),
  'derived': RecordClasses.DerivedConfig()
});

RecordClasses.Application = Immutable.Record({
  'config': RecordClasses.Config(),
  'state': RecordClasses.State()
});

// TODO: convert to Mapping
// RecordClasses.WorkSpec = Immutable.List();
RecordClasses.WorkArg = Immutable.Record({
  'type': undefined, // 'dataNode' | 'inputNode' | 'constant'
  'id': undefined,
  'path': Immutable.List()
});

return RecordClasses;

});