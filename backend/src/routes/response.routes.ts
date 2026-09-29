import { Router } from "express";

import { prisma } from "../config/database";
import {
  generateParticipantToken,
  hashParticipantToken,
  hashValue,
} from "../utils/participant";

const router = Router();

const PARTICIPANT_COOKIE_NAME =
  "kenya_opinion_participant";

const COOKIE_MAX_AGE =
  1000 * 60 * 60 * 24 * 365;

/**
 * Get or create an anonymous participant.
 */
async function getOrCreateParticipant(
  req: any,
  res: any
) {
  let token =
    req.cookies?.[PARTICIPANT_COOKIE_NAME];

  if (
    !token ||
    typeof token !== "string" ||
    token.length < 32
  ) {
    token = generateParticipantToken();

    res.cookie(
      PARTICIPANT_COOKIE_NAME,
      token,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite:
          process.env.NODE_ENV === "production"
            ? "none"
            : "lax",
        maxAge: COOKIE_MAX_AGE,
      }
    );
  }

  const tokenHash =
    hashParticipantToken(token);

  let participant =
    await prisma.participant.findUnique({
      where: {
        tokenHash,
      },
    });

  if (!participant) {
    participant =
      await prisma.participant.create({
        data: {
          tokenHash,
        },
      });
  } else {
    await prisma.participant.update({
      where: {
        id: participant.id,
      },
      data: {
        lastSeenAt: new Date(),
      },
    });
  }

  return participant;
}

/**
 * POST /api/responses/participant
 *
 * Creates/returns the anonymous participant.
 *
 * This endpoint does not expose the participant database ID.
 */
router.post(
  "/participant",
  async (req, res) => {
    try {
      const participant =
        await getOrCreateParticipant(
          req,
          res
        );

      return res.json({
        success: true,
        data: {
          participantId: participant.id,
        },
      });
    } catch (error) {
      console.error(
        "Participant creation error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to initialize participation",
      });
    }
  }
);

/**
 * POST /api/responses
 *
 * Submit poll responses.
 *
 * Expected body:
 *
 * {
 *   pollId: "...",
 *   countyId: "...",
 *   constituencyId: "...",
 *   wardId: "...",
 *   answers: [
 *     {
 *       questionId: "...",
 *       optionId: "..."
 *     }
 *   ]
 * }
 */
router.post(
  "/",
  async (req, res) => {
    try {
      const {
        pollId,
        countyId,
        constituencyId,
        wardId,
        answers,
      } = req.body;

      if (!pollId) {
        return res.status(400).json({
          success: false,
          message: "Poll ID is required",
        });
      }

      if (!countyId) {
        return res.status(400).json({
          success: false,
          message: "County is required",
        });
      }

      if (!constituencyId) {
        return res.status(400).json({
          success: false,
          message:
            "Constituency is required",
        });
      }

      if (!wardId) {
        return res.status(400).json({
          success: false,
          message: "Ward is required",
        });
      }

      if (
        !Array.isArray(answers) ||
        answers.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "At least one answer is required",
        });
      }

      /**
       * Check poll.
       */
      const now = new Date();

      const poll =
        await prisma.poll.findFirst({
          where: {
            id: pollId,
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
            questions: {
              include: {
                options: true,
              },
            },
          },
        });

      if (!poll) {
        return res.status(400).json({
          success: false,
          message:
            "This poll is not currently accepting responses",
        });
      }

      /**
       * Validate geographical hierarchy.
       */
      const county =
        await prisma.county.findUnique({
          where: {
            id: countyId,
          },
        });

      if (!county) {
        return res.status(400).json({
          success: false,
          message: "Invalid county",
        });
      }

      const constituency =
        await prisma.constituency.findFirst({
          where: {
            id: constituencyId,
            countyId,
          },
        });

      if (!constituency) {
        return res.status(400).json({
          success: false,
          message:
            "Constituency does not belong to the selected county",
        });
      }

      const ward =
        await prisma.ward.findFirst({
          where: {
            id: wardId,
            constituencyId,
          },
        });

      if (!ward) {
        return res.status(400).json({
          success: false,
          message:
            "Ward does not belong to the selected constituency",
        });
      }

      /**
       * Validate submitted answers.
       */
      const pollQuestionIds =
        new Set(
          poll.questions.map(
            (question) => question.id
          )
        );

      const submittedQuestionIds =
        new Set<string>();

      for (const answer of answers) {
        if (
          !answer ||
          typeof answer.questionId !==
            "string" ||
          typeof answer.optionId !==
            "string"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid answer format",
          });
        }

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

        if (
          !pollQuestionIds.has(
            answer.questionId
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Answer contains a question that does not belong to this poll",
          });
        }

        const question =
          poll.questions.find(
            (item) =>
              item.id === answer.questionId
          );

        if (!question) {
          return res.status(400).json({
            success: false,
            message:
              "Question could not be found",
          });
        }

        const option =
          question.options.find(
            (item) =>
              item.id === answer.optionId &&
              item.isActive
          );

        if (!option) {
          return res.status(400).json({
            success: false,
            message:
              "Selected option is invalid",
          });
        }
      }

      /**
       * Check required questions.
       */
      const requiredQuestions =
        poll.questions.filter(
          (question) =>
            question.isRequired
        );

      for (const question of requiredQuestions) {
        if (
          !submittedQuestionIds.has(
            question.id
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Please answer: ${question.question}`,
          });
        }
      }

      /**
       * Get anonymous participant.
       */
      const participant =
        await getOrCreateParticipant(
          req,
          res
        );

      /**
       * Check whether this participant
       * has already responded to this poll.
       */
      const existingResponse =
        await prisma.response.findFirst({
          where: {
            pollId,
            participantId:
              participant.id,
          },
        });

      if (existingResponse) {
        return res.status(409).json({
          success: false,
          message:
            "You have already participated in this poll",
        });
      }

      /**
       * Hash IP and user agent.
       *
       * These are used for abuse/security
       * analysis, not as the primary identity.
       */
      const forwardedFor =
        req.headers["x-forwarded-for"];

      let ipAddress =
        req.ip || "unknown";

      if (typeof forwardedFor === "string") {
        ipAddress =
          forwardedFor
            .split(",")[0]
            .trim() || ipAddress;
      }

      const ipHash =
        hashValue(ipAddress);

      const userAgent =
        req.headers["user-agent"] ||
        "unknown";

      const userAgentHash =
        hashValue(userAgent);

      /**
       * Save all answers in one transaction.
       */
      await prisma.$transaction(
        async (transaction) => {
          for (const answer of answers) {
            await transaction.response.create({
              data: {
                pollId,
                questionId:
                  answer.questionId,
                optionId:
                  answer.optionId,

                participantId:
                  participant.id,

                countyId,
                constituencyId,
                wardId,

                ipHash,
                userAgentHash,
              },
            });
          }
        }
      );

      return res.status(201).json({
        success: true,
        message:
          "Your response has been recorded successfully",
      });
    } catch (error) {
      console.error(
        "Response submission error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to submit response",
      });
    }
  }
);

export default router;