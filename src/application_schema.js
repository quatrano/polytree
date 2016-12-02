define([
  'lodash',
  'immutable',

  'polytree/schema_util'
], function (_, Immutable, SchemaUtil) {

'use strict';

var SchemaPart = SchemaUtil.SchemaPart;
var P = SchemaUtil.SchemaPart;
var Map = Immutable.Map;
var M = Map;

var schema = new SchemaUtil.Schema({
  parent: SchemaUtil.baseSchema,
  parts: new M({
    'application': new SchemaPart({
      parent: '<record>',
      options: new Map({
        defaultValue: {},
        fields: new Map({
          'config': 'application_config',
          'state': 'application_state'
        })
      })
    }),

    'application_config': new SchemaPart({
      parent: '<record>',
      options: new Map({
        defaultValue: {},
        fields: new Map({
          'original': 'original_config',
          'derived': 'derived_config'
        })
      })
    }),

    'original_config': new SchemaPart({
      parent: '<record>',
      options: new Map({
        defaultValue: {},
        fields: new Map({
          'constant': 'constant_config_map',
          'syncFn': 'syncFn_config_map',
          'asyncFn': 'asyncFn_config_map',
          'inputNode': 'input_node_config_map',
          'dataNode': 'data_node_config_map',
          'viewNode': 'view_node_config_map',
          'viewActuator': 'view_actuator_config_map'
        })
      })
    }),

    'constant_config_map': new P({
      parent: '<map>',
      options: new Map({
        childType: 'constant_config'
      })
    }),

    'constant_config': new SchemaPart({
      parent: '<record>',
      options: new Map({
        defaultValue: {},
        fields: new Map({
          'value': '<any>'
        })
      })
    }),

    'syncFn_config_map': new SchemaPart({
      parent: '<map>',
      options: new Map({
        childType: 'syncFn_config'
      })
    }),

    'syncFn_config': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'constantDeps': 'set_of_strings',  // TODO: add validation that the strings are constant ids
          'syncFnDeps': 'set_of_strings',
          'asyncFnDeps': 'set_of_strings',
          'procedure': 'function_default_noop'
        })
      })
    }),

    'asyncFn_config_map': new P({
      parent: '<map>',
      options: new M({
        childType: 'asyncFn_config'
      })
    }),

    'asyncFn_config': new SchemaPart({
      parent: '<record>',
      options: new Map({
        defaultValue: {},
        fields: new Map({
          'constantDeps': 'set_of_strings',
          'syncFnDeps': 'set_of_strings',
          'asyncFnDeps': 'set_of_strings',
          'procedure': 'function_default_done'
        })
      })
    }),

    'input_node_config_map': new SchemaPart({
      parent: '<map>',
      options: new Map({
        childType: 'input_node_config'
      })
    }),

    // this is an empty record... consider changing this
    'input_node_config': new SchemaPart({
      parent: '<record>',
      options: new Map({
        defaultValue: {}
      })
    }),

    'data_node_config_map': new SchemaPart({
      parent: '<map>',
      options: new Map({
        childType: 'data_node_config'
      })
    }),

    'data_node_config': new SchemaPart({
      parent: '<record>',
      options: new Map({
        defaultValue: {},
        fields: new Map({
          'constantDeps': 'set_of_strings',
          'syncFnDeps': 'set_of_strings',
          'asyncFnDeps': 'set_of_strings',
          'inputNodeDeps': 'set_of_strings',
          'dataNodeDeps': 'set_of_strings',
          
          // TODO: doWorkFn and inputFn can be more reusable with '<fn>ArgMappings'
            // and replace the map with a list
          'inputFn': 'string_required',
          'doWorkFn': 'string_required',
          'computeArgMappings': 'compute_arg_mappings',
          'computeFn': 'string_required' // always an async function (for now)
        })
      })
    }),

    'view_node_config_map': new P({
      parent: '<map>',
      options: new M({
        childType: 'view_node_config'
      })
    }),

    'view_node_config': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'actuator': '<string>', // TODO: this is actually the actuator for the children of this view node
          'parent': '<string>',   // <viewNodeId> | undefined = root
          'children': 'list_of_strings_def_empty',
          'attributeMappings': 'attribute_mapping_list',
          'eventBindings': 'event_binding_config_list'
        })
      })
    }),

    'view_actuator_config_map': new P({
      parent: '<map>',
      options: new M({
        childType: 'view_actuator_config'
      })
    }),

    'view_actuator_config': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          // TODO: add some kind of 'possibleAttributes' data structure here
          // so the IDE can read it? that seems strange to have it here... TBD
          'joinFn': '<string>',
          'enterFn': '<string>',
          'updateFn': '<string>',
          'exitFn': '<string>',
          'handleEventFn': '<string>'
        })
      })
    }),

    'derived_config': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'inputNode': 'derived_input_node_config_map',
          'dataNode': 'derived_data_node_config_map',
          'viewNode': 'derived_view_node_config_map'
        })
      })
    }),

    'derived_input_node_config_map': new P({
      parent: '<map>',
      options: new M({
        childType: 'derived_input_node_config'
      })
    }),
    'derived_input_node_config': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'dep': 'dep_in'
        })
      })
    }),

    'derived_data_node_config_map': new P({
      parent: '<map>',
      options: new M({
        childType: 'derived_data_node_config'
      })
    }),
    'derived_data_node_config': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'dep': 'data_node_deps'
        })
      })
    }),
    'data_node_deps': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'in': 'dep_in', // is depended on
          'out': 'data_node_dep_out' // depends on
        })
      })
    }),
    'dep_in': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'dataNode': 'set_of_strings',
          'viewNode': 'set_of_strings'
        })
      })
    }),
    'data_node_dep_out': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'inputNode': 'set_of_strings',
          'dataNode': 'set_of_strings',
          'viewNode': 'set_of_strings'
        })
      })
    }),

    'derived_view_node_config_map': new P({
      parent: '<map>',
      options: new M({
        childType: 'derived_view_node_config'
      })
    }),
    'derived_view_node_config': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'children': 'list_of_strings',

          // OPTIMIZATION: figure out how to encode the dynamism 
          // TODO: put the dynamism in the first frame: 'class' | 'instance' | 'constant'
          // TODO: this can replicate a mapping in one of the deps
          'existence': 'list_of_(string_or_list_of_string)',
          'dep': 'view_node_deps'
        })
      })
    }),
    'view_node_deps': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'in': 'dep_in',
          'out': 'view_node_dep_out'
        })
      })
    }),
    'view_node_dep_out': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'inputNode': 'view_node_dep_out_by_phase_map',
          'dataNode': 'view_node_dep_out_by_phase_map',
          'viewNode': 'view_node_dep_out_by_phase_map'
        })
      })
    }),
    'view_node_dep_out_by_phase_map': new P({
      parent: '<map>',
      options: new M({
        childType: 'view_node_dep_out_by_phase'
      })
    }),
    'view_node_dep_out_by_phase': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'existence': 'attribute_mapping_list',
          'update': 'attribute_mapping_list'
        })
      })
    }),

    'application_state': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          // TODO: move snapshots into data node state: dataNode:snapshot?
          'dataNodeSnapshot': 'data_node_snapshot_map',
          'dataNode': 'data_node_state_map',
          'inputNode': 'input_node_state_map',
          'dom': 'dom_state_map', // <Map<DomId, DomState>> view node instance data

          // OPTIMIZATIONS:
          // 'syncFnCache': Immutable.Map(),
          // 'asyncFnCache': Immutable.Map(),
          // 'viewNode': 'view_node_state_map' // <Map<ViewNodeId, ViewNodeClassState>> view node class data
        })
      })
    }),

    'data_node_snapshot_map': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: 'data_node_snapshot'
      })
    }),
    'data_node_snapshot': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'value': '<any>', // <value>
          'isWorking': 'boolean_default_false', // <boolean>
          'workQueueSize': '<number>',
          'progress': '<any>' // <progress>
        })
      })
    }),

    'data_node_state_map': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: 'data_node_state'
      })
    }),
    'data_node_state': new P({
      parent: '<record>',
      options: new M({
        fields: new M({

          // TODO: rename this as 'inputCache' because that's what it is
          'workQueue': 'work_queue', // <List <Work>> TODO: what parent is work?
          'workInProgress': '<any>', // null | <Work> TODO: is undefined ok here?
          'cancelWorkInProgress': '<function>',
          'progress': '<any>', // null | <progress>
          'value': '<any>', // null | <value>
          'workDone': '<any>', // null | <Work>
          'dirty': 'data_node_dirty' // TODO: come up with a better name for this
        })
      })
    }),

    'data_node_dirty': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'depDirty': 'set_of_strings', // only data nodes can be dirty
          'depChanged': 'boolean_default_false'
        })
      })
    }),

    'input_node_state_map': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: 'input_node_state'
      })
    }),
    'input_node_state': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'value': '<any>' // <value>
        })
      })
    }),

    'dom_state_map': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: 'dom_state'
      })
    }),
    'dom_state': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'viewNode': 'view_node_instance_state_map',
          'updateDomMessage': 'update_dom_message'
        })
      })
    }),

    'view_node_instance_state_map': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: 'view_node_instance_state'
      })
    }),
    // this holds facts about view node instances within a particular dom
    'view_node_instance_state': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          // this one only contains entering and persisting instances, not exiting ones
          // TODO: make conditional and fixed nodes use the same schema
          // for conditional view nodes: <Map <parentInstanceId, <Map<conditionalId, instanceId>>>
          // for fixed view nodes:       <Map <parentInstanceId, instanceId>>
          'groupedRaisonDetre': 'map_of_auto',

          'instanceLookup': 'view_node_instance_properties_map', // <Map<instanceId, viewNodeInstanceProperties>>
          'toReinstantiate': 'boolean_default_false',

          // dataNodes or inputNodes which have changed while instances existed
          'dirty': 'view_node_dirty',

          'enteringInstances': 'set_of_strings',
          'persistingInstances': 'set_of_strings',
          'updatingInstances': 'set_of_strings', // subset of persisting
          'exitingInstances': 'set_of_strings'
        })
      })
    }),
    'view_node_dirty': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'depDirty': 'set_of_strings', // only data nodes can be dirty
          'depChanged': 'view_node_dep_changed'
        })
      })
    }),
    'view_node_dep_changed' : new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'dataNode': 'set_of_strings',
          'inputNode': 'set_of_strings'
        })
      })
    }),
    'view_node_instance_properties_map': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: 'view_node_instance_properties'
      })
    }),
    'view_node_instance_properties': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'raisonDetre': 'raison_detre',
          'provenance': 'raison_detre_map' // <Map<viewNodeId, raisonDetre>>
        })
      })
    }),
    'raison_detre_map': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: 'raison_detre'
      })
    }),
    'raison_detre': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          id: '<string>',
          index: '<number>',
          parent: '<string>'
        })
      })
    }),

    'update_dom_message': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'traversalOrder': 'list_of_strings', // <viewNodeId>
          'viewNodeInstances': 'map_of_list_of_strings', // <viewNodeId, List<instanceId>>
          'joinData': 'map_of_list_of_strings', // Map<parentInstanceId, List<childInstanceId>>
          'attributes': '<auto>' // Map<instanceId, Map...<key, value>>
        })
      })
    }),

    'attribute_mapping_list': new P({
      parent: '<list>',
      options: new M({
        defaultValue: [],
        childType: 'attribute_mapping'
      })
    }),
    'attribute_mapping': new P({
      parent: '<list>',
      options: new M({
        childType:  'list_of_(string_or_list_of_string)' // TODO: make thi a record
      })
    }),

    'event_binding_config_list': new P({
      parent: '<list>',
      options: new M({
        defaultValue: [],
        childType: 'event_binding_config'
      })
    }),
    'event_binding_config': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'phase': 'list_of_strings',
          'inputNode': '<string>',
          'ids': 'event_binding_ids',
          'dataMappings': 'data_mapping_list'// TODO
        })
      })
    }),
    'event_binding_ids': new P({
      parent: '<list>',
      options: new M({
        childType: 'list_of_(string_or_list_of_string)'
      })
    }),
    'data_mapping_list': new P({
      parent: '<list>',
      options: new M({
        defaultValue: [],
        childType: 'data_mapping'
      })
    }),
    'data_mapping': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'src': 'list_of_(string_or_list_of_string)',
          'dst': 'list_of_(string_or_list_of_string)'
        })
      })
    }),

    'dereferenced_event_binding': new P({ // TODO: better name
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'phase': 'list_of_strings',
          'inputNode': '<string>',
          'ids': 'list_of_strings',
          'data': '<auto>'
        })
      })
    }),
    'dereferenced_event_binding_without_phase': new P({ // TODO: remove this
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'inputNode': '<string>',
          'ids': 'list_of_strings',
          'data': '<auto>'
        })
      })
    }),

    'map_of_list_of_strings': new P({
      parent: '<map>',
      options: new M({
        childType: 'list_of_strings'
      })
    }),

    'map_of_auto': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: '<auto>'
      })
    }),

    'compute_arg_mappings': new P({
      parent: '<list>',
      options: new M({
        defaultValue: [],
        childType: 'list_of_strings'
      })
    }),

    'work_queue': new P({
      parent: '<list>',
      options: new M({
        defaultValue: [],
        childType: '<any>'
      })
    }),

    'list_of_strings': new P({
      parent: '<list>',
      options: new M({
        childType: '<string>'
      })
    }),

    'list_of_strings_def_empty': new P({
      parent: '<list>',
      options: new M({
        defaultValue: [],
        childType: '<string>'
      })
    }),

    'list_of_(string_or_list_of_string)': new P({
      parent: '<list>',
      options: new M({
        // TODO: heterogeneous collections are bad
        // solution: use a delimiting character to indicate id and index references
        // eg: 🆔(square id U+1F194)
        //     ※(reference mark U+203b)
        //     #(number sign U+0023)
        //     №(numero sign U+2116)
        //     º(masculine ordinal symbol U+00BA)
        //     °(degree sign U+00B0)
        // collisions become impossible when all field names are replaced by ids,
        // so id mappings contain only special words or ids
        childType: 'string_or_list_of_string',
      })
    }),

    // TODO: handle numbers here too.  A literal might have a number
    'string_or_list_of_string': new P({
      deserialize: function (serObj, self, deserializeObject) {
        if (_.isString(serObj)) {
          return deserializeObject(serObj, '<string>');
        } else if (_.isArray(serObj)) {
          return deserializeObject(serObj, '<list>');
        }
      }
    }),

    'set_of_strings': new P({
      parent: '<set>',
      options: new M({
        childType: '<string>',
        defaultValue: []
      })
    }),

    'set_of_strings_default_undefined': new P({
      parent: '<set>',
      options: new M({
        childType: '<string>',
        defaultValue: undefined
      })
    }),

    'string_required': new P({
      parent: '<string>',
      // TODO: add validation
    }),

    'function_default_noop': new P({
      parent: '<function>',
      options: new M({
        defaultValue: function () {}
      })
    }),

    'function_default_done': new P({
      parent: '<function>',
      options: new M({
        defaultValue: function (done) {
          return done();
        }
      })
    }),

    'boolean_default_false': new P({
      parent: '<boolean>',
      options: new M({
        defaultValue: false
      })
    }),

    'boolean_default_true': new P({
      parent: '<boolean>',
      options: new M({
        defaultValue: true
      })
    }),

    // maybe this belongs in a different place
    'browser_event': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'time': '<number>',
          'id': 'list_of_strings',
          'data': '<auto>'     // TODO: probably better make this immutable
        })
      })
    })

  })
});

return SchemaUtil.getFactory(schema);

});