import { Response, NextFunction } from "express";

import {
  AuthenticatedRequest,
} from "./auth.middleware";

export function requireRoles(
  ...allowedRoles: string[]
) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      !allowedRoles.includes(req.admin.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
}