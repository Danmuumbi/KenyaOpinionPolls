import { Router } from "express";

import { prisma } from "../config/database";

import {
  requireAuth,
} from "../middleware/auth.middleware";

import {
  requireRoles,
} from "../middleware/role.middleware";

const router = Router();

/*
|--------------------------------------------------------------------------
| ADMIN AUTHENTICATION
|--------------------------------------------------------------------------
*/

router.use(requireAuth);

router.use(
  requireRoles(
    "SUPER_ADMIN",
    "ADMIN"
  )
);

/*
|--------------------------------------------------------------------------
| GET FEATURED POLLS
|--------------------------------------------------------------------------
|
| Returns all currently featured polls.
|
*/

router.get("/", async (_req, res) => {
  try {
    const polls =
      await prisma.poll.findMany({
        where: {
          isFeatured: true,
        },

        include: {
          position: true,
          campaign: true,

          targetCounty: true,
          targetConstituency: true,
          targetWard: true,

          _count: {
            select: {
              responses: true,
            },
          },
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
      "Failed to fetch featured polls:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch featured polls",
    });
  }
});



router.get("/available", async (_req, res) => {
  try {
    const polls = await prisma.poll.findMany({
      where: {
        status: "ACTIVE",
        isPublic: true,
        isFeatured: false,
      },

      include: {
        position: true,
        campaign: true,

        targetCounty: true,
        targetConstituency: true,
        targetWard: true,
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
    console.error(
      "Failed to fetch available polls:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch available polls",
    });
  }
});

/*
|--------------------------------------------------------------------------
| FEATURE A POLL
|--------------------------------------------------------------------------
|
| POST /api/admin/featured-polls/:pollId
|
| Marks a poll as featured.
|
*/

router.post(
  "/:pollId",
  async (req, res) => {
    try {
      const pollId =
        req.params.pollId;

      const poll =
        await prisma.poll.findUnique({
          where: {
            id: pollId,
          },
        });

      if (!poll) {
        return res.status(404).json({
          success: false,
          message: "Poll not found",
        });
      }

      /*
       * Only public polls can be featured.
       */

      if (!poll.isPublic) {
        return res.status(400).json({
          success: false,
          message:
            "Only public polls can be featured",
        });
      }

      /*
       * Only ACTIVE polls can be featured.
       */

      if (poll.status !== "ACTIVE") {
        return res.status(400).json({
          success: false,
          message:
            "Only active polls can be featured",
        });
      }

      /*
       * Prevent duplicate featuring.
       */

      if (poll.isFeatured) {
        return res.status(400).json({
          success: false,
          message:
            "Poll is already featured",
        });
      }

      /*
       * Find the next available featured order.
       */

      const lastFeatured =
        await prisma.poll.findFirst({
          where: {
            isFeatured: true,
          },

          orderBy: {
            featuredOrder: "desc",
          },

          select: {
            featuredOrder: true,
          },
        });

      const nextOrder =
        (lastFeatured?.featuredOrder ?? 0) +
        1;

      const updated =
        await prisma.poll.update({
          where: {
            id: pollId,
          },

          data: {
            isFeatured: true,
            featuredOrder: nextOrder,
          },

          include: {
            position: true,
            campaign: true,

            targetCounty: true,
            targetConstituency: true,
            targetWard: true,

            _count: {
              select: {
                responses: true,
              },
            },
          },
        });

      return res.json({
        success: true,
        message:
          "Poll added to featured polls",
        data: updated,
      });
    } catch (error) {
      console.error(
        "Failed to feature poll:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to feature poll",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| REMOVE POLL FROM FEATURED
|--------------------------------------------------------------------------
|
| DELETE /api/admin/featured-polls/:pollId
|
*/

router.delete(
  "/:pollId",
  async (req, res) => {
    try {
      const pollId =
        req.params.pollId;

      const poll =
        await prisma.poll.findUnique({
          where: {
            id: pollId,
          },
        });

      if (!poll) {
        return res.status(404).json({
          success: false,
          message: "Poll not found",
        });
      }

      if (!poll.isFeatured) {
        return res.status(400).json({
          success: false,
          message:
            "Poll is not currently featured",
        });
      }

      await prisma.poll.update({
        where: {
          id: pollId,
        },

        data: {
          isFeatured: false,
          featuredOrder: null,
        },
      });

      /*
       * Re-number remaining featured polls.
       */

      const remaining =
        await prisma.poll.findMany({
          where: {
            isFeatured: true,
          },

          orderBy: [
            {
              featuredOrder: "asc",
            },
            {
              createdAt: "asc",
            },
          ],

          select: {
            id: true,
          },
        });

      for (
        let index = 0;
        index < remaining.length;
        index++
      ) {
        await prisma.poll.update({
          where: {
            id: remaining[index].id,
          },

          data: {
            featuredOrder:
              index + 1,
          },
        });
      }

      return res.json({
        success: true,
        message:
          "Poll removed from featured polls",
      });
    } catch (error) {
      console.error(
        "Failed to remove featured poll:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to remove featured poll",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| CHANGE FEATURED ORDER
|--------------------------------------------------------------------------
|
| PUT /api/admin/featured-polls/:pollId/order
|
| Body:
| {
|   "featuredOrder": 1
| }
|
*/

router.put(
  "/:pollId/order",
  async (req, res) => {
    try {
      const pollId =
        req.params.pollId;

      const {
        featuredOrder,
      } = req.body;

      const order =
        Number(featuredOrder);

      if (
        !Number.isInteger(order) ||
        order < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Featured order must be a positive integer",
        });
      }

      const poll =
        await prisma.poll.findUnique({
          where: {
            id: pollId,
          },
        });

      if (!poll) {
        return res.status(404).json({
          success: false,
          message: "Poll not found",
        });
      }

      if (!poll.isFeatured) {
        return res.status(400).json({
          success: false,
          message:
            "Poll is not currently featured",
        });
      }

      const featuredPolls =
        await prisma.poll.findMany({
          where: {
            isFeatured: true,
          },

          orderBy: {
            featuredOrder: "asc",
          },

          select: {
            id: true,
          },
        });

      const maxOrder =
        featuredPolls.length;

      if (order > maxOrder) {
        return res.status(400).json({
          success: false,
          message:
            `Featured order cannot exceed ${maxOrder}`,
        });
      }

      /*
       * Rebuild the order safely.
       */

      const orderedIds =
        featuredPolls
          .filter(
            (item) =>
              item.id !== pollId
          )
          .map(
            (item) => item.id
          );

      orderedIds.splice(
        order - 1,
        0,
        pollId
      );

      for (
        let index = 0;
        index < orderedIds.length;
        index++
      ) {
        await prisma.poll.update({
          where: {
            id:
              orderedIds[index],
          },

          data: {
            featuredOrder:
              index + 1,
          },
        });
      }

      const updated =
        await prisma.poll.findMany({
          where: {
            isFeatured: true,
          },

          include: {
            position: true,
            campaign: true,

            _count: {
              select: {
                responses: true,
              },
            },
          },

          orderBy: {
            featuredOrder: "asc",
          },
        });

      return res.json({
        success: true,
        message:
          "Featured poll order updated",
        data: updated,
      });
    } catch (error) {
      console.error(
        "Failed to update featured poll order:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update featured poll order",
      });
    }
  }
);

export default router;