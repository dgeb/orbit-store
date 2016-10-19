import { isArray, merge } from 'orbit/lib/objects';
import { every, some } from 'orbit/lib/arrays';
import { QueryExpressionParseError, RecordNotFoundException } from 'orbit/lib/exceptions';

const EMPTY = () => {};

export default {
  and(context, ...expressions) {
    return every(expressions, (exp) => this.evaluate(exp, context));
  },

  or(context, ...expressions) {
    return some(expressions, (exp) => this.evaluate(exp, context));
  },

  equal(context, ...expressions) {
    let value = EMPTY;

    return every(expressions, (expression) => {
      if (value === EMPTY) {
        value = this.evaluate(expression, context);
        return true;
      }

      return value === this.evaluate(expression, context);
    });
  },

  filter(context, select, where) {
    let values = this.evaluate(select, context);
    let basePath = context.basePath;
    let eachContext;
    let matches = {};

    Object.keys(values).forEach(value => {
      eachContext = merge(context, {
        basePath: basePath.concat(value)
      });

      if (this.evaluate(where, eachContext)) {
        matches[value] = values[value];
      }
    });

    return matches;
  },

  sort(context, select, sortExpressions) {
    const values = this.evaluate(select, context);
    const keys = Object.keys(values);
    const basePath = context.basePath;

    const comparisonValues = keys.reduce((obj, key) => {
      obj[key] = sortExpressions.map(sortExpression => this.evaluate(
        sortExpression.field,
        merge(context, { basePath: basePath.concat(key) })
      ));
      return obj;
    }, {});

    const comparisonOrders = sortExpressions.map(
      sortExpression => sortExpression.order === 'descending' ? -1 : 1);

    keys.sort((key1, key2) => {
      const values1 = comparisonValues[key1];
      const values2 = comparisonValues[key2];
      for (let i = 0; i < sortExpressions.length; i++) {
        if (values1[i] < values2[i]) {
          return -comparisonOrders[i];
        }
        if (values1[i] > values2[i]) {
          return comparisonOrders[i];
        }
      }
      return 0;
    });

    return keys.map(key => values[key]);
  },

  page(context, select, options) {
    const records = this.evaluate(select, context);

    if (!isArray(records)) {
      throw new QueryExpressionParseError('Query results cannot be paginated without specifying a sort order.');
    }

    const begin = options.offset || 0;
    const end = options.limit !== undefined ? begin + options.limit : undefined;
    return records.slice(begin, end);
  },

  record(context, { type, id }) {
    const cache = this.target;
    const record = cache.get([type, id]);

    if (!record) {
      throw new RecordNotFoundException(type, id);
    }

    return record;
  },

  records(context, type) {
    const cache = this.target;
    const records = cache.get([type]);

    context.basePath = [type];

    return records || [];
  },

  relatedRecords(context, record, relationship) {
    const cache = this.target;
    const data = cache.get([record.type, record.id, 'relationships', relationship, 'data']);
    const results = {};

    Object.keys(data || {}).forEach(identifier => {
      const [type, id] = identifier.split(':');
      results[id] = cache.get([type, id]);
    });

    return results;
  },

  relatedRecord(context, record, relationship) {
    const cache = this.target;
    const data = cache.get([record.type, record.id, 'relationships', relationship, 'data']);

    if (!data) { return null; }

    const [relatedType, relatedRecordId] = data.split(':');
    return cache.get([relatedType, relatedRecordId]);
  },

  attribute(context, name) {
    const path = (context.basePath || []).concat(['attributes', name]);
    return this.target.get(path);
  }
};
