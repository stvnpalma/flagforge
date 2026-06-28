import { ValidationError } from '../types/errors';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function parseBody(rawBody: string | null): Record<string, unknown> {
  if (!rawBody) {
    throw new ValidationError('Request body is required');
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    throw new ValidationError('Invalid JSON body');
  }

  if (!isObject(parsed)) {
    throw new ValidationError('Request body must be a JSON object');
  }

  return parsed;
}

export function requireString(
  body: Record<string, unknown>,
  field: string,
): string {
  const value = body[field];
  if (!isNonEmptyString(value)) {
    throw new ValidationError(
      `'${field}' is required and must be a non-empty string`,
    );
  }
  return value.trim();
}

export function optionalString(
  body: Record<string, unknown>,
  field: string,
): string | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (!isNonEmptyString(value)) {
    throw new ValidationError(`'${field}' must be a non-empty string`);
  }
  return value.trim();
}

export function requireBoolean(
  body: Record<string, unknown>,
  field: string,
): boolean {
  const value = body[field];
  if (typeof value !== 'boolean') {
    throw new ValidationError(`$'{field}'is required and must be a boolean`);
  }
  return value;
}

const FLAG_KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validateFlagKey(flagKey: string): string {
  if (!FLAG_KEY_PATTERN.test(flagKey)) {
    throw new ValidationError(
      "'flagKey' must be lowercase letters, numbers, and hyphens only (e.g. 'new-checkout-flow')",
    );
  }
  return flagKey;
}
