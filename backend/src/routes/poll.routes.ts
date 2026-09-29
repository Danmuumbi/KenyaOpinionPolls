import { Router } from "express";

import { prisma } from "../config/database";

const router = Router();

/**
 * GET /api/polls
 *
 * Returns publicly available polls.
 */
router.get("/", async (_req, res) => {
  try {
    const now = new Date();

    const polls = await prisma.poll.findMany({
      where: {
        isPublic: true,
        status: "ACTIVE",
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
        AND: [
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

        questions: {
          orderBy: {
            order: "asc",
          },

          include: {
            options: {
              where: {
                isActive: true,
              },

              orderBy: {
                order: "asc",
              },

              include: {
                candidate: true,
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      data: polls,
    });
  } catch (error) {
    console.error("Failed to fetch public polls:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch public polls",
    });
  }
});

/**
 * GET /api/polls/:pollId
 *
 * Returns a single public poll.
 */
router.get("/:pollId", async (req, res) => {
  try {
    const poll = await prisma.poll.findFirst({
      where: {
        id: req.params.pollId,
        isPublic: true,
      },

      include: {
        position: true,

        questions: {
          orderBy: {
            order: "asc",
          },

          include: {
            options: {
              where: {
                isActive: true,
              },

              orderBy: {
                order: "asc",
              },

              include: {
                candidate: true,
              },
            },
          },
        },
      },
    });

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: "Poll not found",
      });
    }

    return res.json({
      success: true,
      data: poll,
    });
  } catch (error) {
    console.error("Failed to fetch poll:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch poll",
    });
  }
});

export default router;