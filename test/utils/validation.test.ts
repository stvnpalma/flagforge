import { ValidationError } from '../../src/types/errors';
import {
  optionalString,
  parseBody,
  requireBoolean,
  requireString,
  validateFlagKey,
} from '../../src/utils/validation';

describe('parseBody()', () => {
  it('throw ValidationError when body is null', () => {
    expect(() => parseBody(null)).toThrow(ValidationError);
    expect(() => parseBody(null)).toThrow('Request body is required');
  });

  it('throw ValidationError on malformed JSON ', () => {
    expect(() => parseBody('{Invalid}')).toThrow(ValidationError);
    expect(() => parseBody('{Invalid}')).toThrow('Invalid JSON body');
  });

  it('throw a ValidationError when body is not an object', () => {
    expect(() => parseBody('"just a string"')).toThrow(ValidationError);
    expect(() => parseBody('[1,2,3]')).toThrow(ValidationError);
  });

  it('returns parsed object for a JSON ', () => {
    const result = parseBody('{"name": "FlagForge"}');
    expect(result).toEqual({ name: 'FlagForge' });
  });
});

describe('requireString()', () => {
  it('returns trimmed value for a string', () => {
    expect(requireString({ name: ' FlagForge  ' }, 'name')).toBe('FlagForge');
  });

  it('throws a ValidationError when field is missing', () => {
    expect(() => requireString({}, 'name')).toThrow(ValidationError);
  });

  it('throw ValidationError when field is empty', () => {
    expect(() => requireString({ name: '' }, 'name')).toThrow(ValidationError);
  });

  it('throws a ValidationError when field is not a string', () => {
    expect(() => requireString({ name: 123 }, 'name')).toThrow(ValidationError);
  });
});

describe('optionalString()', () => {
  it('returns undefined when field is absent', () => {
    expect(optionalString({}, 'desc')).toBeUndefined();
  });

  it('returns a trimmed value when a field is present', () => {
    expect(optionalString({ desc: ' hello ' }, 'desc')).toBe('hello');
  });

  it('throws ValidationError when field is present but empty', () => {
    expect(() => optionalString({ desc: '' }, 'desc')).toThrow(ValidationError);
  });
});

describe('requireBoolean', () => {
  test('returns true when a valid boolean is provided', () => {
    expect(requireBoolean({ enabled: true }, 'enabled')).toBe(true);
  });

  const cases: [string, Record<string, unknown>, string, string][] = [
    [
      'missing field',
      {},
      'enabled',
      "'enabled' is required and must be a boolean",
    ],
    [
      'string instead of boolean',
      { enabled: 'true' },
      'enabled',
      "'enabled' is required and must be a boolean",
    ],
    [
      'number',
      { enabled: 1 },
      'enabled',
      "'enabled' is required and must be a boolean",
    ],
    [
      'null',
      { enabled: null },
      'enabled',
      "'enabled' is required and must be a boolean",
    ],
    [
      'a different field name',
      {},
      'active',
      "'active' is required and must be a boolean",
    ],
  ];

  test.each(cases)(
    'rejects %s',
    (_description, body, field, expectedMessage) => {
      expect(() => requireBoolean(body, field)).toThrow(
        new ValidationError(expectedMessage),
      );
    },
  );
});

describe('validateFlagKey()', () => {
  it('accepts lowercase, numbers, hyphens', () => {
    expect(validateFlagKey('new-checkout-flow-2')).toBe('new-checkout-flow-2');
  });

  it('rejects uppercase letters', () => {
    expect(() => validateFlagKey('New Checkout')).toThrow(ValidationError);
  });

  it('rejects spaces', () => {
    expect(() => validateFlagKey('new checkout')).toThrow(ValidationError);
  });

  it('rejects special character', () => {
    expect(() => validateFlagKey('new_checkout@flow')).toThrow(ValidationError);
  });
});
