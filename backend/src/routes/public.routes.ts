import { Router } from "express";
import { createHash, randomBytes } from "crypto";

import { prisma } from "../config/database";

const router = Router();

const PARTICIPANT_COOKIE = "participant_token";

/**
 * ============================================================================
 * HELPERS
 * ============================================================================
 */

/**
 * Hash a value before storing it.
 *
 * The raw participant token, IP address,
 * and user-agent are never stored directly.
 */
function hashValue(value: string): string {
  const secret =
    process.env.PARTICIPANT_HASH_SECRET ||
    process.env.JWT_SECRET ||
    "";

  return createHash("sha256")
    .update(`${secret}:${value}`)
    .digest("hex");
}

/**
 * Read a cookie manually.
 */
function getCookie(
  req: {
    headers: {
      cookie?: string;
    };
  },
  name: string
): string | null {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookies =
    cookieHeader.split(";");

  for (const cookie of cookies) {
    const [
      key,
      ...valueParts
    ] = cookie
      .trim()
      .split("=");

    if (key === name) {
      return decodeURIComponent(
        valueParts.join("=")
      );
    }
  }

  return null;
}

/**
 * Create the anonymous participant cookie.
 * 
 * 
 */
function setParticipantCookie(
  res: {
    setHeader: (
      name: string,
      value: string
    ) => void;
  },
  token: string
): void {
  const isProduction =
    process.env.NODE_ENV === "production";

  const cookieParts = [
    `${PARTICIPANT_COOKIE}=${encodeURIComponent(
      token
    )}`,
    "HttpOnly",
    "Path=/",
    "Max-Age=31536000",
  ];

  if (isProduction) {
    cookieParts.push("SameSite=None");
    cookieParts.push("Secure");
  } else {
    cookieParts.push("SameSite=Lax");
  }

  res.setHeader(
    "Set-Cookie",
    cookieParts.join("; ")
  );
}

/**
 * Get an existing anonymous participant token
 * or create one for the browser.
 */
function getOrCreateParticipantToken(
  req: {
    headers: {
      cookie?: string;
    };
  },
  res: {
    setHeader: (
      name: string,
      value: string
    ) => void;
  }
): string {
  const existingToken =
    getCookie(
      req,
      PARTICIPANT_COOKIE
    );

  if (existingToken) {
    return existingToken;
  }

  const token =
    randomBytes(32).toString("hex");

  setParticipantCookie(
    res,
    token
  );

  return token;
}

/**
 * Get client IP for abuse/security logging.
 *
 * The raw IP is never stored.
 */
function getClientIp(req: {
  ip?: string;
}): string {
  return req.ip || "unknown";
}

/**
 * ============================================================================
 * ACTIVE POLL FILTER
 * ============================================================================
 *
 * A poll is publicly available when:
 *
 * - status = ACTIVE
 * - isPublic = true
 * - startsAt is empty OR has already started
 * - endsAt is empty OR has not ended
 */
function activePollWhere() {
  const now = new Date();

  return {
    status: "ACTIVE" as const,

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
  };
}

/**
 * ============================================================================
 * GEOGRAPHIC FILTER
 * ============================================================================
 *
 * Location hierarchy:
 *
 * NATIONAL
 *     ↓
 * COUNTY
 *     ↓
 * CONSTITUENCY
 *     ↓
 * WARD
 *
 * A participant in a ward should therefore be able to see:
 *
 * - National polls
 * - Their county polls
 * - Their constituency polls
 * - Their ward polls
 *
 * A participant who has selected only a county should see:
 *
 * - National polls
 * - That county's polls
 */
