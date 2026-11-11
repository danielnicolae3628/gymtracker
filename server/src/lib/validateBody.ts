import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

/**
 * Express middleware: parses and validates req.body against `schema`.
 * On success, replaces req.body with the parsed (typed, defaulted) value.
 * On failure, responds 400 with the validation issues.
 */
export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid payload', issues: result.error.issues });
      return;
    }
    req.body = result.data;
    next();
  };
}
