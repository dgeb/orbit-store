import Schema from 'orbit/schema';
import KeyMap from 'orbit/key-map';
import { identity } from 'orbit/lib/identifiers';
import Cache from 'orbit-store/cache';
import SchemaConsistencyProcessor from 'orbit-store/cache/operation-processors/schema-consistency-processor';

let schema, cache, processor;

const schemaDefinition = {
  models: {
    planet: {
      attributes: {
        name: { type: 'string' },
        classification: { type: 'string' }
      },
      relationships: {
        moons: { type: 'hasMany', model: 'moon', inverse: 'planet', actsAsSet: true },
        inhabitants: { type: 'hasMany', model: 'inhabitant', inverse: 'planets' },
        next: { type: 'hasOne', model: 'planet', inverse: 'previous' },
        previous: { type: 'hasOne', model: 'planet', inverse: 'next' }
      }
    },
    moon: {
      attributes: {
        name: { type: 'string' }
      },
      relationships: {
        planet: { type: 'hasOne', model: 'planet', inverse: 'moons' }
      }
    },
    inhabitant: {
      attributes: {
        name: { type: 'string' }
      },
      relationships: {
        planets: { type: 'hasMany', model: 'planet', inverse: 'inhabitants' }
      }
    }
  }
};

module('OC - OperationProcessors - SchemaConsistencyProcessor', {
  setup() {
    let keyMap = new KeyMap();
    schema = new Schema(schemaDefinition);
    cache = new Cache({ schema, keyMap, processors: [SchemaConsistencyProcessor] });
    processor = cache._processors[0];
  },

  teardown() {
    schema = null;
    cache = null;
    processor = null;
  }
});

test('add to hasOne => hasMany', function(assert) {
  const saturn = { type: 'planet', id: 'saturn',
                   attributes: { name: 'Saturn' },
                   relationships: { moons: { data: { 'moon:titan': true } } } };

  const jupiter = { type: 'planet', id: 'jupiter',
                    attributes: { name: 'Jupiter' },
                    relationships: { moons: { data: { 'moon:europa': true } } } };

  const titan = { type: 'moon', id: 'titan',
                  attributes: { name: 'Titan' },
                  relationships: { planet: { data: 'planet:saturn' } } };

  const europa = { type: 'moon', id: 'europa',
                   attributes: { name: 'Europa' },
                   relationships: { planet: { data: 'planet:jupiter' } } };

  cache.reset({
    planet: { saturn, jupiter },
    moon: { titan, europa }
  });

  const addPlanetOp = {
    op: 'addToHasMany',
    record: { type: 'moon', id: europa.id },
    relationship: 'planet',
    relatedRecord: { type: 'planet', id: saturn.id }
  };

  assert.deepEqual(
    processor.before(addPlanetOp),
    []
  );

  assert.deepEqual(
    processor.after(addPlanetOp),
    [
      {
        op: 'addToHasMany',
        record: identity(saturn),
        relationship: 'moons',
        relatedRecord: identity(europa)
      }
    ]
  );

  assert.deepEqual(
    processor.finally(addPlanetOp),
    []
  );
});

test('replace hasOne => hasMany', function(assert) {
  const saturn = { type: 'planet', id: 'saturn',
                   attributes: { name: 'Saturn' },
                   relationships: { moons: { data: { 'moon:titan': true } } } };

  const jupiter = { type: 'planet', id: 'jupiter',
                    attributes: { name: 'Jupiter' },
                    relationships: { moons: { data: { 'moon:europa': true } } } };

  const titan = { type: 'moon', id: 'titan',
                  attributes: { name: 'Titan' },
                  relationships: { planet: { data: 'planet:saturn' } } };

  const europa = { type: 'moon', id: 'europa',
                   attributes: { name: 'Europa' },
                   relationships: { planet: { data: 'planet:jupiter' } } };

  cache.reset({
    planet: { saturn, jupiter },
    moon: { titan, europa }
  });

  const replacePlanetOp = {
    op: 'replaceHasOne',
    record: identity(europa),
    relationship: 'planet',
    relatedRecord: identity(saturn)
  };

  assert.deepEqual(
    processor.before(replacePlanetOp),
    []
  );

  assert.deepEqual(
    processor.after(replacePlanetOp),
    [
      {
        op: 'removeFromHasMany',
        record: identity(jupiter),
        relationship: 'moons',
        relatedRecord: identity(europa)
      },
      {
        op: 'addToHasMany',
        record: identity(saturn),
        relationship: 'moons',
        relatedRecord: identity(europa)
      }
    ]
  );

  assert.deepEqual(
    processor.finally(replacePlanetOp),
    [
    ]
  );
});