function buildGeographicFilter(filters: {
  countyId?: string;
  constituencyId?: string;
  wardId?: string;
}) {
  const {
    countyId,
    constituencyId,
    wardId,
  } = filters;

  /**
   * No location selected.
   *
   * Do not restrict the query.
   */
  if (
    !countyId &&
    !constituencyId &&
    !wardId
  ) {
    return {};
  }

  const OR: Record<
    string,
    unknown
  >[] = [];

  /**
   * --------------------------------------------------------------
   * NATIONAL POLLS
   *
   * No geographic target.
   * --------------------------------------------------------------
   */
  OR.push({
    targetCountyId: null,
    targetConstituencyId: null,
    targetWardId: null,
  });

  /**
   * --------------------------------------------------------------
   * COUNTY POLLS
   * --------------------------------------------------------------
   */
  if (countyId) {
    OR.push({
      targetCountyId: countyId,
      targetConstituencyId: null,
      targetWardId: null,
    });
  }

  /**
   * --------------------------------------------------------------
   * CONSTITUENCY POLLS
   * --------------------------------------------------------------
   */
  if (constituencyId) {
    OR.push({
      targetConstituencyId:
        constituencyId,
      targetWardId: null,
    });
  }

  /**
   * --------------------------------------------------------------
   * WARD POLLS
   * --------------------------------------------------------------
   */
  if (wardId) {
    OR.push({
      targetWardId: wardId,
    });
  }

  return {
    OR,
  };
}

/**
 * ============================================================================
 * PUBLIC HOME
 * ============================================================================
 *
 * GET /api/public/home
 *
 * Returns:
 * - Active positions
 * - Active candidates for each position
 * - Active general/public polls
 *
 * Candidates are only exposed when:
 * - candidate is active
 * - candidate belongs to the position
 * - candidate is attached to at least one active public poll
 */
