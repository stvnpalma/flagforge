export type HttpStatusCode =
  | 200
  | 201
  | 204
  | 400
  | 401
  | 403
  | 404
  | 409
  | 500;

export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

export interface HttpResponse {
  readonly statusCode: HttpStatusCode;
  readonly headers: Record<string, string>;
  readonly body: string;
}
