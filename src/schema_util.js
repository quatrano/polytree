define([
  'lodash',
  'immutable',

  'polytree/common',
  'polytree/record_classes'
], function (_, Immutable,
             common, RC) {

'use strict';

var Schema = Immutable.Record({
  parent: undefined, // undefined | <Schema>
  parts: Immutable.Map() // <SchemaParts>
});

var SchemaPart = Immutable.Record({
  // TODO: add validation
  // TODO: add to deserialized string (and to serialized string?)
  parent: undefined, // undefined | <string>
  options: undefined, // undefined | <auto>
  serialize: undefined,
  deserialize: undefined,
  extend: undefined, // undefined | <function>
});

var baseSchema = new Schema({
  parts: Immutable.Map({
    '<self_describing>': new SchemaPart({
      // TODO: handle the case that a self describing object refers to a schema in a higher level
      deserialize: function (serObj, self, deserializeObject) {
        if (_.isUndefined(serObj)) {
          return undefined;
        }
        return deserializeObject(serObj.value, serObj.type);
      }
    }),

    '<any>': new SchemaPart({
      options: Immutable.Map({
        defaultValue: undefined
      }),
      deserialize: function (serObj, self) {
        if (_.isUndefined(serObj)) {
          return self.options.get('defaultValue');
        } else {
          return serObj;
        }
      },
      extend: function (self, child) {
        if (!child.extend) child = child.set('extend', self.extend);
        child = child.set('options', self.options.mergeDeep(child.options));
        child = child.set('deserialize', self.deserialize);
        return child;
      }
    }),

    '<string>': new SchemaPart({
      options: Immutable.Map({
        defaultValue: undefined
      }),
      deserialize: function (serObj, self) {
        if (_.isUndefined(serObj)) {
          var defaultValue = self.options.get('defaultValue');
          if (_.isString(defaultValue) || 
            defaultValue === null || defaultValue === undefined) {
            return defaultValue;
          } else {
            serObj = defaultValue;
          }
        }
        if (_.isString(serObj)) {
          return serObj;
        } else {
          return String(serObj);
        }
      },
      extend: function (self, child) {
        if (!child.extend) child = child.set('extend', self.extend);
        child = child.set('options', self.options.mergeDeep(child.options));
        child = child.set('deserialize', self.deserialize);
        return child;
      }
    }),

    '<number>': new SchemaPart({
      options: Immutable.Map({
        defaultValue: undefined
      }),
      deserialize: function (serObj, self) {
        if (_.isUndefined(serObj)) {
          var defaultValue = self.options.get('defaultValue');
          if (_.isNumber(defaultValue) ||
            defaultValue === null || defaultValue === undefined) {
            return defaultValue;
          } else {
            serObj = defaultValue;
          }
        }
        if (_.isNumber(serObj)) {
          return serObj;
        } else {
          return Number(serObj);
        }
      },
      extend: function (self, child) {
        if (!child.extend) child = child.set('extend', self.extend);
        child = child.set('options', self.options.mergeDeep(child.options));
        child = child.set('deserialize', self.deserialize);
        return child;
      }
    }),

    '<boolean>': new SchemaPart({
      options: Immutable.Map({
        defaultValue: undefined
      }),
      deserialize: function (serObj, self) {
        if (_.isUndefined(serObj)) {
          var defaultValue = self.options.get('defaultValue');
          if (_.isBoolean(defaultValue) ||
            defaultValue === null || defaultValue === undefined) {
            return defaultValue;
          } else {
            serObj = defaultValue;
          }
        }
        if (_.isBoolean(serObj)) {
          return serObj;
        } else {
          return Boolean(serObj);
        }
      },
      extend: function (self, child) {
        child = child.set('extend', self.extend);
        child = child.set('options', self.options.mergeDeep(child.options));
        child = child.set('deserialize', self.deserialize);
        return child;
      }
    }),

    '<function>': new SchemaPart({
      options: Immutable.Map({
        defaultValue: undefined
      }),
      deserialize: function (serObj, self) {
        if (_.isUndefined(serObj)) {
          var defaultValue = self.options.get('defaultValue');
          if (_.isFunction(defaultValue) ||
            defaultValue === null || defaultValue === undefined) {
            return defaultValue;
          } else {
            serObj = defaultValue;
          }
        }
        if (_.isFunction(serObj)) {
          return serObj;
        } else {
          throw new Error('extend this and decide how to cast values to functions');
        }
      },
      extend: function (self, child) {
        child = child.set('extend', self.extend);
        child = child.set('options', self.options.mergeDeep(child.options));
        child = child.set('deserialize', self.deserialize);
        return child;
      }
    }),

  '<list>': new SchemaPart({
    options: Immutable.Map({
      defaultValue: undefined,
      childType: '<any>'
    }),
    deserialize: function (serObj, self, deserializeObject) {
      if (_.isUndefined(serObj)) {
        var defaultValue = self.options.get('defaultValue');
        if (defaultValue === null || defaultValue === undefined) {
          return defaultValue;
        } else {
          serObj = defaultValue;
        }
      }
      var childType = self.options.get('childType');
      if (Immutable.List.isList(serObj)) {
        return serObj.map(function (childValue) {
          return deserializeObject(childValue, childType);
        });
      } else if (_.isFunction(serObj.toList)) {
        return serObj.toList().map(function (childValue) {
          return deserializeObject(childValue, childType);
        });
      } else {
        return new Immutable.List(_.map(serObj, function (childValue) {
          return deserializeObject(childValue, childType);
        }));
      }
    },
    extend: function (self, child) {
      if (!child.extend) child = child.set('extend', self.extend);
      child = child.set('options', self.options.mergeDeep(child.options));
      child = child.set('deserialize', self.deserialize);
      return child;
    }
  }),

  '<record>': new SchemaPart({
    options: Immutable.Map({
      recordClass: Immutable.Record(),
      defaultValue: undefined,
      fields: Immutable.Map()
    }),
    deserialize: function (serObj, self, deserializeObject) {
      throw new Error('this may not be used directly. extend');
    },
    extend: function (self, child) {
      var RecordClass;
      if (!child.extend) child = child.set('extend', self.extend);
      child = child.set('options', self.options.mergeDeep(child.options));
      child = child.set('deserialize', function (serObj, self, deserializeObject) {
        if (_.isUndefined(serObj)) {
          var defaultValue = self.options.get('defaultValue');
          if (defaultValue === null || defaultValue === undefined) {
            return defaultValue;
          } else {
            serObj = defaultValue;
          }
        }
        if (!RecordClass) {
          var recordClassConfig = {};
          self.options.get('fields').forEach(function (childType, fieldName) {

            // get the default value for the child type for each field
            recordClassConfig[fieldName] = deserializeObject(undefined, childType);
          });
          RecordClass = Immutable.Record(recordClassConfig);
        }

        var recordConfig = {};
        self.options.get('fields').forEach(function (childType, fieldName) {
          recordConfig[fieldName] = deserializeObject(serObj[fieldName], childType);
        });
        return new RecordClass(recordConfig);
      });
      return child;
    }
  }),

  '<map>': new SchemaPart({
    options: Immutable.Map({
      defaultValue: undefined,
      childType: '<any>'
    }),
    deserialize: function (serObj, self, deserializeObject) {
      if (_.isUndefined(serObj)) {
        var defaultValue = self.options.get('defaultValue');
        if (Immutable.Map.isMap(defaultValue) ||
          defaultValue === null || defaultValue === undefined) {
          return defaultValue;
        } else {
          serObj = defaultValue;
        }
      }
      if (Immutable.Map.isMap(serObj)) {
        return serObj;
      } else {
        return Immutable.Map(_.map(serObj, function (value, key) {
          return [key, deserializeObject(value, self.options.get('childType'))];
        }));
      }
    },
    extend: function (self, child) {
      if (!child.extend) child = child.set('extend', self.extend);
      child = child.set('options', self.options.mergeDeep(child.options));
      child = child.set('deserialize', self.deserialize);
      return child;
    }
  }),

  '<set>': new SchemaPart({
    options: Immutable.Map({
      defaultValue: undefined,
      childType: '<any>'
    }),
    deserialize: function (serObj, self, deserializeObject) {
      if (_.isUndefined(serObj)) {
        var defaultValue = self.options.get('defaultValue');
        if (Immutable.Set.isSet(defaultValue) ||
          defaultValue === null || defaultValue === undefined) {
          return defaultValue;
        } else {
          serObj = defaultValue;
        }
      }

      var childType = self.options.get('childType');
      if (Immutable.Set.isSet(serObj)) {
        return serObj;
      } else if (_.isFunction(serObj.toSet)) {
        return serObj.toSet().map(function (childValue) {
          deserializeObject(childValue, childType);
        });
      } else {
        return Immutable.Set(_.map(serObj, function (value) {
          return deserializeObject(value, childType);
        }));
      }
    },
    extend: function (self, child) {
      if (!child.extend) child = child.set('extend', self.extend);
      child = child.set('options', self.options.mergeDeep(child.options));
      child = child.set('deserialize', self.deserialize);
      return child;
    }
  }),

  // TODO: can ordered set extend set?
  '<ordered_set>': new SchemaPart({
    options: Immutable.Map({
      defaultValue: undefined,
      childType: '<any>'
    }),
    deserialize: function (serObj, self, deserializeObject) {
      if (_.isUndefined(serObj)) {
        var defaultValue = self.options.get('defaultValue');
        if (Immutable.OrderedSet.isOrderedSet(defaultValue) || 
          defaultValue === null || defaultValue === undefined) {
          return defaultValue;
        } else {
          serObj = defaultValue;
        }
      }
      if (Immutable.OrderedSet.isOrderedSet(serObj)) {
        return serObj;
      } else if (_.isFunction(serObj.toOrderedSet)) {
        return serObj.toOrderedSet();
      } else {
        return Immutable.OrderedSet(_.map(serObj, function (value) {
          return deserializeObject(value, self.options.get('childType'));
        }));
      }
    },
    extend: function (self, child) {
      if (!child.extend) child = child.set('extend', self.extend);
      child = child.set('options', self.options.mergeDeep(child.options));
      child = child.set('deserialize', self.deserialize);
      return child;
    }
  }),

  // use Immutable.js' fromJS() function
  '<auto>': new SchemaPart({
    options: Immutable.Map({
      defaultValue: undefined
    }),
    deserialize: function (serObj, self, deserializeObject) {
      if (_.isUndefined(serObj)) {
        var defaultValue = self.options.get('defaultValue');
        if (Immutable.Map.isMap(defaultValue) || 
          Immutable.List.isList(defaultValue) || 
          defaultValue === null || defaultValue === undefined) {
          return defaultValue;
        } else {
          serObj = defaultValue;
        }
      }

      // TODO: check that it is immutable the whole way down
      if (Immutable.Map.isMap(serObj) || 
          Immutable.List.isList(serObj)) {
        return serObj;
      } else {
        return Immutable.fromJS(serObj);
      }
    },
    extend: function (self, child) {
      if (!child.extend) child = child.set('extend', self.extend);
      child = child.set('options', self.options.mergeDeep(child.options));
      child = child.set('deserialize', self.deserialize);
      return child;
    }
  })
  })
});

function getSchemaPart (schema, key) {
  var schemaPart = schema.parts.get(key);
  if (schemaPart) {
    return schemaPart;
  } else {
    if (schema.parent) {
      return getSchemaPart(schema.parent.schema, key);
    } else {
      throw new Error('schema part not found: ' + key);
    }
  }
}

function setSchemaPart (schema, schemaPart, key) {
  if (schema.parts.has(key)) {
    return schema.set('parts', schema.parts.set(key, schemaPart));
  } else {
    if (schema.parent) {
      schema.parent.setSchemaPart(schemaPart, key);
      return schema;
    } else {
      throw new Error('schema part not found: ' + key);
    }
  }
}

function extendSchemaPart (schema, key) {
  var child = getSchemaPart(schema, key);
  schema = ensureFunctionExists(schema, 'extend', child.parent);
  var parent = getSchemaPart(schema, child.parent);
  var extendedChild = parent.extend(parent, child);
  return setSchemaPart(schema, extendedChild, key);
}

function ensureFunctionExists (schema, fnName, key) {
  var schemaPart = getSchemaPart(schema, key);
  if (!_.isFunction(schemaPart[fnName])) {
    return extendSchemaPart(schema, key);
  } else {
    return schema;
  }
}

var Factory = {
  create : function (schema) {
    var proto = this.proto;
    var propertiesObject = {
      schema: {
        value: schema,
        writable: true
      }
    };
    return Object.create(proto, propertiesObject);
  },
  proto : {

    // TODO: make it all OO or functional, not this
    setSchemaPart: function (schemaPart, key) {
      this.schema = setSchemaPart(this.schema, schemaPart, key);
    },

    // TODO: rename this fn
    applyFn: function (object, fnName, key) {
      var self = this;
      this.schema = ensureFunctionExists(this.schema, fnName, key);
      var schemaPart = getSchemaPart(this.schema, key);
      return schemaPart[fnName](object, schemaPart, function (innerObj, key) {
        return self.applyFn(innerObj, fnName, key);
      });
    },

    // TODO: depracate this in favor of applyFn
    deserializeObject: function (serObj, key) {
      var self = this;
      this.schema = ensureFunctionExists(this.schema, 'deserialize', key);
      var schemaPart = getSchemaPart(this.schema, key);
      return schemaPart.deserialize(serObj, schemaPart, function (innerObj, key) {
        return self.deserializeObject(innerObj, key);
      });
    }
  }
};

return {
  Schema: Schema,
  SchemaPart: SchemaPart,
  baseSchema: Factory.create(baseSchema),
  getFactory: function (schema) {
    return Factory.create(schema);
  }
};

});