router.get(
  "/home",
  async (_req, res) => {
    try {
      const activePollFilter =
        activePollWhere();

      /**
       * Get active positions.
       *
       * We also load active candidates that
       * are being used by at least one active
       * public poll.
       */
      const positions =
        await prisma.position.findMany({
          where: {
            isActive: true,
          },

          orderBy: {
            name: "asc",
          },

          include: {
            candidates: {
              where: {
                isActive: true,

                /**
                 * Only show candidates that are
                 * actually attached to an active
                 * public poll.
                 */
                pollOptions: {
                  some: {
                    question: {
                      poll: {
                        ...activePollFilter,

                        positionId: {
                          not: null,
                        },
                      },
                    },
                  },
                },
              },

              orderBy: {
                name: "asc",
              },

              select: {
                id: true,
                name: true,
                party: true,
                photoUrl: true,
                description: true,

                countyId: true,
                constituencyId: true,
                wardId: true,

                county: {
                  select: {
                    id: true,
                    name: true,
                  },
                },

                constituency: {
                  select: {
                    id: true,
                    name: true,
                  },
                },

                ward: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },

            _count: {
              select: {
                polls: {
                  where:
                    activePollFilter,
                },
              },
            },
          },
        });

const generalPolls =
  await prisma.poll.findMany({
    where: {
      positionId: null,

      OR: [
        {
          type: "GENERAL",
        },
        {
          type: "PUBLIC_SERVICE",
        },
        {
          type: "RESEARCH",
        },
      ],
    },

    include: {
      position: true,

      targetCounty: true,
      targetConstituency: true,
      targetWard: true,

      questions: {
        select: {
          id: true,
          question: true,
          order: true,
        },

        orderBy: {
          order: "asc",
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
      /**
       * Format positions for the frontend.
       */
      const formattedPositions =
        positions.map(
          (position) => ({
            id: position.id,

            name: position.name,

            scope: position.scope,

            description:
              position.description,

            isActive:
              position.isActive,

            pollCount:
              position._count.polls,

            candidates:
              position.candidates.map(
                (candidate) => ({
                  id: candidate.id,

                  name: candidate.name,

                  party:
                    candidate.party,

                  photoUrl:
                    candidate.photoUrl,

                  description:
                    candidate.description,

                  county:
                    candidate.county
                      ? {
                          id:
                            candidate
                              .county
                              .id,

                          name:
                            candidate
                              .county
                              .name,
                        }
                      : null,

                  constituency:
                    candidate
                      .constituency
                      ? {
                          id:
                            candidate
                              .constituency
                              .id,

                          name:
                            candidate
                              .constituency
                              .name,
                        }
                      : null,

                  ward:
                    candidate.ward
                      ? {
                          id:
                            candidate
                              .ward
                              .id,

                          name:
                            candidate
                              .ward
                              .name,
                        }
                      : null,
                })
              ),
          })
        );

      return res.json({
        success: true,

        data: {
          positions:
            formattedPositions,

          generalPolls,
        },
      });
    } catch (error) {
      console.error(
        "Failed to fetch public home:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load public home",
      });
    }
  }
);

/**
 * ============================================================================
 * PUBLIC POSITIONS
 * ============================================================================
 *
 * GET /api/public/positions
 */
router.get(
  "/positions",
  async (_req, res) => {
    try {
      const activePollFilter =
        activePollWhere();

      const positions =
        await prisma.position.findMany({
          where: {
            isActive: true,
          },

          orderBy: {
            name: "asc",
          },

          include: {
            _count: {
              select: {
                polls: {
                  where:
                    activePollFilter,
                },
              },
            },
          },
        });

      const data =
        positions.map(
          (position) => ({
            id: position.id,

            name: position.name,

            scope: position.scope,

            description:
              position.description,

            isActive:
              position.isActive,

            pollCount:
              position._count.polls,
          })
        );

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(
        "Failed to fetch public positions:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch public positions",
      });
    }
  }
);

/**
 * ============================================================================
 * PUBLIC POSITION POLLS
 * ============================================================================
 *
 * GET /api/public/positions/:positionId/polls
 *
 * Optional:
 * ?countyId=
 * ?constituencyId=
 * ?wardId=
 */
router.get(
  "/positions/:positionId/polls",
  async (req, res) => {
    try {
      const {
        positionId,
      } = req.params;

      const {
        countyId,
        constituencyId,
        wardId,
      } = req.query;

      /**
       * Make sure the position exists
       * and is publicly active.
       */
      const position =
        await prisma.position.findFirst({
          where: {
            id: positionId,
            isActive: true,
          },
        });

      if (!position) {
        return res.status(404).json({
          success: false,
          message:
            "Position not found",
        });
      }

      const geographicFilter =
        buildGeographicFilter({
          countyId:
            typeof countyId ===
            "string"
              ? countyId
              : undefined,

          constituencyId:
            typeof constituencyId ===
            "string"
              ? constituencyId
              : undefined,

          wardId:
            typeof wardId ===
            "string"
              ? wardId
              : undefined,
        });

      const polls =
        await prisma.poll.findMany({
          where: {
            ...activePollWhere(),

            positionId,

            ...geographicFilter,
          },

          include: {
            position: true,

            targetCounty: true,
            targetConstituency: true,
            targetWard: true,

            questions: {
              select: {
                id: true,
                question: true,
                order: true,
              },

              orderBy: {
                order: "asc",
              },
            },

            _count: {
              select: {
                responses: true,
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
      console.error(
        "Failed to fetch public position polls:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch position polls",
      });
    }
  }
);

/**
 * ============================================================================
 * PUBLIC POLLS
 * ============================================================================
 *
 * GET /api/public/polls
 *
 * Optional:
 * ?countyId=
 * ?constituencyId=
 * ?wardId=
 */
router.get(
  "/polls",
  async (req, res) => {
    try {
      const {
        countyId,
        constituencyId,
        wardId,
      } = req.query;

      const geographicFilter =
        buildGeographicFilter({
          countyId:
            typeof countyId ===
            "string"
              ? countyId
              : undefined,

          constituencyId:
            typeof constituencyId ===
            "string"
              ? constituencyId
              : undefined,

          wardId:
            typeof wardId ===
            "string"
              ? wardId
              : undefined,
        });

      const polls =
        await prisma.poll.findMany({
          where: {
            ...activePollWhere(),

            ...geographicFilter,
          },

          include: {
            position: true,

            targetCounty: true,
            targetConstituency: true,
            targetWard: true,

            questions: {
              select: {
                id: true,
                question: true,
                order: true,
              },

              orderBy: {
                order: "asc",
              },
            },

            _count: {
              select: {
                responses: true,
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
      console.error(
        "Failed to fetch public polls:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch public polls",
      });
    }
  }
);


router.post(
  "/polls/:pollId/other-candidate",
  async (req, res) => {
    try {
      const { pollId } = req.params;

      const name =
        typeof req.body?.name === "string"
          ? req.body.name.trim()
          : "";

      if (!name) {
        return res.status(400).json({
          message: "Candidate name is required.",
        });
      }

      if (name.length < 2) {
        return res.status(400).json({
          message:
            "Candidate name must contain at least 2 characters.",
        });
      }

      if (name.length > 150) {
        return res.status(400).json({
          message:
            "Candidate name must not exceed 150 characters.",
        });
      }

      console.log("[PUBLIC POLL DEBUG]", {
  pollId: req.params.pollId,
  now: new Date().toISOString(),
});

const rawPoll =
  await prisma.poll.findUnique({
    where: {
      id: req.params.pollId,
    },
    select: {
      id: true,
      title: true,
      status: true,
      isPublic: true,
      startsAt: true,
      endsAt: true,
      positionId: true,
      type: true,
    },
  });

console.log("[PUBLIC POLL RAW]", rawPoll);




const poll =
  await prisma.poll.findFirst({
        where: {
          id: pollId,
          ...activePollWhere(),
        },
        include: {
          position: true,
          questions: {
            where: {
              isRequired: true,
            },
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
              },
            },
          },
        },
      });

      if (!poll) {
        return res.status(404).json({
          message: "Poll not found or is not currently active.",
        });
      }

      if (!poll.positionId || !poll.position) {
        return res.status(400).json({
          message:
            "This poll is not associated with a political position.",
        });
      }

      if (poll.questions.length === 0) {
        return res.status(400).json({
          message:
            "This poll does not have a question that can accept a candidate.",
        });
      }

      /*
       * For now, attach the candidate to the first question.
       *
       * This matches the normal political poll structure where
       * candidates are the options for the main question.
       */
      const question = poll.questions[0];

      /*
       * Avoid creating the same candidate repeatedly.
       *
       * We first look for an existing candidate with the same
       * name and position.
       */
      const existingCandidate =
        await prisma.candidate.findFirst({
          where: {
            positionId: poll.positionId,
            name: {
              equals: name,
              mode: "insensitive",
            },
            isActive: true,
          },
        });

      if (existingCandidate) {
        const existingOption =
          await prisma.pollOption.findFirst({
            where: {
              questionId: question.id,
              candidateId: existingCandidate.id,
              isActive: true,
            },
          });

        if (existingOption) {
          return res.json({
            candidate: existingCandidate,
            option: existingOption,
            existing: true,
          });
        }

        const option =
          await prisma.pollOption.create({
            data: {
              questionId: question.id,
              label: existingCandidate.name,
              candidateId: existingCandidate.id,
              order:
                question.options.length,
              isActive: true,
            },
          });

        return res.status(201).json({
          candidate: existingCandidate,
          option,
          existing: true,
        });
      }

      /*
       * Candidate location follows the poll's target location.
       */
      const candidate =
        await prisma.candidate.create({
          data: {
            name,
            positionId: poll.positionId,
            countyId: poll.targetCountyId ?? null,
            constituencyId:
              poll.targetConstituencyId ?? null,
            wardId: poll.targetWardId ?? null,
            isActive: true,
          },
        });

      const option =
        await prisma.pollOption.create({
          data: {
            questionId: question.id,
            label: candidate.name,
            candidateId: candidate.id,
            order: question.options.length,
            isActive: true,
          },
        });

      return res.status(201).json({
        candidate,
        option,
        existing: false,
      });
    } catch (error) {
      console.error(
        "Failed to create other candidate:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to add candidate. Please try again.",
      });
    }
  }
);

/**
 * ============================================================================
 * PUBLIC POLL DETAILS
 * ============================================================================
 *
 * GET /api/public/polls/:pollId
 */
router.get("/polls/:pollId", async (req, res) => {
  console.log("🔥 PUBLIC POLL ROUTE HIT:", req.params.pollId);

  const debugPoll = await prisma.poll.findUnique({
  where: {
    id: req.params.pollId,
  },
  select: {
    id: true,
    title: true,
    status: true,
    isPublic: true,
    startsAt: true,
    endsAt: true,
    positionId: true,
    type: true,
  },
});

console.log("🔥 PUBLIC POLL DATABASE VALUES:", debugPoll);
console.log("🔥 CURRENT SERVER TIME:", new Date().toISOString());

  try {
      const now = new Date();

      const poll =
        await prisma.poll.findFirst({
          where: {
            id: req.params.pollId,

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

            targetCounty: true,
            targetConstituency: true,
            targetWard: true,

            questions: {
              include: {
                options: {
                  where: {
                    isActive: true,
                  },

                  include: {
                    candidate: true,
                  },

                  orderBy: {
                    order: "asc",
                  },
                },
              },

              orderBy: {
                order: "asc",
              },
            },
          },
        });

      if (!poll) {
        return res.status(404).json({
          success: false,
          message:
            "Poll not found or is not currently active",
        });
      }

      return res.json({
        success: true,
        data: poll,
      });
    } catch (error) {
      console.error(
        "Failed to fetch public poll:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch poll",
      });
    }
  }
);

/**
 * ============================================================================
 * QUICK VOTE
 * ============================================================================
 *
 * GET /api/public/quick-vote
 *
 * Optional:
 *
 * ?countyId=
 * ?constituencyId=
 * ?wardId=
 *
 * IMPORTANT:
 *
 * We deliberately DO NOT require:
 *
 *     type: "POLITICAL"
 *
 * here.
 *
 * A position-based poll is identified by:
 *
 *     positionId != null
 *
 * Your Prisma Poll model defaults `type` to GENERAL.
 * Therefore a valid Governor/MP/MCA/etc. poll can still have
 * type = GENERAL if the admin did not explicitly change it.
 *
 * Quick Vote must therefore rely on positionId rather than
 * the PollType value.
 */
router.get(
  "/quick-vote",
  async (req, res) => {
    try {
      const {
        countyId,
        constituencyId,
        wardId,
      } = req.query;

      const filters = {
        countyId:
          typeof countyId ===
          "string"
            ? countyId
            : undefined,

        constituencyId:
          typeof constituencyId ===
          "string"
            ? constituencyId
            : undefined,

        wardId:
          typeof wardId ===
          "string"
            ? wardId
            : undefined,
      };

      /**
       * Build the geographic visibility
       * filter.
       */
      const geographicFilter =
        buildGeographicFilter(
          filters
        );

      /**
       * ------------------------------------------------------------
       * FETCH ACTIVE POSITION POLLS
       * ------------------------------------------------------------
       *
       * We only require positionId to exist.
       *
       * We intentionally DO NOT use:
       *
       *     type: "POLITICAL"
       *
       * because the existing database may contain valid
       * position polls whose type is GENERAL.
       */
      const polls =
        await prisma.poll.findMany({
          where: {
            ...activePollWhere(),

            positionId: {
              not: null,
            },

            ...geographicFilter,
          },

          include: {
            position: true,

            targetCounty: true,
            targetConstituency: true,
            targetWard: true,

            questions: {
              where: {
                isRequired: true,
              },

              include: {
                options: {
                  where: {
                    isActive: true,
                  },

                  include: {
                    candidate: true,
                  },

                  orderBy: {
                    order: "asc",
                  },
                },
              },

              orderBy: {
                order: "asc",
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        });

      /**
       * ------------------------------------------------------------
       * CONVERT POLLS INTO QUICK-VOTE FORMAT
       * ------------------------------------------------------------
       *
       * Quick Vote expects:
       * function setParticipantCookie(
       * Poll
       *   └── Position
       *        └── One required question
       *             └── Candidate options
       */
      const compatiblePolls =
        polls.filter((poll) => {
          /**
           * A position must exist.
           */
          if (!poll.position) {
            return false;
          }

          /**
           * Quick Vote uses one question.
           */
          if (
            poll.questions.length !== 1
          ) {
            return false;
          }

          const question =
            poll.questions[0];

          if (!question) {
            return false;
          }

          /**
           * There must be at least one
           * active option.
           */
          if (
            question.options.length === 0
          ) {
            return false;
          }

          return true;
        });

      /**
       * ------------------------------------------------------------
       * REMOVE DUPLICATE POSITIONS
       * ------------------------------------------------------------
       *
       * If the database has multiple active polls for
       * the same position, the newest poll wins because
       * the query is ordered by createdAt DESC.
       *
       * This prevents the homepage from displaying:
       *
       * Governor
       * Governor
       * Governor
       *
       * as separate Quick Vote buttons.
       */
      const positionMap =
        new Map<
          string,
          (typeof compatiblePolls)[number]
        >();

      for (
        const poll of compatiblePolls
      ) {
        if (
          !poll.position
        ) {
          continue;
        }

        if (
          !positionMap.has(
            poll.position.id
          )
        ) {
          positionMap.set(
            poll.position.id,
            poll
          );
        }
      }

      const quickVotes =
        Array.from(
          positionMap.values()
        ).map((poll) => {
          const question =
            poll.questions[0];

          return {
            position: {
              id:
                poll.position!.id,

              name:
                poll.position!.name,

              scope:
                poll.position!.scope,

              description:
                poll.position!
                  .description,
            },

            poll: {
              id:
                poll.id,

              title:
                poll.title,

              description:
                poll.description,

              allowResults:
                poll.allowResults,

              startsAt:
                poll.startsAt,

              endsAt:
                poll.endsAt,
            },

            question: {
              id:
                question.id,

              question:
                question.question,
            },

            candidates:
              question.options.map(
                (option) => ({
                  optionId:
                    option.id,

                  candidateId:
                    option.candidateId,

                  name:
                    option.candidate
                      ?.name ||
                    option.label,

                  party:
                    option.candidate
                      ?.party ||
                    null,

                  photoUrl:
                    option.candidate
                      ?.photoUrl ||
                    null,
                })
              ),
          };
        });

      /**
       * ------------------------------------------------------------
       * DEBUG LOG
       * ------------------------------------------------------------
       *
       * This is extremely useful while testing.
       *
       * Example:
       *
       * [QUICK VOTE]
       * county=abc
       * constituency=none
       * ward=none
       * polls=2
       * compatible=1
       * quickVotes=1
       */
      console.log(
        "[QUICK VOTE]",
        {
          countyId:
            filters.countyId ||
            "none",

          constituencyId:
            filters.constituencyId ||
            "none",

          wardId:
            filters.wardId ||
            "none",

          pollsFound:
            polls.length,

          compatiblePolls:
            compatiblePolls.length,

          quickVotes:
            quickVotes.length,
        }
      );

      return res.json({
        success: true,
        data: quickVotes,
      });
    } catch (error) {
      console.error(
        "Failed to fetch quick vote data:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load quick voting options",
      });
    }
  }
);

/**
 * ============================================================================
 * SUBMIT POLL RESPONSES
 * ============================================================================
 *
 * POST /api/public/polls/:pollId/responses
 *
 * Submit anonymous responses.
 */
router.post(
  "/polls/:pollId/responses",
  async (req, res) => {
    try {
      const pollId =
        req.params.pollId;

      const {
        countyId,
        constituencyId,
        wardId,
        answers,
      } = req.body;

      /**
       * Basic answer validation.
       */
      if (
        !Array.isArray(answers) ||
        answers.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "At least one answer is required",
        });
      }

      /**
       * Find active poll.
       */
      const now = new Date();

      const poll =
        await prisma.poll.findFirst({
          where: {
            id: pollId,

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

            questions: {
              include: {
                options: {
                  where: {
                    isActive: true,
                  },
                },
              },
            },
          },
        });

      if (!poll) {
        return res.status(404).json({
          success: false,
          message:
            "Poll is not currently active",
        });
      }

      /**
       * Validate county.
       */
      if (countyId) {
        const county =
          await prisma.county.findUnique(
            {
              where: {
                id: countyId,
              },
            }
          );

        if (!county) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid county",
          });
        }
      }

      /**
       * Validate constituency and
       * its county.
       */
      if (constituencyId) {
        const constituency =
          await prisma.constituency.findUnique(
            {
              where: {
                id: constituencyId,
              },
            }
          );

        if (!constituency) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid constituency",
          });
        }

        if (
          countyId &&
          constituency.countyId !==
            countyId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Constituency does not belong to the selected county",
          });
        }
      }

      /**
       * Validate ward and its constituency.
       */
      if (wardId) {
        const ward =
          await prisma.ward.findUnique(
            {
              where: {
                id: wardId,
              },
            }
          );

        if (!ward) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid ward",
          });
        }

        if (
          constituencyId &&
          ward.constituencyId !==
            constituencyId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Ward does not belong to the selected constituency",
          });
        }
      }

      /**
       * Validate required geographic level
       * according to the position.
       */
      if (poll.position) {
        if (
          poll.position.scope ===
            "COUNTY" &&
          !countyId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "County selection is required",
          });
        }

        if (
          poll.position.scope ===
            "CONSTITUENCY" &&
          !constituencyId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Constituency selection is required",
          });
        }

        if (
          poll.position.scope ===
            "WARD" &&
          !wardId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Ward selection is required",
          });
        }
      }

      /**
       * Validate that selected location
       * actually matches the poll target.
       */
      if (
        poll.targetCountyId &&
        poll.targetCountyId !==
          countyId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Selected county does not match this poll",
        });
      }

      if (
        poll.targetConstituencyId &&
        poll.targetConstituencyId !==
          constituencyId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Selected constituency does not match this poll",
        });
      }

      if (
        poll.targetWardId &&
        poll.targetWardId !== wardId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Selected ward does not match this poll",
        });
      }

      /**
       * Create a lookup map of poll questions.
       */
      const questionMap =
        new Map(
          poll.questions.map(
            (question) => [
              question.id,
              question,
            ]
          )
        );

      const submittedQuestionIds =
        new Set<string>();

      /**
       * Validate every submitted answer.
       */
      for (
        const answer of answers
      ) {
        if (
          !answer ||
          !answer.questionId ||
          !answer.optionId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Each answer must contain questionId and optionId",
          });
        }

        /**
         * Prevent duplicate answers
         * for the same question.
         */
        if (
          submittedQuestionIds.has(
            answer.questionId
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "A question cannot be answered more than once",
          });
        }

        submittedQuestionIds.add(
          answer.questionId
        );

        const question =
          questionMap.get(
            answer.questionId
          );

        if (!question) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid question",
          });
        }

        /**
         * Ensure selected option belongs
         * to the selected question.
         */
        const optionExists =
          question.options.some(
            (option) =>
              option.id ===
              answer.optionId
          );

        if (!optionExists) {
          return res.status(400).json({
            success: false,
            message:
              "Selected option does not belong to the question",
          });
        }
      }

      /**
       * Make sure every required question
       * has been answered.
       */
      for (
        const question of
          poll.questions
      ) {
        if (
          question.isRequired &&
          !submittedQuestionIds.has(
            question.id
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Please answer all required questions",
          });
        }
      }

      /**
       * Anonymous participant identity.
       *
       * The browser receives a random token.
       * Only its hash is stored in PostgreSQL.
       */
      const participantToken =
        getOrCreateParticipantToken(
          req,
          res
        );

      const tokenHash =
        hashValue(
          participantToken
        );

      const participant =
        await prisma.participant.upsert(
          {
            where: {
              tokenHash,
            },

            create: {
              tokenHash,
            },

            update: {
              lastSeenAt:
                new Date(),
            },
          }
        );

      /**
       * Check whether this participant
       * already submitted this poll.
       */
      const existingResponse =
        await prisma.response.findFirst(
          {
            where: {
              pollId,

              participantId:
                participant.id,
            },
          }
        );

      if (existingResponse) {
        return res.status(409).json({
          success: false,
          message:
            "You have already participated in this poll",
        });
      }

      /**
       * Hash IP and user-agent for
       * abuse/security analysis.
       */
      const ipHash =
        hashValue(
          getClientIp(req)
        );

      const userAgentHash =
        hashValue(
          req.headers[
            "user-agent"
          ] || "unknown"
        );

      /**
       * Create all responses atomically.
       */
      await prisma.$transaction(
        answers.map(
          (answer: {
            questionId: string;
            optionId: string;
          }) =>
            prisma.response.create({
              data: {
                pollId,

                questionId:
                  answer.questionId,

                optionId:
                  answer.optionId,

                participantId:
                  participant.id,

                countyId:
                  countyId || null,

                constituencyId:
                  constituencyId ||
                  null,

                wardId:
                  wardId || null,

                ipHash,

                userAgentHash,
              },
            })
        )
      );

      return res.status(201).json({
        success: true,
        message:
          "Your response has been recorded",
      });
    } catch (error) {
      console.error(
        "Failed to submit poll responses:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to submit responses",
      });
    }
  }
);

