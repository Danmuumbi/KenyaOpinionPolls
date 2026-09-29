import { Router } from "express";
import bcrypt from "bcryptjs";

import { prisma } from "../config/database";
import {
  AuthenticatedRequest,
  requireAuth,
} from "../middleware/auth.middleware";
import { generateToken } from "../utils/jwt";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const admin = await prisma.adminUser.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatches = await bcrypt.compare(
      String(password),
      admin.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

router.get(
  "/me",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const admin = await prisma.adminUser.findUnique({
        where: {
          id: req.admin.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (!admin || !admin.isActive) {
        return res.status(401).json({
          success: false,
          message: "Admin account is unavailable",
        });
      }

      return res.json({
        success: true,
        data: admin,
      });
    } catch (error) {
      console.error(
        "Get current admin error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch authenticated admin",
      });
    }
  }
);

export default router;