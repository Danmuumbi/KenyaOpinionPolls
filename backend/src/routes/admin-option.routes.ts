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
| ADD OPTION
|--------------------------------------------------------------------------
*/

router.post(
  "/questions/:questionId/options",
  async (req, res) => {
    try {
      const {
        label,
        value,
        candidateId,
        order,
        isActive,
      } = req.body;

      if (
        !label ||
        typeof label !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Option label is required",
        });
      }

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

      if (candidateId) {
        const candidate =
          await prisma.candidate.findUnique({
            where: {
              id: candidateId,
            },
          });

        if (!candidate) {
          return res.status(400).json({
            success: false,
            message:
              "Candidate does not exist",
          });
        }
      }

      const option =
        await prisma.pollOption.create({
          data: {
            questionId:
              question.id,

            label: label.trim(),

            value:
              value?.trim() || null,

            candidateId:
              candidateId || null,

            order:
              typeof order === "number"
                ? order
                : 0,

            isActive:
              isActive !== false,
          },

          include: {
            candidate: true,
          },
        });

      return res.status(201).json({
        success: true,
        message:
          "Option added successfully",
        data: option,
      });
    } catch (error) {
      console.error(
        "Add option error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to add option",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| UPDATE OPTION
|--------------------------------------------------------------------------
*/

router.put(
  "/options/:optionId",
  async (req, res) => {
    try {
      const {
        label,
        value,
        candidateId,
        order,
        isActive,
      } = req.body;

      const existing =
        await prisma.pollOption.findUnique({
          where: {
            id: req.params.optionId,
          },
        });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Option not found",
        });
      }

      if (candidateId) {
        const candidate =
          await prisma.candidate.findUnique({
            where: {
              id: candidateId,
            },
          });

        if (!candidate) {
          return res.status(400).json({
            success: false,
            message:
              "Candidate does not exist",
          });
        }
      }

      const updated =
        await prisma.pollOption.update({
          where: {
            id: req.params.optionId,
          },

          data: {
            ...(label !== undefined && {
              label: label.trim(),
            }),

            ...(value !== undefined && {
              value:
                value?.trim() || null,
            }),

            ...(candidateId !==
              undefined && {
              candidateId:
                candidateId || null,
            }),

            ...(order !== undefined && {
              order,
            }),

            ...(isActive !==
              undefined && {
              isActive:
                Boolean(isActive),
            }),
          },

          include: {
            candidate: true,
          },
        });

      return res.json({
        success: true,
        message:
          "Option updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error(
        "Update option error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update option",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE OPTION
|--------------------------------------------------------------------------
*/

router.delete(
  "/options/:optionId",
  async (req, res) => {
    try {
      const option =
        await prisma.pollOption.findUnique({
          where: {
            id: req.params.optionId,
          },
        });

      if (!option) {
        return res.status(404).json({
          success: false,
          message: "Option not found",
        });
      }

      await prisma.pollOption.delete({
        where: {
          id: req.params.optionId,
        },
      });

      return res.json({
        success: true,
        message:
          "Option deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete option error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete option",
      });
    }
  }
);

export default router;