test('replace hasMany => hasOne with empty array', function(assert) {
  const saturn = { type: 'planet', id: 'saturn',
                   attributes: { name: 'Saturn' },
                   relationships: { moons: { data: { 'moon:titan': true } } } };

  const titan = { type: 'moon', id: 'titan',
                  attributes: { name: 'Titan' },
                  relationships: { planet: { data: 'planet:saturn' } } };

  cache.reset({
    planet: { saturn },
    moon: { titan }
  });

  const clearMoonsOp = {
    op: 'replaceHasMany',
    record: identity(saturn),
    relationship: 'moons',
    relatedRecords: []
  };

  assert.deepEqual(
    processor.before(clearMoonsOp),
    []
  );

  assert.deepEqual(
    processor.after(clearMoonsOp),
    [
      {
        op: 'replaceHasOne',
        record: identity(titan),
        relationship: 'planet',
        relatedRecord: null
      }
    ]
  );

  assert.deepEqual(
    processor.finally(clearMoonsOp),
    []
  );
});

test('replace hasMany => hasOne with populated array', function(assert) {
  const saturn = { type: 'planet', id: 'saturn',
                   attributes: { name: 'Saturn' },
                   relationships: { moons: { data: { 'moon:titan': true } } } };

  const titan = { type: 'moon', id: 'titan',
                  attributes: { name: 'Titan' },
                  relationships: { planet: { data: 'planet:saturn' } } };

  const jupiter = { type: 'planet', id: 'jupiter',
                    attributes: { name: 'Jupiter' },
                    relationships: { moons: {} } };

  cache.reset({
    planet: { saturn, jupiter },
    moon: { titan }
  });

  const replaceMoonsOp = {
    op: 'replaceHasMany',
    record: identity(jupiter),
    relationship: 'moons',
    relatedRecords: [identity(titan)]
  };

  assert.deepEqual(
    processor.before(replaceMoonsOp),
    []
  );

  assert.deepEqual(
    processor.after(replaceMoonsOp),
    [
      {
        op: 'replaceHasOne',
        record: identity(titan),
        relationship: 'planet',
        relatedRecord: identity(jupiter)
      }
    ]
  );

  assert.deepEqual(
    processor.finally(replaceMoonsOp),
    []
  );
});

test('replace hasMany => hasOne with populated array, when already populated', function(assert) {
  const saturn = { type: 'planet', id: 'saturn',
                 attributes: { name: 'Saturn' },
                 relationships: { moons: { data: { 'moon:titan': true } } } };

  const jupiter = { type: 'planet', id: 'jupiter',
                  attributes: { name: 'Jupiter' },
                  relationships: { moons: { data: { 'moon:europa': true } } } };

  const titan = { type: 'moon', id: 'titan',
                attributes: { name: 'Titan' },
                relationships: { planet: { data: 'planet:saturn' } } };

  const europa = { type: 'moon', id: 'europa',
                 attributes: { name: 'Europa' },
                 relationships: { planet: { data: 'planet:jupiter' } } };

  cache.reset({
    planet: { saturn, jupiter },
    moon: { titan, europa }
  });

  const replaceMoonsOp = {
    op: 'replaceHasMany',
    record: identity(saturn),
    relationship: 'moons',
    relatedRecords: [identity(europa)]
  };

  assert.deepEqual(
    processor.before(replaceMoonsOp),
    []
  );

  assert.deepEqual(
    processor.after(replaceMoonsOp),
    [
      {
        op: 'replaceHasOne',
        record: identity(titan),
        relationship: 'planet',
        relatedRecord: null
      },
      {
        op: 'replaceHasOne',
        record: identity(europa),
        relationship: 'planet',
        relatedRecord: identity(saturn)
      }
    ]
  );

  assert.deepEqual(
    processor.finally(replaceMoonsOp),
    []
  );
});

