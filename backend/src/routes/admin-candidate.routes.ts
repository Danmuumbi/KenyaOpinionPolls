import { Router } from "express";

import { prisma } from "../config/database";

import {
  requireAuth,
} from "../middleware/auth.middleware";

import {
  requireRoles,
} from "../middleware/role.middleware";

const router = Router();

router.use(requireAuth);

router.use(
  requireRoles(
    "SUPER_ADMIN",
    "ADMIN"
  )
);

/* ==========================================================================
   GET CANDIDATES
   ========================================================================== */

router.get("/", async (req, res) => {
  try {
    const {
      positionId,
      countyId,
      constituencyId,
      wardId,
    } = req.query;

    const candidates =
      await prisma.candidate.findMany({
        where: {
          isActive: true,

          ...(positionId
            ? {
                positionId:
                  String(positionId),
              }
            : {}),

          ...(countyId
            ? {
                countyId:
                  String(countyId),
              }
            : {}),

          ...(constituencyId
            ? {
                constituencyId:
                  String(
                    constituencyId
                  ),
              }
            : {}),

          ...(wardId
            ? {
                wardId:
                  String(wardId),
              }
            : {}),
        },

        include: {
          position: true,
          county: true,
          constituency: true,
          ward: true,
        },

        orderBy: {
          name: "asc",
        },
      });

    return res.json({
      success: true,
      data: candidates,
    });
  } catch (error) {
    console.error(
      "Failed to fetch candidates:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch candidates",
    });
  }
});

/* ==========================================================================
   CREATE CANDIDATE
   ========================================================================== */

router.post("/", async (req, res) => {
  try {
    const {
      name,
      party,
      photoUrl,
      description,
      positionId,
      countyId,
      constituencyId,
      wardId,
    } = req.body;

    if (
      !name ||
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Candidate name is required",
      });
    }

    if (!positionId) {
      return res.status(400).json({
        success: false,
        message:
          "Position is required",
      });
    }

    const position =
      await prisma.position.findUnique({
        where: {
          id: positionId,
        },
      });

    if (!position) {
      return res.status(400).json({
        success: false,
        message:
          "Position does not exist",
      });
    }

    /* ----------------------------------------------------------------------
       Validate county
       ---------------------------------------------------------------------- */

    if (countyId) {
      const county =
        await prisma.county.findUnique({
          where: {
            id: countyId,
          },
        });

      if (!county) {
        return res.status(400).json({
          success: false,
          message:
            "County does not exist",
        });
      }
    }

    /* ----------------------------------------------------------------------
       Validate constituency
       ---------------------------------------------------------------------- */

    if (constituencyId) {
      const constituency =
        await prisma.constituency.findUnique({
          where: {
            id: constituencyId,
          },
        });

      if (
        !constituency ||
        (countyId &&
          constituency.countyId !==
            countyId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid constituency",
        });
      }
    }

    /* ----------------------------------------------------------------------
       Validate ward
       ---------------------------------------------------------------------- */

    if (wardId) {
      const ward =
        await prisma.ward.findUnique({
          where: {
            id: wardId,
          },
        });

      if (
        !ward ||
        (constituencyId &&
          ward.constituencyId !==
            constituencyId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid ward",
        });
      }
    }

    const candidate =
      await prisma.candidate.create({
        data: {
          name: name.trim(),

          party:
            typeof party === "string"
              ? party.trim() || null
              : null,

          photoUrl:
            typeof photoUrl === "string"
              ? photoUrl.trim() || null
              : null,

          description:
            typeof description ===
            "string"
              ? description.trim() ||
                null
              : null,

          positionId,

          countyId:
            countyId || null,

          constituencyId:
            constituencyId || null,

          wardId:
            wardId || null,
        },

        include: {
          position: true,
          county: true,
          constituency: true,
          ward: true,
        },
      });

    return res.status(201).json({
      success: true,

      message:
        "Candidate created successfully",

      data: candidate,
    });
  } catch (error) {
    console.error(
      "Candidate creation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create candidate",
    });
  }
});

/* ==========================================================================
   UPDATE CANDIDATE
   ========================================================================== */