/**
 * ============================================================================
 * POLL RESULTS
 * ============================================================================
 *
 * GET /api/public/polls/:pollId/results
 *
 * Returns aggregate poll results.
 */
router.get(
  "/polls/:pollId/results",
  async (req, res) => {
    try {
      /**
       * Find the public poll.
       */
      const poll =
        await prisma.poll.findFirst({
          where: {
            id: req.params.pollId,

            isPublic: true,
          },

          include: {
            questions: {
              include: {
                options: {
                  where: {
                    isActive: true,
                  },

                  include: {
                    candidate: true,
                  },

                  orderBy: {
                    order: "asc",
                  },
                },
              },

              orderBy: {
                order: "asc",
              },
            },
          },
        });

      if (!poll) {
        return res.status(404).json({
          success: false,
          message:
            "Poll not found",
        });
      }

      /**
       * Respect the admin's result visibility setting.
       */
      if (!poll.allowResults) {
        return res.status(403).json({
          success: false,
          message:
            "Results are not currently available for this poll",
        });
      }

      /**
       * Calculate results for every question.
       */
      const questions =
        await Promise.all(
          poll.questions.map(
            async (question) => {
              const groupedResponses =
                await prisma.response.groupBy(
                  {
                    by: ["optionId"],

                    where: {
                      pollId:
                        poll.id,

                      questionId:
                        question.id,
                    },

                    _count: {
                      optionId: true,
                    },
                  }
                );

              const counts =
                new Map(
                  groupedResponses.map(
                    (item) => [
                      item.optionId,
                      item._count
                        .optionId,
                    ]
                  )
                );

              const totalResponses =
                groupedResponses.reduce(
                  (
                    total,
                    item
                  ) =>
                    total +
                    item._count
                      .optionId,
                  0
                );

              return {
                id:
                  question.id,

                question:
                  question.question,

                totalResponses,

                options:
                  question.options.map(
                    (option) => {
                      const count =
                        counts.get(
                          option.id
                        ) || 0;

                      const percentage =
                        totalResponses ===
                        0
                          ? 0
                          : Number(
                              (
                                (count /
                                  totalResponses) *
                                100
                              ).toFixed(
                                2
                              )
                            );

                      return {
                        id:
                          option.id,

                        label:
                          option.label,

                        candidate:
                          option.candidate
                            ? {
                                id:
                                  option
                                    .candidate
                                    .id,

                                name:
                                  option
                                    .candidate
                                    .name,

                                party:
                                  option
                                    .candidate
                                    .party,

                                photoUrl:
                                  option
                                    .candidate
                                    .photoUrl,
                              }
                            : null,

                        count,

                        percentage,
                      };
                    }
                  ),
              };
            }
          )
        );

      /**
       * Total responses across the poll.
       */
      const totalResponses =
        await prisma.response.count(
          {
            where: {
              pollId: poll.id,
            },
          }
        );

      return res.json({
        success: true,

        data: {
          poll: {
            id: poll.id,

            title:
              poll.title,

            description:
              poll.description,
          },

          totalResponses,

          questions,
        },
      });
    } catch (error) {
      console.error(
        "Failed to fetch poll results:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch poll results",
      });
    }
  }
);

export default router;