test('replace hasMany => hasMany, clearing records', function(assert) {
  const human = { type: 'inhabitant', id: 'human', relationships: { planets: { data: { 'planet:earth': true } } } };
  const earth = { type: 'planet', id: 'earth', relationships: { inhabitants: { data: { 'inhabitant:human': true } } } };

  cache.reset({
    inhabitant: { human },
    planet: { earth }
  });

  const clearInhabitantsOp = {
    op: 'replaceHasMany',
    record: identity(earth),
    relationship: 'inhabitants',
    relatedRecords: []
  };

  assert.deepEqual(
    processor.after(clearInhabitantsOp),
    [
      {
        op: 'removeFromHasMany',
        record: identity(human),
        relationship: 'planets',
        relatedRecord: identity(earth)
      }
    ]
  );

  assert.deepEqual(
    processor.finally(clearInhabitantsOp),
    []
  );
});

test('replace hasMany => hasMany, replacing some records', function(assert) {
  const human = { type: 'inhabitant', id: 'human', relationships: { planets: { data: { 'planet:earth': true } } } };
  const cat = { type: 'inhabitant', id: 'cat' };
  const dog = { type: 'inhabitant', id: 'dog' };
  const earth = { type: 'planet', id: 'earth', relationships: { inhabitants: { data: { 'inhabitant:human': true } } } };

  cache.reset({
    inhabitant: { human, cat, dog },
    planet: { earth }
  });

  const clearInhabitantsOp = {
    op: 'replaceHasMany',
    record: identity(earth),
    relationship: 'inhabitants',
    relatedRecords: [identity(human), identity(cat), identity(dog)]
  };

  assert.deepEqual(
    processor.after(clearInhabitantsOp),
    [
      {
        op: 'addToHasMany',
        record: identity(cat),
        relationship: 'planets',
        relatedRecord: identity(earth)
      },
      {
        op: 'addToHasMany',
        record: identity(dog),
        relationship: 'planets',
        relatedRecord: identity(earth)
      }
    ]
  );

  assert.deepEqual(
    processor.finally(clearInhabitantsOp),
    []
  );
});

test('remove hasOne => hasMany', function(assert) {
  const saturn = { type: 'planet', id: 'saturn',
                 attributes: { name: 'Saturn' },
                 relationships: { moons: { data: { 'moon:titan': true } } } };

  const jupiter = { type: 'planet', id: 'jupiter',
                  attributes: { name: 'Jupiter' },
                  relationships: { moons: { data: { 'moon:europa': true } } } };

  const titan = { type: 'moon', id: 'titan',
                attributes: { name: 'Titan' },
                relationships: { planet: { data: 'planet:saturn' } } };

  const europa = { type: 'moon', id: 'europa',
                 attributes: { name: 'Europa' },
                 relationships: { planet: { data: 'planet:jupiter' } } };

  cache.reset({
    planet: { saturn, jupiter },
    moon: { titan, europa }
  });

  const removePlanetOp = {
    op: 'replaceHasOne',
    record: identity(europa),
    relationship: 'planet',
    relatedRecord: null
  };

  assert.deepEqual(
    processor.before(removePlanetOp),
    []
  );

  assert.deepEqual(
    processor.after(removePlanetOp),
    [
      {
        op: 'removeFromHasMany',
        record: identity(jupiter),
        relationship: 'moons',
        relatedRecord: identity(europa)
      }
    ]
  );

  assert.deepEqual(
    processor.finally(removePlanetOp),
    []
  );
});

