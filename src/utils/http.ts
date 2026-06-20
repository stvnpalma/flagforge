import type { ApiResponse, HttpResponse, HttpStatusCode } from '../types/api';
import { FlagForgeError } from '../types/errors';

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

/**
 * A strict Type Guard to verify an unknown error matches our custom error signature.
 * This bypasses esbuild's minification prototype-stripping issue safely without using 'any'.
 */
function isFlagForgeError(error: unknown): error is FlagForgeError {
  if (error instanceof FlagForgeError) {
    return true;
  }

  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    'message' in error &&
    typeof (error as Record<string, unknown>).statusCode === 'number'
  );
}

export function ok(data: unknown): HttpResponse {
  const body: ApiResponse<unknown> = { success: true, data };
  return {
    statusCode: 200,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body),
  };
}

export function created(data: unknown): HttpResponse {
  const body: ApiResponse<unknown> = { success: true, data };
  return {
    statusCode: 201,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body),
  };
}

export function noContent(): HttpResponse {
  return {
    statusCode: 204,
    headers: DEFAULT_HEADERS,
    body: '',
  };
}

export function errorResponse(error: unknown): HttpResponse {
  if (isFlagForgeError(error)) {
    const body: ApiResponse<never> = {
      success: false,
      error: error.message,
    };
    return {
      statusCode: error.statusCode as HttpStatusCode,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(body),
    };
  }

  console.error('Unhandled error:', error);

  const body: ApiResponse<never> = {
    success: false,
    error: 'Internal server error',
  };
  return {
    statusCode: 500,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body),
  };
}
