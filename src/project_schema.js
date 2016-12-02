define([
  'lodash',
  'immutable',

  'polytree/schema_util',
  'polytree/application_schema'
], function (_, Immutable, 
             SchemaUtil, applicationSchema) {

'use strict';

var S = SchemaUtil.Schema;
var P = SchemaUtil.SchemaPart;
var M = Immutable.Map;

var schema = new S({
  parent: applicationSchema,
  parts: new M({
    'project': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'schema': 'schema',
          'config': 'config'
        })
      })
    }),

    // TODO: move schema into the most basic schema so all schema definitions can reduce boilerplate
    'schema': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          parent: '<any>', // this is a schema with fns attached... ehh.
          parts: 'schema_part_map'
        })
      })
    }),

    'schema_part_map': new P({
      parent: '<map>',
      options: new M({
        childType: 'schema_part'
      })
    }),

    'schema_part': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'name': '<string>',
          'parent': '<string>',
          'options': '<any>',
          'serialize': '<function>',
          'deserialize': '<function>',
          'extend': '<function>',
        })
      })
    }),

    'config': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'constant': 'constant_map',
          'syncFn': 'syncFn_map',
          'asyncFn': 'async_fn_map',
          'inputNode': 'input_node_map',
          'dataNode': 'data_node_map',
          'viewNode': 'view_node_map',
          'viewActuator': 'view_actuator_config_map'
        })
      })
    }),


    'constant_map': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: 'constant'
      })
    }),
    'constant': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'name': '<string>',
          'schema': '<string>',
          'config': 'constant_config'
        })
      })
    }),

    'syncFn_map': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: 'syncFn'
      })
    }),
    'syncFn': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'name': '<string>',
          'config': 'syncFn_config',
          'argumentOrder': 'ordered_set_of_strings',
          'argumentData': 'map_of_argument_data',
          'constantDeps': 'map_of_aliased_dependencies',
          'syncFnDeps': 'map_of_aliased_dependencies',
          'asyncFnDeps': 'map_of_aliased_dependencies',
          'procedure': 'list_of_strings'
        })
      })
    }),

    'async_fn_map': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: 'async_fn'
      })
    }),
    'async_fn': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'name': '<string>',
          'config': 'asyncFn_config', // TODO: phase this out
          'argumentOrder': 'ordered_set_of_strings',
          'argumentData': 'map_of_argument_data',
          'constantDeps': 'map_of_aliased_dependencies',
          'syncFnDeps': 'map_of_aliased_dependencies',
          'asyncFnDeps': 'map_of_aliased_dependencies',
          'procedure': 'list_of_strings'
        })
      })
    }),

    'map_of_argument_data': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: 'argument_data'
      })
    }),

    'argument_data': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'description': '<string>',
          'localVariable': 'local_variable',
          // 'schema': '<string>' // TODO: implement this
        })
      })
    }),

    'map_of_aliased_dependencies': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: 'aliased_dependency'
      })
    }),

    'aliased_dependency': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'id': '<string>',
          'localVariable': 'local_variable'
        })
      })
    }),

    // TODO: make this a string with no spaces or other special characters
    'local_variable': new P({
      parent: '<string>'
    }),

    'input_node_map': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: 'input_node'
      })
    }),
    'input_node': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'name': '<string>',
          'config': 'input_node_config',
        })
      })
    }),

    'data_node_map': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: 'data_node'
      })
    }),
    'data_node': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'name': '<string>',
          'inputStrategy': '<string>', // 'coalescent' || 'preservative'
          'argumentMappings': 'map_of_argument_mappings',
          'computeFn': '<string>',
          'config': 'data_node_config', // TODO: deprecated
        })
      })
    }),

    'view_node_map': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: 'view_node'
      })
    }),
    'view_node': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'name': '<string>',
          'actuator': '<string>',
          'parent': '<string>',
          'children': 'list_of_strings_def_empty',
          'attributeMappings': 'list_of_identified_data_mappings',
          'eventBindings': 'list_of_identified_event_bindings',
          'config': 'view_node_config' // deprecated 
        })
      })
    }),

    'list_of_identified_data_mappings': new P({
      parent: '<list>',
      options: new M({
        defaultValue: [],
        childType: 'identified_data_mapping'
      })
    }),
    'identified_data_mapping': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'id': '<string>',
          'src': 'list_of_(string_or_list_of_string)',
          'dst': 'list_of_strings'
        })
      })
    }),
    'map_of_data_mappings': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: 'data_mapping'
      })
    }),
    'data_mapping': new P({
      parent: '<record>',
      options: new M({
        fields: new M({
          'src': 'list_of_(string_or_list_of_string)',
          'dst': 'list_of_strings'
        })
      })
    }),
    'list_of_identified_event_bindings': new P({
      parent: '<list>',
      options: new M({
        defaultValue: [],
        childType: 'identified_event_binding'
      })
    }),
    'identified_event_binding': new P({
      parent: '<record>',
      options: new M({
        defaultValue: {},
        fields: new M({
          'id': '<string>',
          'phase': 'list_of_strings',
          'inputNode': '<string>',
          'dataMappings': 'list_of_identified_data_mappings'
        })
      })
    }),

    'ordered_set_of_strings': new P({
      parent: '<ordered_set>',
      options: new M({
        defaultValue: [],
        childType: '<string>'
      })
    }),
    'map_of_argument_mappings': new P({
      parent: '<map>',
      options: new M({
        defaultValue: {},
        childType: 'list_of_strings'
      })
    }),

  })
});

return SchemaUtil.getFactory(schema);

});