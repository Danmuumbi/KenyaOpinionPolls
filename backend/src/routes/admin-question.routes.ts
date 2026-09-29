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
| ADD QUESTION
|--------------------------------------------------------------------------
*/

router.post(
  "/polls/:pollId/questions",
  async (req, res) => {
    try {
      const {
        question,
        description,
        order,
        isRequired,
        options,
      } = req.body;

      if (
        !question ||
        typeof question !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Question is required",
        });
      }

      if (
        !Array.isArray(options) ||
        options.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "At least one option is required",
        });
      }

      const poll =
        await prisma.poll.findUnique({
          where: {
            id: req.params.pollId,
          },
        });

      if (!poll) {
        return res.status(404).json({
          success: false,
          message: "Poll not found",
        });
      }

      const created =
        await prisma.pollQuestion.create({
          data: {
            pollId: poll.id,

            question:
              question.trim(),

            description:
              description?.trim() ||
              null,

            order:
              typeof order === "number"
                ? order
                : 0,

            isRequired:
              isRequired !== false,

            options: {
              create:
                options.map(
                  (
                    option: any,
                    index: number
                  ) => ({
                    label:
                      option.label.trim(),

                    value:
                      option.value
                        ?.trim() ||
                      null,

                    candidateId:
                      option.candidateId ||
                      null,

                    order:
                      typeof option.order ===
                      "number"
                        ? option.order
                        : index,

                    isActive:
                      option.isActive !==
                      false,
                  })
                ),
            },
          },

          include: {
            options: {
              include: {
                candidate: true,
              },
            },
          },
        });

      return res.status(201).json({
        success: true,
        message:
          "Question added successfully",
        data: created,
      });
    } catch (error) {
      console.error(
        "Add question error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to add question",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| UPDATE QUESTION
|--------------------------------------------------------------------------
*/

router.put(
  "/questions/:questionId",
  async (req, res) => {
    try {
      const {
        question,
        description,
        order,
        isRequired,
      } = req.body;

      const existing =
        await prisma.pollQuestion.findUnique({
          where: {
            id: req.params.questionId,
          },
        });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      const updated =
        await prisma.pollQuestion.update({
          where: {
            id: req.params.questionId,
          },

          data: {
            ...(question !== undefined && {
              question:
                question.trim(),
            }),

            ...(description !==
              undefined && {
              description:
                description?.trim() ||
                null,
            }),

            ...(order !== undefined && {
              order,
            }),

            ...(isRequired !==
              undefined && {
              isRequired:
                Boolean(isRequired),
            }),
          },

          include: {
            options: {
              include: {
                candidate: true,
              },
            },
          },
        });

      return res.json({
        success: true,
        message:
          "Question updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error(
        "Update question error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update question",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE QUESTION
|--------------------------------------------------------------------------
*/

router.delete(
  "/questions/:questionId",
  async (req, res) => {
    try {
      const question =
        await prisma.pollQuestion.findUnique({
          where: {
            id: req.params.questionId,
          },
        });

      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      await prisma.pollQuestion.delete({
        where: {
          id: req.params.questionId,
        },
      });

      return res.json({
        success: true,
        message:
          "Question deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete question error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete question",
      });
    }
  }
);

export default router;