router.put(
  "/:candidateId",
  async (req, res) => {
    try {
      const candidateId =
        req.params.candidateId;

      const {
        name,
        party,
        photoUrl,
        description,
        positionId,
        countyId,
        constituencyId,
        wardId,
        isActive,
      } = req.body;

      const existing =
        await prisma.candidate.findUnique({
          where: {
            id: candidateId,
          },
        });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message:
            "Candidate not found",
        });
      }

      /* --------------------------------------------------------------------
         Validate name
         -------------------------------------------------------------------- */

      if (
        name !== undefined &&
        (
          typeof name !== "string" ||
          !name.trim()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Candidate name cannot be empty",
        });
      }

      /* --------------------------------------------------------------------
         Validate position
         -------------------------------------------------------------------- */

      if (positionId !== undefined) {
        const position =
          await prisma.position.findUnique({
            where: {
              id: positionId,
            },
          });

        if (!position) {
          return res.status(400).json({
            success: false,
            message:
              "Position does not exist",
          });
        }
      }

      /* --------------------------------------------------------------------
         Validate county
         -------------------------------------------------------------------- */

      if (countyId !== undefined) {
        if (countyId) {
          const county =
            await prisma.county.findUnique({
              where: {
                id: countyId,
              },
            });

          if (!county) {
            return res.status(400).json({
              success: false,
              message:
                "County does not exist",
            });
          }
        }
      }

      /* --------------------------------------------------------------------
         Validate constituency
         -------------------------------------------------------------------- */

      if (constituencyId !== undefined) {
        if (constituencyId) {
          const constituency =
            await prisma.constituency.findUnique({
              where: {
                id: constituencyId,
              },
            });

          if (!constituency) {
            return res.status(400).json({
              success: false,
              message:
                "Constituency does not exist",
            });
          }

          const effectiveCountyId =
            countyId !== undefined
              ? countyId
              : existing.countyId;

          if (
            effectiveCountyId &&
            constituency.countyId !==
              effectiveCountyId
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid constituency for selected county",
            });
          }
        }
      }

      /* --------------------------------------------------------------------
         Validate ward
         -------------------------------------------------------------------- */

      if (wardId !== undefined) {
        if (wardId) {
          const ward =
            await prisma.ward.findUnique({
              where: {
                id: wardId,
              },
            });

          if (!ward) {
            return res.status(400).json({
              success: false,
              message:
                "Ward does not exist",
            });
          }

          const effectiveConstituencyId =
            constituencyId !== undefined
              ? constituencyId
              : existing.constituencyId;

          if (
            effectiveConstituencyId &&
            ward.constituencyId !==
              effectiveConstituencyId
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid ward for selected constituency",
            });
          }
        }
      }

      /* --------------------------------------------------------------------
         Update candidate
         -------------------------------------------------------------------- */

      const candidate =
        await prisma.candidate.update({
          where: {
            id: candidateId,
          },

          data: {
            ...(name !== undefined && {
              name: name.trim(),
            }),

            ...(party !== undefined && {
              party:
                typeof party === "string"
                  ? party.trim() || null
                  : null,
            }),

            ...(photoUrl !== undefined && {
              photoUrl:
                typeof photoUrl === "string"
                  ? photoUrl.trim() ||
                    null
                  : null,
            }),

            ...(description !==
              undefined && {
              description:
                typeof description ===
                "string"
                  ? description.trim() ||
                    null
                  : null,
            }),

            ...(positionId !==
              undefined && {
              positionId,
            }),

            ...(countyId !== undefined && {
              countyId:
                countyId || null,
            }),

            ...(constituencyId !==
              undefined && {
              constituencyId:
                constituencyId || null,
            }),

            ...(wardId !== undefined && {
              wardId:
                wardId || null,
            }),

            ...(isActive !== undefined && {
              isActive:
                Boolean(isActive),
            }),
          },

          include: {
            position: true,
            county: true,
            constituency: true,
            ward: true,
          },
        });

      return res.json({
        success: true,

        message:
          "Candidate updated successfully",

        data: candidate,
      });
    } catch (error) {
      console.error(
        "Candidate update error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update candidate",
      });
    }
  }
);

/* ==========================================================================
   DELETE / DEACTIVATE CANDIDATE
   ========================================================================== */

router.delete(
  "/:candidateId",
  async (req, res) => {
    try {
      const candidateId =
        req.params.candidateId;

      const existing =
        await prisma.candidate.findUnique({
          where: {
            id: candidateId,
          },
        });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message:
            "Candidate not found",
        });
      }

      /*
       * IMPORTANT:
       * We do NOT physically delete the candidate.
       *
       * Existing PollOption and Response records
       * can still reference this candidate.
       *
       * We simply deactivate the candidate.
       */

      const candidate =
        await prisma.candidate.update({
          where: {
            id: candidateId,
          },

          data: {
            isActive: false,
          },

          include: {
            position: true,
            county: true,
            constituency: true,
            ward: true,
          },
        });

      return res.json({
        success: true,

        message:
          "Candidate deactivated successfully",

        data: candidate,
      });
    } catch (error) {
      console.error(
        "Candidate deletion error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete candidate",
      });
    }
  }
);

export default router;