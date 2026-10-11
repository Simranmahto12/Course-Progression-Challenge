import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role, UserPayload } from '../types/index.js';
import prisma from '../lib/prisma.js';

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'mirai_msot_progression_super_secret_jwt_key_2026';

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return;
  }
};

export const requireRoles = (roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: role '${req.user.role}' is not authorized. Required: ${roles.join(', ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Verify that the authenticated faculty owns the subject, or that user is Admin/Campus Manager.
 */
export const verifySubjectAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const user = req.user;
  const subjectId = req.params.subjectId || req.body.subjectId || req.params.id;

  if (!subjectId) {
    res.status(400).json({ error: 'Subject ID parameter is required.' });
    return;
  }

  // Admin has global access
  if (user.role === 'ADMIN') {
    next();
    return;
  }

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });

  if (!subject) {
    res.status(404).json({ error: 'Subject not found.' });
    return;
  }

  // Campus Manager can access subjects within their campus
  if (user.role === 'CAMPUS_MANAGER') {
    if (user.campusId && subject.campusId !== user.campusId) {
      res.status(403).json({ error: 'Forbidden: Access restricted to your assigned campus.' });
      return;
    }
    next();
    return;
  }

  // Faculty can only access subjects assigned to them
  if (user.role === 'FACULTY') {
    if (subject.facultyId !== user.id) {
      res.status(403).json({
        error: 'Forbidden: Faculty can only access and modify their assigned subjects.',
      });
      return;
    }
    next();
    return;
  }

  // Student is read-only and restricted to their batch
  if (user.role === 'STUDENT') {
    if (req.method !== 'GET') {
      res.status(403).json({ error: 'Forbidden: Students cannot modify academic records.' });
      return;
    }
    if (user.batchId && subject.batchId !== user.batchId) {
      res.status(403).json({ error: 'Forbidden: Students can only view their own batch subjects.' });
      return;
    }
    next();
    return;
  }

  res.status(403).json({ error: 'Access denied.' });
};
