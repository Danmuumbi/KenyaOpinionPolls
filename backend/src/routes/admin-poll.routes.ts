
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

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

const POLL_TYPES = [
  "GENERAL",
  "POLITICAL",
  "CAMPAIGN",
  "PUBLIC_SERVICE",
  "RESEARCH",
] as const;

const POLL_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "ACTIVE",
  "PAUSED",
  "CLOSED",
  "ARCHIVED",
] as const;

type PollType = (typeof POLL_TYPES)[number];
type PollStatus = (typeof POLL_STATUSES)[number];

/*
|--------------------------------------------------------------------------
| SHARED POLL INCLUDE
|--------------------------------------------------------------------------
*/

const pollInclude = {
  position: true,

  campaign: true,

  targetCounty: true,
  targetConstituency: true,
  targetWard: true,

  questions: {
    orderBy: {
      order: "asc" as const,
    },

    include: {
      options: {
        orderBy: {
          order: "asc" as const,
        },

        include: {
          candidate: true,
        },
      },
    },
  },

  _count: {
    select: {
      responses: true,
    },
  },
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function isValidPollType(
  value: unknown
): value is PollType {
  return (
    typeof value === "string" &&
    POLL_TYPES.includes(
      value as PollType
    )
  );
}

function isValidPollStatus(
  value: unknown
): value is PollStatus {
  return (
    typeof value === "string" &&
    POLL_STATUSES.includes(
      value as PollStatus
    )
  );
}

function isPoliticalPoll(
  type: PollType
) {
  return (
    type === "POLITICAL" ||
    type === "CAMPAIGN"
  );
}

/*
|--------------------------------------------------------------------------
| GET ALL POLLS
|--------------------------------------------------------------------------
*/

router.get("/", async (_req, res) => {
  try {
    const polls =
      await prisma.poll.findMany({
        include: pollInclude,

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
      "Failed to fetch admin polls:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch polls",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET SINGLE POLL
|--------------------------------------------------------------------------
*/

router.get(
  "/:pollId",
  async (req, res) => {
    try {
      const poll =
        await prisma.poll.findUnique({
          where: {
            id: req.params.pollId,
          },

          include: pollInclude,
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
      console.error(
        "Failed to fetch poll:",
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

/*
|--------------------------------------------------------------------------
| CREATE POLL
|--------------------------------------------------------------------------
*/

router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,

      /*
       * IMPORTANT:
       * Prisma field is `type`, not `pollType`.
       *
       * We accept both here for backwards
       * compatibility with an older frontend.
       */
      type,
      pollType,

      positionId,

      campaignId,

      sponsorName,
      sponsorOrganization,

      disclosureNote,
      methodologyNote,

      targetCountyId,
      targetConstituencyId,
      targetWardId,

      startsAt,
      endsAt,

      allowResults,
      isPublic,

      status,

      questions,
    } = req.body;

    /*
     * Resolve poll type.
     *
     * New frontend should send `type`.
     *
     * Older frontend may still send `pollType`.
     */
    let resolvedType =
      type ?? pollType ?? "GENERAL";

    /*
     * Backwards compatibility:
     *
     * If the old frontend sends:
     * POLITICAL_CAMPAIGN
     *
     * convert it to the Prisma enum:
     * CAMPAIGN
     */
    if (
      resolvedType ===
      "POLITICAL_CAMPAIGN"
    ) {
      resolvedType = "CAMPAIGN";
    }

    /*
     * Validate title.
     */

    if (
      !title ||
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Poll title is required",
      });
    }

    /*
     * Validate poll type.
     */

    if (
      !isValidPollType(
        resolvedType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid poll type",
      });
    }

    /*
     * Validate status if supplied.
     *
     * New polls normally start as DRAFT.
     */

    const resolvedStatus =
      status ?? "DRAFT";

    if (
      !isValidPollStatus(
        resolvedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid poll status",
      });
    }

    /*
     * Political and campaign polls
     * require a position.
     */

    if (
      isPoliticalPoll(
        resolvedType
      ) &&
      !positionId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A position is required for political and campaign polls",
      });
    }

    /*
     * Validate position ID.
     */

    if (
      positionId !== undefined &&
      positionId !== null &&
      typeof positionId !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid position",
      });
    }

    /*
     * Validate dates.
     */

    const parsedStartsAt =
      startsAt
        ? new Date(startsAt)
        : null;

    const parsedEndsAt =
      endsAt
        ? new Date(endsAt)
        : null;

    if (
      parsedStartsAt &&
      Number.isNaN(
        parsedStartsAt.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid start date",
      });
    }

    if (
      parsedEndsAt &&
      Number.isNaN(
        parsedEndsAt.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid end date",
      });
    }

    if (
      parsedStartsAt &&
      parsedEndsAt &&
      parsedStartsAt >=
        parsedEndsAt
    ) {
      return res.status(400).json({
        success: false,
        message:
          "End date must be after start date",
      });
    }

    /*
     * Validate questions.
     */

    if (
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one question is required",
      });
    }

    /*
     * Load position.
     */

    let position = null;

    if (positionId) {
      position =
        await prisma.position.findUnique({
          where: {
            id: positionId,
          },
        });

      if (!position) {
        return res.status(400).json({
          success: false,
          message:
            "Selected position does not exist",
        });
      }

      if (!position.isActive) {
        return res.status(400).json({
          success: false,
          message:
            "Selected position is inactive",
        });
      }
    }

    /*
     * Campaign validation.
     */

    if (campaignId) {
      const campaign =
        await prisma.campaign.findUnique({
          where: {
            id: campaignId,
          },
        });

      if (!campaign) {
        return res.status(400).json({
          success: false,
          message:
            "Selected campaign does not exist",
        });
      }

      if (!campaign.isActive) {
        return res.status(400).json({
          success: false,
          message:
            "Selected campaign is inactive",
        });
      }
    }

    /*
     * Campaign records are meaningful
     * for campaign polls.
     */

    if (
      campaignId &&
      resolvedType !== "CAMPAIGN"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A campaign can only be attached to a campaign poll",
      });
    }

    /*
     * Validate county.
     */

    let county = null;

    if (targetCountyId) {
      county =
        await prisma.county.findUnique({
          where: {
            id: targetCountyId,
          },
        });

      if (!county) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid target county",
        });
      }
    }

    /*
     * Validate constituency.
     */

    let constituency = null;

    if (targetConstituencyId) {
      constituency =
        await prisma.constituency.findUnique({
          where: {
            id: targetConstituencyId,
          },
        });

      if (!constituency) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid target constituency",
        });
      }

      /*
       * If a county was explicitly selected,
       * constituency must belong to it.
       */

      if (
        targetCountyId &&
        constituency.countyId !==
          targetCountyId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Target constituency does not belong to the selected county",
        });
      }

      /*
       * If no county was supplied,
       * derive it from the constituency.
       */

      if (!targetCountyId) {
        county =
          await prisma.county.findUnique({
            where: {
              id: constituency.countyId,
            },
          });
      }
    }

    /*
     * Validate ward.
     */

    let ward = null;

    if (targetWardId) {
      ward =
        await prisma.ward.findUnique({
          where: {
            id: targetWardId,
          },
        });

      if (!ward) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid target ward",
        });
      }

      /*
       * Ward must belong to selected
       * constituency if supplied.
       */

      if (
        targetConstituencyId &&
        ward.constituencyId !==
          targetConstituencyId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Target ward does not belong to the selected constituency",
        });
      }

      /*
       * Derive constituency from ward.
       */

      if (!targetConstituencyId) {
        constituency =
          await prisma.constituency.findUnique({
            where: {
              id: ward.constituencyId,
            },
          });
      }

      /*
       * Derive county from constituency.
       */

      if (
        constituency &&
        !targetCountyId
      ) {
        county =
          await prisma.county.findUnique({
            where: {
              id: constituency.countyId,
            },
          });
      }
    }

    /*
     * Final geographic IDs.
     *
     * We derive parent geography where
     * necessary instead of storing
     * inconsistent relationships.
     */

    const resolvedCountyId =
      targetCountyId ||
      constituency?.countyId ||
      null;

    const resolvedConstituencyId =
      targetConstituencyId ||
      ward?.constituencyId ||
      null;

    const resolvedWardId =
      targetWardId || null;

    /*
     * Political position geography.
     *
     * Position scope determines the
     * required targeting level.
     */

    if (
      isPoliticalPoll(
        resolvedType
      )
    ) {
      if (!position) {
        return res.status(400).json({
          success: false,
          message:
            "Political and campaign polls require a position",
        });
      }

      /*
       * NATIONAL
       */

      if (
        position.scope ===
        "NATIONAL"
      ) {
        if (
          resolvedCountyId ||
          resolvedConstituencyId ||
          resolvedWardId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "National positions cannot have a geographic target",
          });
        }
      }

      /*
       * COUNTY
       */

      if (
        position.scope ===
        "COUNTY"
      ) {
        if (
          !resolvedCountyId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "County is required for this position",
          });
        }

        if (
          resolvedConstituencyId ||
          resolvedWardId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "County-level political polls cannot target a constituency or ward",
          });
        }
      }

      /*
       * CONSTITUENCY
       */

      if (
        position.scope ===
        "CONSTITUENCY"
      ) {
        if (
          !resolvedConstituencyId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Constituency is required for this position",
          });
        }

        if (resolvedWardId) {
          return res.status(400).json({
            success: false,
            message:
              "Constituency-level political polls cannot target a ward",
          });
        }
      }

      /*
       * WARD
       */

      if (
        position.scope ===
        "WARD"
      ) {
        if (!resolvedWardId) {
          return res.status(400).json({
            success: false,
            message:
              "Ward is required for this position",
          });
        }
      }
    }

    /*
     * For non-political polls,
     * targeting can be at any supported
     * geographic level.
     *
     * However, a child target should
     * never conflict with its parents.
     */

    /*
     * Validate questions/options.
     */

    for (
      let index = 0;
      index < questions.length;
      index++
    ) {
      const question =
        questions[index];

      if (
        !question ||
        typeof question.question !==
          "string" ||
        !question.question.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Question ${index + 1} is invalid`,
        });
      }

      if (
        !Array.isArray(
          question.options
        ) ||
        question.options.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Question ${index + 1} must have at least one option`,
        });
      }

      for (
        let optionIndex = 0;
        optionIndex <
        question.options.length;
        optionIndex++
      ) {
        const option =
          question.options[
            optionIndex
          ];

        if (
          !option ||
          typeof option.label !==
            "string" ||
          !option.label.trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Option ${optionIndex + 1} in question ${index + 1} is invalid`,
          });
        }

        /*
         * Candidate validation only applies
         * to political/campaign polls.
         */

        if (
          isPoliticalPoll(
            resolvedType
          )
        ) {
          if (
            !option.candidateId
          ) {
            return res.status(400).json({
              success: false,
              message:
                `Option ${optionIndex + 1} in question ${index + 1} must have a candidate`,
            });
          }

          const candidate =
            await prisma.candidate.findUnique(
              {
                where: {
                  id: option.candidateId,
                },
              }
            );

          if (!candidate) {
            return res.status(400).json({
              success: false,
              message:
                "Selected candidate does not exist",
            });
          }

          if (!candidate.isActive) {
            return res.status(400).json({
              success: false,
              message:
                "Selected candidate is inactive",
            });
          }

          /*
           * Candidate must belong to the
           * selected position.
           */

          if (
            candidate.positionId !==
            positionId
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Selected candidate does not belong to the selected position",
            });
          }

          /*
           * NATIONAL candidate.
           */

          if (
            position?.scope ===
            "NATIONAL"
          ) {
            if (
              candidate.countyId ||
              candidate.constituencyId ||
              candidate.wardId
            ) {
              return res.status(400).json({
                success: false,
                message:
                  "National candidates cannot have county, constituency or ward targeting",
              });
            }
          }

          /*
           * COUNTY candidate.
           */

          if (
            position?.scope ===
            "COUNTY"
          ) {
            if (
              candidate.countyId !==
              resolvedCountyId
            ) {
              return res.status(400).json({
                success: false,
                message:
                  "Selected candidate does not belong to the selected county",
              });
            }

            if (
              candidate.constituencyId ||
              candidate.wardId
            ) {
              return res.status(400).json({
                success: false,
                message:
                  "County-level candidates cannot have constituency or ward targeting",
              });
            }
          }

          /*
           * CONSTITUENCY candidate.
           */

          if (
            position?.scope ===
            "CONSTITUENCY"
          ) {
            if (
              candidate.constituencyId !==
              resolvedConstituencyId
            ) {
              return res.status(400).json({
                success: false,
                message:
                  "Selected candidate does not belong to the selected constituency",
              });
            }

            /*
             * Candidate's county should
             * also match the constituency.
             */

            if (
              resolvedCountyId &&
              candidate.countyId &&
              candidate.countyId !==
                resolvedCountyId
            ) {
              return res.status(400).json({
                success: false,
                message:
                  "Selected candidate does not belong to the selected county",
              });
            }

            if (
              candidate.wardId
            ) {
              return res.status(400).json({
                success: false,
                message:
                  "Constituency-level candidates cannot have ward targeting",
              });
            }
          }

          /*
           * WARD candidate.
           */

          if (
            position?.scope ===
            "WARD"
          ) {
            if (
              candidate.wardId !==
              resolvedWardId
            ) {
              return res.status(400).json({
                success: false,
                message:
                  "Selected candidate does not belong to the selected ward",
              });
            }

            /*
             * Candidate's constituency
             * should also match.
             */

            if (
              resolvedConstituencyId &&
              candidate.constituencyId &&
              candidate.constituencyId !==
                resolvedConstituencyId
            ) {
              return res.status(400).json({
                success: false,
                message:
                  "Selected candidate does not belong to the selected constituency",
              });
            }

            /*
             * Candidate's county should
             * also match.
             */

            if (
              resolvedCountyId &&
              candidate.countyId &&
              candidate.countyId !==
                resolvedCountyId
            ) {
              return res.status(400).json({
                success: false,
                message:
                  "Selected candidate does not belong to the selected county",
              });
            }
          }
        } else {
          /*
           * Non-political polls may use
           * ordinary free-text options.
           *
           * A candidateId is not allowed
           * because there is no political
           * candidate context.
           */

          if (
            option.candidateId
          ) {
            return res.status(400).json({
              success: false,
              message:
                `Question ${index + 1} contains a candidate option but this is not a political or campaign poll`,
            });
          }
        }
      }
    }

    /*
     * Create poll atomically with all
     * questions and options.
     */

    const poll =
      await prisma.poll.create({
        data: {
          title:
            title.trim(),

          description:
            typeof description ===
              "string"
              ? description.trim() ||
                null
              : null,

          /*
           * IMPORTANT:
           * Prisma field is `type`.
           */
          type: resolvedType,

          positionId:
            positionId || null,

          campaignId:
            campaignId || null,

          sponsorName:
            typeof sponsorName ===
              "string"
              ? sponsorName.trim() ||
                null
              : null,

          sponsorOrganization:
            typeof sponsorOrganization ===
              "string"
              ? sponsorOrganization.trim() ||
                null
              : null,

          disclosureNote:
            typeof disclosureNote ===
              "string"
              ? disclosureNote.trim() ||
                null
              : null,

          methodologyNote:
            typeof methodologyNote ===
              "string"
              ? methodologyNote.trim() ||
                null
              : null,

          /*
           * Store the resolved geography.
           */

          targetCountyId:
            resolvedCountyId,

          targetConstituencyId:
            resolvedConstituencyId,

          targetWardId:
            resolvedWardId,

          startsAt:
            parsedStartsAt,

          endsAt:
            parsedEndsAt,

          allowResults:
            allowResults !== false,

          isPublic:
            isPublic !== false,

          status:
            resolvedStatus,

          /*
           * Create questions and options.
           */

          questions: {
            create:
              questions.map(
                (
                  question: any,
                  questionIndex: number
                ) => ({
                  question:
                    question.question.trim(),

                  description:
                    typeof question.description ===
                      "string"
                      ? question.description.trim() ||
                        null
                      : null,

                  order:
                    questionIndex,

                  isRequired:
                    question.isRequired !==
                    false,

                  options: {
                    create:
                      question.options.map(
                        (
                          option: any,
                          optionIndex: number
                        ) => ({
                          label:
                            option.label.trim(),

                          value:
                            typeof option.value ===
                              "string"
                              ? option.value.trim() ||
                                null
                              : null,

                          candidateId:
                            option.candidateId ||
                            null,

                          order:
                            optionIndex,

                          isActive:
                            option.isActive !==
                            false,
                        })
                      ),
                  },
                })
              ),
          },
        },

        include: pollInclude,
      });

    return res.status(201).json({
      success: true,
      message:
        "Poll created successfully",
      data: poll,
    });
  } catch (error) {
    console.error(
      "Poll creation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create poll",
    });
  }
});

/*
|--------------------------------------------------------------------------
| UPDATE POLL
|--------------------------------------------------------------------------
*/

router.put(
  "/:pollId",
  async (req, res) => {
    try {
      const {
        title,
        description,

        type,
        pollType,

        positionId,

        campaignId,

        sponsorName,
        sponsorOrganization,

        disclosureNote,
        methodologyNote,

        targetCountyId,
        targetConstituencyId,
        targetWardId,

        startsAt,
        endsAt,

        allowResults,
        isPublic,
      } = req.body;

      /*
       * Find existing poll.
       */

      const existing =
        await prisma.poll.findUnique({
          where: {
            id: req.params.pollId,
          },
        });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message:
            "Poll not found",
        });
      }

      /*
       * Validate title.
       */

      if (
        title !== undefined &&
        (
          !title ||
          typeof title !==
            "string" ||
          !title.trim()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid poll title",
        });
      }

      /*
       * Resolve type.
       */

      let resolvedType =
        type ??
        pollType ??
        existing.type;

      /*
       * Backwards compatibility.
       */

      if (
        resolvedType ===
        "POLITICAL_CAMPAIGN"
      ) {
        resolvedType = "CAMPAIGN";
      }

      if (
        !isValidPollType(
          resolvedType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid poll type",
        });
      }

      /*
       * Resolve effective position.
       */

      const effectivePositionId =
        positionId !== undefined
          ? positionId || null
          : existing.positionId;

      /*
       * Political/campaign polls require
       * a position.
       */

      if (
        isPoliticalPoll(
          resolvedType
        ) &&
        !effectivePositionId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Political and campaign polls require a position",
        });
      }

      /*
       * Validate effective position.
       */

      let position = null;

      if (
        effectivePositionId
      ) {
        position =
          await prisma.position.findUnique({
            where: {
              id:
                effectivePositionId,
            },
          });

        if (!position) {
          return res.status(400).json({
            success: false,
            message:
              "Selected position does not exist",
          });
        }

        if (!position.isActive) {
          return res.status(400).json({
            success: false,
            message:
              "Selected position is inactive",
          });
        }
      }

      /*
       * Resolve campaign.
       */

      const effectiveCampaignId =
        campaignId !== undefined
          ? campaignId || null
          : existing.campaignId;

      if (
        effectiveCampaignId
      ) {
        const campaign =
          await prisma.campaign.findUnique({
            where: {
              id:
                effectiveCampaignId,
            },
          });

        if (!campaign) {
          return res.status(400).json({
            success: false,
            message:
              "Selected campaign does not exist",
          });
        }

        if (!campaign.isActive) {
          return res.status(400).json({
            success: false,
            message:
              "Selected campaign is inactive",
          });
        }

        if (
          resolvedType !==
          "CAMPAIGN"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "A campaign can only be attached to a campaign poll",
          });
        }
      }

      /*
       * Validate dates.
       */

      const parsedStartsAt =
        startsAt !== undefined
          ? startsAt
            ? new Date(startsAt)
            : null
          : existing.startsAt;

      const parsedEndsAt =
        endsAt !== undefined
          ? endsAt
            ? new Date(endsAt)
            : null
          : existing.endsAt;

      if (
        parsedStartsAt &&
        Number.isNaN(
          parsedStartsAt.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid start date",
        });
      }

      if (
        parsedEndsAt &&
        Number.isNaN(
          parsedEndsAt.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid end date",
        });
      }

      if (
        parsedStartsAt &&
        parsedEndsAt &&
        parsedStartsAt >=
          parsedEndsAt
      ) {
        return res.status(400).json({
          success: false,
          message:
            "End date must be after start date",
        });
      }

      /*
       * Resolve geography.
       *
       * If a field is omitted during update,
       * retain the existing value.
       */

      const effectiveCountyId =
        targetCountyId !== undefined
          ? targetCountyId ||
            null
          : existing.targetCountyId;

      const effectiveConstituencyId =
        targetConstituencyId !==
        undefined
          ? targetConstituencyId ||
            null
          : existing.targetConstituencyId;

      const effectiveWardId =
        targetWardId !== undefined
          ? targetWardId || null
          : existing.targetWardId;

      /*
       * Validate county.
       */

      let county = null;

      if (effectiveCountyId) {
        county =
          await prisma.county.findUnique({
            where: {
              id:
                effectiveCountyId,
            },
          });

        if (!county) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid target county",
          });
        }
      }

      /*
       * Validate constituency.
       */

      let constituency = null;

      if (
        effectiveConstituencyId
      ) {
        constituency =
          await prisma.constituency.findUnique(
            {
              where: {
                id:
                  effectiveConstituencyId,
              },
            }
          );

        if (!constituency) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid target constituency",
          });
        }

        if (
          effectiveCountyId &&
          constituency.countyId !==
            effectiveCountyId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Target constituency does not belong to the selected county",
          });
        }
      }

      /*
       * Validate ward.
       */

      let ward = null;

      if (effectiveWardId) {
        ward =
          await prisma.ward.findUnique({
            where: {
              id:
                effectiveWardId,
            },
          });

        if (!ward) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid target ward",
          });
        }

        if (
          effectiveConstituencyId &&
          ward.constituencyId !==
            effectiveConstituencyId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Target ward does not belong to the selected constituency",
          });
        }
      }

      /*
       * Derive consistent parent geography.
       */

      const resolvedCountyId =
        effectiveCountyId ||
        constituency?.countyId ||
        null;

      const resolvedConstituencyId =
        effectiveConstituencyId ||
        ward?.constituencyId ||
        null;

      const resolvedWardId =
        effectiveWardId ||
        null;

      /*
       * Political geography validation.
       */

      if (
        isPoliticalPoll(
          resolvedType
        )
      ) {
        if (!position) {
          return res.status(400).json({
            success: false,
            message:
              "Political and campaign polls require a position",
          });
        }

        /*
         * NATIONAL
         */

        if (
          position.scope ===
          "NATIONAL"
        ) {
          if (
            resolvedCountyId ||
            resolvedConstituencyId ||
            resolvedWardId
          ) {
            return res.status(400).json({
              success: false,
              message:
                "National positions cannot have a geographic target",
            });
          }
        }

        /*
         * COUNTY
         */

        if (
          position.scope ===
          "COUNTY"
        ) {
          if (
            !resolvedCountyId
          ) {
            return res.status(400).json({
              success: false,
              message:
                "County is required for this position",
            });
          }

          if (
            resolvedConstituencyId ||
            resolvedWardId
          ) {
            return res.status(400).json({
              success: false,
              message:
                "County-level political polls cannot target a constituency or ward",
            });
          }
        }

        /*
         * CONSTITUENCY
         */

        if (
          position.scope ===
          "CONSTITUENCY"
        ) {
          if (
            !resolvedConstituencyId
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Constituency is required for this position",
            });
          }

          if (
            resolvedWardId
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Constituency-level political polls cannot target a ward",
            });
          }
        }

        /*
         * WARD
         */

        if (
          position.scope ===
          "WARD"
        ) {
          if (
            !resolvedWardId
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Ward is required for this position",
            });
          }
        }
      }

      /*
       * Update poll.
       */

      const poll =
        await prisma.poll.update({
          where: {
            id:
              req.params.pollId,
          },

          data: {
            ...(title !==
              undefined && {
              title:
                title.trim(),
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

            /*
             * IMPORTANT:
             * Prisma field is `type`.
             */
            ...((
              type !==
                undefined ||
              pollType !==
                undefined
            ) && {
              type:
                resolvedType,
            }),

            ...(positionId !==
              undefined && {
              positionId:
                positionId ||
                null,
            }),

            ...(campaignId !==
              undefined && {
              campaignId:
                campaignId ||
                null,
            }),

            ...(sponsorName !==
              undefined && {
              sponsorName:
                typeof sponsorName ===
                  "string"
                  ? sponsorName.trim() ||
                    null
                  : null,
            }),

            ...(sponsorOrganization !==
              undefined && {
              sponsorOrganization:
                typeof sponsorOrganization ===
                  "string"
                  ? sponsorOrganization.trim() ||
                    null
                  : null,
            }),

            ...(disclosureNote !==
              undefined && {
              disclosureNote:
                typeof disclosureNote ===
                  "string"
                  ? disclosureNote.trim() ||
                    null
                  : null,
            }),

            ...(methodologyNote !==
              undefined && {
              methodologyNote:
                typeof methodologyNote ===
                  "string"
                  ? methodologyNote.trim() ||
                    null
                  : null,
            }),

            ...(targetCountyId !==
              undefined && {
              targetCountyId:
                resolvedCountyId,
            }),

            ...(targetConstituencyId !==
              undefined && {
              targetConstituencyId:
                resolvedConstituencyId,
            }),

            ...(targetWardId !==
              undefined && {
              targetWardId:
                resolvedWardId,
            }),

            ...(startsAt !==
              undefined && {
              startsAt:
                parsedStartsAt,
            }),

            ...(endsAt !==
              undefined && {
              endsAt:
                parsedEndsAt,
            }),

            ...(allowResults !==
              undefined && {
              allowResults:
                Boolean(
                  allowResults
                ),
            }),

            ...(isPublic !==
              undefined && {
              isPublic:
                Boolean(
                  isPublic
                ),
            }),
          },

          include: pollInclude,
        });

      return res.json({
        success: true,
        message:
          "Poll updated successfully",
        data: poll,
      });
    } catch (error) {
      console.error(
        "Poll update error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update poll",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| CHANGE POLL STATUS
|--------------------------------------------------------------------------
*/

router.patch(
  "/:pollId/status",
  async (req, res) => {
    try {
      const {
        status,
      } = req.body;

      /*
       * Validate status.
       */

      if (
        !isValidPollStatus(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid poll status",
        });
      }

      /*
       * Find poll.
       */

      const poll =
        await prisma.poll.findUnique({
          where: {
            id:
              req.params.pollId,
          },
        });

      if (!poll) {
        return res.status(404).json({
          success: false,
          message:
            "Poll not found",
        });
      }

      /*
       * Archived polls cannot be
       * reopened.
       */

      if (
        poll.status ===
          "ARCHIVED" &&
        status !==
          "ARCHIVED"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Archived polls cannot be reopened",
        });
      }

      /*
       * Update status.
       */

      const updated =
        await prisma.poll.update({
          where: {
            id:
              req.params.pollId,
          },

          data: {
            status,
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
          "Poll status updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error(
        "Poll status update error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update poll status",
      });
    }
  }
);

export default router;

