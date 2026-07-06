// Custom error classes for consistent API error handling

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Kimlik doğrulama gerekli.') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Bu işlem için yetkiniz yok.') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Kaynak') {
    super(`${resource} bulunamadı.`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number) {
    super('Çok fazla istek gönderdiniz. Lütfen bekleyin.', 429);
    this.retryAfter = retryAfter;
  }
}

export class InternalError extends AppError {
  constructor(message = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.') {
    super(message, 500, false);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(`${service} servisi şu anda kullanılamıyor.`, 503);
  }
}

// Type guard
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
