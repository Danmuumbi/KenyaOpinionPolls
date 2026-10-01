import { Router } from "express";
import { prisma } from "../config/database";

const router = Router();

/*
|--------------------------------------------------------------------------
| GET PUBLIC FEATURED POLLS
|--------------------------------------------------------------------------
|
| Returns only featured polls that are currently active and public.
|
| GET /api/public/featured-polls
|
*/

router.get("/", async (_req, res) => {
  try {
    const now = new Date();

    const polls = await prisma.poll.findMany({
      where: {
        isFeatured: true,
        status: "ACTIVE",
        isPublic: true,

        AND: [
          {
            OR: [
              {
                startsAt: null,
              },
              {
                startsAt: {
                  lte: now,
                },
              },
            ],
          },
          {
            OR: [
              {
                endsAt: null,
              },
              {
                endsAt: {
                  gte: now,
                },
              },
            ],
          },
        ],
      },

      include: {
        position: true,
        campaign: true,

        targetCounty: true,
        targetConstituency: true,
        targetWard: true,
      },

      orderBy: [
        {
          featuredOrder: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return res.json({
      success: true,
      data: polls,
    });
  } catch (error) {
    console.error(
      "Failed to fetch public featured polls:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch featured polls",
    });
  }
});

export default router;