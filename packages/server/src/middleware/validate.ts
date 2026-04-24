import { Request, Response, NextFunction } from 'express';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateUuidParam(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    if (value && !UUID_REGEX.test(value)) {
      res.status(400).json({ error: `Invalid ${paramName} format` });
      return;
    }
    next();
  };
}

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

export function validateStringLength(
  value: unknown,
  fieldName: string,
  maxLength: number,
  minLength: number = 0,
): string | null {
  if (typeof value !== 'string') return `${fieldName} must be a string`;
  if (value.length < minLength) return `${fieldName} must be at least ${minLength} characters`;
  if (value.length > maxLength) return `${fieldName} must be at most ${maxLength} characters`;
  return null;
}

export function validateRequiredFields(
  body: Record<string, unknown>,
  required: string[],
): string | null {
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return `${field} is required`;
    }
  }
  return null;
}

export function validateIntParam(paramName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    if (value !== undefined) {
      const num = parseInt(value, 10);
      if (isNaN(num)) {
        res.status(400).json({ error: `Invalid ${paramName}: must be a number` });
        return;
      }
    }
    next();
  };
}

export const MAX_TITLE_LENGTH = 500;
export const MAX_CONTENT_LENGTH = 1024 * 1024; // 1MB
export const MAX_TAG_LENGTH = 100;
export const MAX_NAME_LENGTH = 200;
