import { Router } from "express";
import { prisma } from "../config/database";

const router = Router();

router.get("/counties", async (_req, res) => {
  try {
    const counties = await prisma.county.findMany({
      orderBy: {
        code: "asc",
      },
    });

    res.json({
      success: true,
      data: counties,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch counties",
    });
  }
});

router.get("/counties/:countyId/constituencies", async (req, res) => {
  try {
    const constituencies = await prisma.constituency.findMany({
      where: {
        countyId: req.params.countyId,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      success: true,
      data: constituencies,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch constituencies",
    });
  }
});

router.get(
  "/constituencies/:constituencyId/wards",
  async (req, res) => {
    try {
      const wards = await prisma.ward.findMany({
        where: {
          constituencyId: req.params.constituencyId,
        },
        orderBy: {
          name: "asc",
        },
      });

      res.json({
        success: true,
        data: wards,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch wards",
      });
    }
  }
);

export default router;