test('add to hasOne => hasOne', function(assert) {
  const saturn = { type: 'planet', id: 'saturn',
                 attributes: { name: 'Saturn' },
                 relationships: { next: { data: 'planet:jupiter' } } };

  const jupiter = { type: 'planet', id: 'jupiter',
                  attributes: { name: 'Jupiter' },
                  relationships: { previous: { data: 'planet:saturn' } } };

  const earth = { type: 'planet', id: 'earth',
                attributes: { name: 'Earth' } };

  cache.reset({
    planet: { saturn, jupiter, earth }
  });

  const changePlanetOp = {
    op: 'replaceHasOne',
    record: identity(earth),
    relationship: 'next',
    relatedRecord: identity(saturn)
  };

  assert.deepEqual(
    processor.before(changePlanetOp),
    []
  );

  assert.deepEqual(
    processor.after(changePlanetOp),
    [
      {
        op: 'replaceHasOne',
        record: identity(saturn),
        relationship: 'previous',
        relatedRecord: identity(earth)
      }
    ]
  );

  assert.deepEqual(
    processor.finally(changePlanetOp),
    []
  );
});

test('replace hasOne => hasOne with existing value', function(assert) {
  const saturn = { type: 'planet', id: 'saturn',
                 attributes: { name: 'Saturn' },
                 relationships: { next: { data: 'planet:jupiter' } } };

  const jupiter = { type: 'planet', id: 'jupiter',
                  attributes: { name: 'Jupiter' },
                  relationships: { previous: { data: 'planet:saturn' } } };

  const earth = { type: 'planet', id: 'earth',
                attributes: { name: 'Earth' } };

  cache.reset({
    planet: { saturn, jupiter, earth }
  });

  const changePlanetOp = {
    op: 'replaceHasOne',
    record: identity(earth),
    relationship: 'next',
    relatedRecord: identity(jupiter)
  };

  assert.deepEqual(
    processor.before(changePlanetOp),
    []
  );

  assert.deepEqual(
    processor.after(changePlanetOp),
    [
      {
        op: 'replaceHasOne',
        record: identity(jupiter),
        relationship: 'previous',
        relatedRecord: identity(earth)
      }
    ]
  );

  assert.deepEqual(
    processor.finally(changePlanetOp),
    []
  );
});

test('replace hasOne => hasOne with current existing value', function(assert) {
  const saturn = { type: 'planet', id: 'saturn',
                 attributes: { name: 'Saturn' },
                 relationships: { next: { data: 'planet:jupiter' } } };

  const jupiter = { type: 'planet', id: 'jupiter',
                  attributes: { name: 'Jupiter' },
                  relationships: { previous: { data: 'planet:saturn' } } };

  const earth = { type: 'planet', id: 'earth',
                attributes: { name: 'Earth' } };

  cache.reset({
    planet: { saturn, jupiter, earth }
  });

  const changePlanetOp = {
    op: 'replaceHasOne',
    record: identity(saturn),
    relationship: 'next',
    relatedRecord: identity(jupiter)
  };

  assert.deepEqual(
    processor.before(changePlanetOp),
    []
  );

  assert.deepEqual(
    processor.after(changePlanetOp),
    []
  );

  assert.deepEqual(
    processor.finally(changePlanetOp),
    []
  );
});

