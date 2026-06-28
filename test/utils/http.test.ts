import {
  FlagForgeError,
  NotFoundError,
  ValidationError,
} from '@src/types/errors';
import { created, errorResponse, noContent, ok } from '@src/utils/http';

describe('HTTP response helpers', () => {
  describe('ok()', () => {
    it('returns 200 with success body', () => {
      const result = ok({ id: '123' });
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: { id: '123' },
      });
    });
  });

  describe('created()', () => {
    it('returns 201 with success body', () => {
      const result = created({ id: '456' });
      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: { id: '456' },
      });
    });
  });

  describe('noContent()', () => {
    it('returns 204 with empty body', () => {
      const result = noContent();
      expect(result.statusCode).toBe(204);
      expect(result.body).toBe('');
    });
  });

  describe('errorResponse()', () => {
    it('maps NotFoundError to 404', () => {
      const result = errorResponse(new NotFoundError('Flag'));
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: 'Flag not found',
      });
    });

    it('maps ValidationError to 400', () => {
      const result = errorResponse(new ValidationError('Invalid flag key'));
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: 'Invalid flag key',
      });
    });

    it('maps unknown errors to 500', () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const result = errorResponse(new Error('boom'));

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: 'Internal server error',
      });

      consoleSpy.mockRestore();
    });

    it('maps FlagForgeError subclasses correctly', () => {
      const error = new FlagForgeError('Custom error', 409, 'CONFLICT');
      const result = errorResponse(error);
      expect(result.statusCode).toBe(409);
    });
  });
});
