import { Router } from "express";
import { randomBytes, createHash } from "crypto";

import { prisma } from "../config/database";
import { requireAuth } from "../middleware/auth.middleware";

import type { Prisma } from "../generated/prisma/client";

const router = Router();

/**
 * Generate a completely new anonymous participant
 * for every respondent recorded by an agent.
 */
function createParticipantToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Hash a value before storing it.
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
 * POST /api/agent-responses/:pollId
 *
 * Record a response collected by an authorized agent.
 *
 * The respondent remains anonymous.
 *
 * Expected body:
 *
 * {
 *   "countyId": "...",
 *   "constituencyId": "...",
 *   "wardId": "...",
 *   "answers": [
 *     {
 *       "questionId": "...",
 *       "optionId": "..."
 *     }
 *   ]
 * }
 */
router.post(
  "/:pollId",
  requireAuth,
  async (req, res) => {
    try {
      const pollId = req.params.pollId;

if (typeof pollId !== "string" || !pollId.trim()) {
  return res.status(400).json({
    success: false,
    message: "A valid poll ID is required",
  });
}

      const {
        countyId,
        constituencyId,
        wardId,
        answers,
      } = req.body;

      /**
       * Basic validation.
       */
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
          message:
            "At least one answer is required",
        });
      }

      /**
       * Find the poll.
       *
       * Agent responses are allowed for
       * active polls only.
       */
      const now = new Date();

      const poll: Prisma.PollGetPayload<{
  include: {
    questions: {
      include: {
        options: true;
      };
    };
  };
}> | null = await prisma.poll.findFirst({
  where: {
    id: pollId,
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

        /**
         * Prevent answering one question
         * more than once.
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

        /**
         * Find the question inside this poll.
         */
        const question =
          poll.questions.find(
            (item) =>
              item.id ===
              answer.questionId
          );

        if (!question) {
          return res.status(400).json({
            success: false,
            message:
              "Answer contains a question that does not belong to this poll",
          });
        }

        /**
         * Ensure the option belongs to
         * the selected question.
         */
        const option =
          question.options.find(
            (item) =>
              item.id ===
                answer.optionId &&
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
       * Required questions must be answered.
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
       * Create a completely new anonymous
       * participant for this respondent.
       *
       * We intentionally do NOT use the agent's
       * participant cookie.
       */
      const participantToken =
        createParticipantToken();

      const tokenHash =
        hashValue(participantToken);

      /**
       * Hash the agent request metadata for
       * security/audit purposes.
       */
      const forwardedFor =
        req.headers["x-forwarded-for"];

      let ipAddress =
        req.ip || "unknown";

      if (
        typeof forwardedFor ===
        "string"
      ) {
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
       * Create participant and all responses
       * atomically.
       */
      await prisma.$transaction(
        async (transaction) => {
          const participant =
            await transaction.participant.create(
              {
                data: {
                  tokenHash,
                },
              }
            );

          for (const answer of answers) {
            await transaction.response.create(
              {
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

                  source: "AGENT",

                  ipHash,
                  userAgentHash,
                },
              }
            );
          }
        }
      );

      return res.status(201).json({
        success: true,
        message:
          "Agent response recorded successfully",
      });
    } catch (error) {
      console.error(
        "Agent response submission error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to record agent response",
      });
    }
  }
);

export default router;