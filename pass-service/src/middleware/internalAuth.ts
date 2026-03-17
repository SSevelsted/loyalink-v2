import type { Request, Response, NextFunction } from 'express';

function getInternalSecret(): string | null {
  return process.env.PASS_SERVICE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

export function requireInternalAuth(req: Request, res: Response, next: NextFunction) {
  const expected = getInternalSecret();
  if (!expected) {
    return res.status(500).json({ error: 'Internal auth is not configured' });
  }

  const provided = req.headers['x-loyalink-internal-secret'];
  const token = Array.isArray(provided) ? provided[0] : provided;

  if (token !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
