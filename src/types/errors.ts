export class FlagForgeError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'FlagForgeError';
  }
}

export class NotFoundError extends FlagForgeError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends FlagForgeError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class ConflictError extends FlagForgeError {
  constructor(resource: string) {
    super(`${resource} already exists`, 409, 'CONFLICT');
  }
}

export class UnauthorizedError extends FlagForgeError {
  constructor() {
    super('Unauthorized', 401, 'UNAUTHORIZED');
  }
}
