import { Router } from "express";
import { prisma } from "../config/database";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const positions = await prisma.position.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.json({
      success: true,
      data: positions,
    });
  } catch (error) {
    console.error("Failed to fetch positions:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch positions",
    });
  }
});

export default router;