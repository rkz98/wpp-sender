const schema = {
  body: {
    type: 'object',
    required: ['contacts', 'message'],
    properties: {
      message: { minLength: 1, type: 'string' },
      delayMs: {
        minItems: 2,
        maxItems: 2,
        type: 'array',
        default: [15000, 30000],
        items: { minimum: 0, type: 'integer' }
      },
      contacts: {
        minItems: 1,
        type: 'array',
        maxItems: 500,
        items: {
          type: 'object',
          required: ['number'],
          properties: { name: { type: 'string' }, number: { minLength: 8, type: 'string' } }
        }
      }
    }
  }
};

export default schema;