test('add to hasMany => hasMany', function(assert) {
  const earth = { type: 'planet', id: 'earth' };
  const human = { type: 'inhabitant', id: 'human' };

  cache.reset({
    planet: { earth },
    inhabitant: { human }
  });

  const addPlanetOp = {
    op: 'addToHasMany',
    record: identity(human),
    relationship: 'planets',
    relatedRecord: identity(earth)
  };

  assert.deepEqual(
    processor.before(addPlanetOp),
    []
  );

  assert.deepEqual(
    processor.after(addPlanetOp),
    [
      {
        op: 'addToHasMany',
        record: identity(earth),
        relationship: 'inhabitants',
        relatedRecord: identity(human)
      }
    ]
  );

  assert.deepEqual(
    processor.finally(addPlanetOp),
    []
  );
});

test('remove from hasMany => hasMany', function(assert) {
  const earth = { type: 'planet', id: 'earth', relationships: { inhabitants: { data: { 'inhabitant:human': true } } } };
  const human = { type: 'inhabitant', id: 'human', relationships: { planets: { data: { 'planet:earth': true } } } };

  cache.reset({
    planet: { earth },
    inhabitant: { human }
  });

  const removePlanetOp = {
    op: 'removeFromHasMany',
    record: identity(human),
    relationship: 'planets',
    relatedRecord: identity(earth)
  };

  assert.deepEqual(
    processor.before(removePlanetOp),
    []
  );

  assert.deepEqual(
    processor.after(removePlanetOp),
    [
      {
        op: 'removeFromHasMany',
        record: identity(earth),
        relationship: 'inhabitants',
        relatedRecord: identity(human)
      }
    ]
  );

  assert.deepEqual(
    processor.finally(removePlanetOp),
    []
  );
});

test('replaceRecord', function(assert) {
  const human = { type: 'inhabitant', id: 'human', relationships: { planets: { data: { 'planet:earth': true } } } };
  const cat = { type: 'inhabitant', id: 'cat' };
  const dog = { type: 'inhabitant', id: 'dog' };
  const moon = { type: 'moon', id: 'themoon' };
  const saturn = { type: 'planet', id: 'saturn',
                 attributes: { name: 'Saturn' },
                 relationships: { next: { data: 'planet:jupiter' } } };
  const jupiter = { type: 'planet', id: 'jupiter',
                  attributes: { name: 'Jupiter' },
                  relationships: { previous: { data: 'planet:saturn' } } };
  const earth = {
    type: 'planet', id: 'earth',
    relationships: {
      inhabitants: {
        data: {
          'inhabitant:human': true
        }
      },
      moons: {
      },
      next: {
        data: 'planet:jupiter'
      }
    }
  };
  const earth2 = {
    type: 'planet', id: 'earth',
    relationships: {
      inhabitants: {
        data: {
          'inhabitant:human': true,
          'inhabitant:cat': true,
          'inhabitant:dog': true
        }
      },
      moons: {
        data: {
          'moon:themoon': true
        }
      },
      next: {
        data: 'planet:saturn'
      }
    }
  };

  cache.reset({
    inhabitant: { human, cat, dog },
    planet: { earth, jupiter, saturn },
    moon: { moon }
  });

  const clearInhabitantsOp = {
    op: 'replaceRecord',
    record: earth2
  };

  assert.deepEqual(
    processor.after(clearInhabitantsOp),
    [
      {
        op: 'replaceHasOne',
        record: identity(moon),
        relationship: 'planet',
        relatedRecord: identity(earth)
      },
      {
        op: 'addToHasMany',
        record: identity(cat),
        relationship: 'planets',
        relatedRecord: identity(earth)
      },
      {
        op: 'addToHasMany',
        record: identity(dog),
        relationship: 'planets',
        relatedRecord: identity(earth)
      },
      {
        op: 'replaceHasOne',
        record: identity(jupiter),
        relationship: 'previous',
        relatedRecord: null
      },
      {
        op: 'replaceHasOne',
        record: identity(saturn),
        relationship: 'previous',
        relatedRecord: identity(earth)
      }
    ]
  );

  assert.deepEqual(
    processor.finally(clearInhabitantsOp),
    []
  );
});
