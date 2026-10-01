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
| EDIT ENTIRE POLL
|--------------------------------------------------------------------------
|
| This is a dedicated edit endpoint.
|
| Existing poll/question/option routes are NOT modified.
|
| Existing records keep their IDs.
| New records are created.
| Removed options with responses are deactivated.
| Removed questions with responses are preserved.
|
|--------------------------------------------------------------------------
*/

router.put(
  "/:pollId/edit",
  async (req, res) => {
    try {
      const {
        title,
        description,
        startsAt,
        endsAt,
        allowResults,
        isPublic,
        questions,
      } = req.body;

      const pollId = req.params.pollId;

      /*
      |--------------------------------------------------------------------------
      | VALIDATE POLL
      |--------------------------------------------------------------------------
      */

      const existingPoll =
        await prisma.poll.findUnique({
          where: {
            id: pollId,
          },

          include: {
            questions: {
              include: {
                options: true,
                responses: true,
              },

              orderBy: {
                order: "asc",
              },
            },
          },
        });

      if (!existingPoll) {
        return res.status(404).json({
          success: false,
          message: "Poll not found",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | BASIC VALIDATION
      |--------------------------------------------------------------------------
      */

      if (
        title !== undefined &&
        (
          typeof title !== "string" ||
          !title.trim()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Poll title is required",
        });
      }

      if (
        questions !== undefined &&
        !Array.isArray(questions)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Questions must be an array",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VALIDATE DATES
      |--------------------------------------------------------------------------
      */

      let parsedStartsAt:
        Date | null | undefined;

      let parsedEndsAt:
        Date | null | undefined;

      if (startsAt !== undefined) {
        parsedStartsAt =
          startsAt
            ? new Date(startsAt)
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
      }

      if (endsAt !== undefined) {
        parsedEndsAt =
          endsAt
            ? new Date(endsAt)
            : null;

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
      }

      if (
        parsedStartsAt &&
        parsedEndsAt &&
        parsedEndsAt < parsedStartsAt
      ) {
        return res.status(400).json({
          success: false,
          message:
            "End date cannot be before start date",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VALIDATE QUESTIONS BEFORE TRANSACTION
      |--------------------------------------------------------------------------
      */

      if (Array.isArray(questions)) {
        for (
          let questionIndex = 0;
          questionIndex < questions.length;
          questionIndex++
        ) {
          const incomingQuestion =
            questions[questionIndex];

          if (
            !incomingQuestion ||
            typeof incomingQuestion.question !==
              "string" ||
            !incomingQuestion.question.trim()
          ) {
            return res.status(400).json({
              success: false,
              message:
                `Question ${
                  questionIndex + 1
                } is required`,
            });
          }

          if (
            !Array.isArray(
              incomingQuestion.options
            ) ||
            incomingQuestion.options.length === 0
          ) {
            return res.status(400).json({
              success: false,
              message:
                `Question ${
                  questionIndex + 1
                } must have at least one option`,
            });
          }

          for (
            let optionIndex = 0;
            optionIndex <
            incomingQuestion.options.length;
            optionIndex++
          ) {
            const option =
              incomingQuestion.options[
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
                  `Option ${
                    optionIndex + 1
                  } in question ${
                    questionIndex + 1
                  } requires a label`,
              });
            }

            /*
            |--------------------------------------------------------------------------
            | Validate candidate if supplied
            |--------------------------------------------------------------------------
            */

            if (option.candidateId) {
              const candidate =
                await prisma.candidate.findUnique({
                  where: {
                    id: option.candidateId,
                  },
                });

              if (!candidate) {
                return res.status(400).json({
                  success: false,
                  message:
                    `Candidate for option ${
                      optionIndex + 1
                    } does not exist`,
                });
              }
            }
          }
        }
      }

      /*
      |--------------------------------------------------------------------------
      | TRANSACTION
      |--------------------------------------------------------------------------
      */

      const updatedPoll =
        await prisma.$transaction(
          async (tx) => {
            /*
            |--------------------------------------------------------------------------
            | UPDATE POLL
            |--------------------------------------------------------------------------
            */

            await tx.poll.update({
              where: {
                id: pollId,
              },

              data: {
                ...(title !== undefined && {
                  title: title.trim(),
                }),

                ...(description !==
                  undefined && {
                  description:
                    description?.trim() ||
                    null,
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
                    Boolean(isPublic),
                }),
              },
            });

            /*
            |--------------------------------------------------------------------------
            | IF QUESTIONS WERE NOT SENT,
            | ONLY POLL DETAILS ARE UPDATED.
            |--------------------------------------------------------------------------
            */

            if (!Array.isArray(questions)) {
              return tx.poll.findUnique({
                where: {
                  id: pollId,
                },

                include: {
                  position: true,
                  campaign: true,

                  targetCounty: true,
                  targetConstituency: true,
                  targetWard: true,

                  questions: {
                    orderBy: {
                      order: "asc",
                    },

                    include: {
                      options: {
                        orderBy: {
                          order: "asc",
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
                },
              });
            }

            /*
            |--------------------------------------------------------------------------
            | EXISTING IDS
            |--------------------------------------------------------------------------
            */

            const incomingQuestionIds =
              questions
                .filter(
                  (question: any) =>
                    question.id
                )
                .map(
                  (question: any) =>
                    question.id
                );

            /*
            |--------------------------------------------------------------------------
            | PROCESS QUESTIONS
            |--------------------------------------------------------------------------
            */

            for (
              let questionIndex = 0;
              questionIndex < questions.length;
              questionIndex++
            ) {
              const incomingQuestion =
                questions[questionIndex];

              let questionId =
                incomingQuestion.id;

              /*
              |--------------------------------------------------------------------------
              | EXISTING QUESTION
              |--------------------------------------------------------------------------
              */

              if (questionId) {
                const existingQuestion =
                  existingPoll.questions.find(
                    (question) =>
                      question.id ===
                      questionId
                  );

                if (!existingQuestion) {
                  throw new Error(
                    "Invalid question ID supplied"
                  );
                }

                await tx.pollQuestion.update({
                  where: {
                    id: questionId,
                  },

                  data: {
                    question:
                      incomingQuestion.question.trim(),

                    description:
                      incomingQuestion.description
                        ?.trim() ||
                      null,

                    order:
                      questionIndex,

                    isRequired:
                      incomingQuestion
                        .isRequired !== false,
                  },
                });
              }

              /*
              |--------------------------------------------------------------------------
              | NEW QUESTION
              |--------------------------------------------------------------------------
              */

              else {
                const createdQuestion =
                  await tx.pollQuestion.create({
                    data: {
                      pollId,

                      question:
                        incomingQuestion.question.trim(),

                      description:
                        incomingQuestion.description
                          ?.trim() ||
                        null,

                      order:
                        questionIndex,

                      isRequired:
                        incomingQuestion
                          .isRequired !== false,
                    },
                  });

                questionId =
                  createdQuestion.id;
              }

              /*
              |--------------------------------------------------------------------------
              | EXISTING OPTIONS FOR THIS QUESTION
              |--------------------------------------------------------------------------
              */

              const existingQuestion =
                existingPoll.questions.find(
                  (question) =>
                    question.id ===
                    questionId
                );

              const existingOptions =
                existingQuestion?.options ||
                [];

              const incomingOptions =
                incomingQuestion.options;

              const incomingOptionIds =
                incomingOptions
                  .filter(
                    (option: any) =>
                      option.id
                  )
                  .map(
                    (option: any) =>
                      option.id
                  );

              /*
              |--------------------------------------------------------------------------
              | PROCESS OPTIONS
              |--------------------------------------------------------------------------
              */

              for (
                let optionIndex = 0;
                optionIndex <
                incomingOptions.length;
                optionIndex++
              ) {
                const incomingOption =
                  incomingOptions[
                    optionIndex
                  ];

                if (
                  incomingOption.id
                ) {
                  const existingOption =
                    existingOptions.find(
                      (option) =>
                        option.id ===
                        incomingOption.id
                    );

                  if (
                    !existingOption
                  ) {
                    throw new Error(
                      "Invalid option ID supplied"
                    );
                  }

                  await tx.pollOption.update({
                    where: {
                      id:
                        incomingOption.id,
                    },

                    data: {
                      label:
                        incomingOption.label.trim(),

                      value:
                        incomingOption.value
                          ?.trim() ||
                        null,

                      candidateId:
                        incomingOption
                          .candidateId ||
                        null,

                      order:
                        optionIndex,

                      isActive:
                        incomingOption
                          .isActive !==
                        false,
                    },
                  });
                }

                /*
                |--------------------------------------------------------------------------
                | NEW OPTION
                |--------------------------------------------------------------------------
                */

                else {
                  await tx.pollOption.create({
                    data: {
                      questionId,

                      label:
                        incomingOption.label.trim(),

                      value:
                        incomingOption.value
                          ?.trim() ||
                        null,

                      candidateId:
                        incomingOption
                          .candidateId ||
                        null,

                      order:
                        optionIndex,

                      isActive:
                        incomingOption
                          .isActive !==
                        false,
                    },
                  });
                }
              }

              /*
              |--------------------------------------------------------------------------
              | HANDLE REMOVED OPTIONS
              |--------------------------------------------------------------------------
              |
              | If an old option is missing from the submitted
              | list, check whether it has responses.
              |
              | With responses:
              |     deactivate it
              |
              | Without responses:
              |     delete it
              |
              */

              for (
                const existingOption
                of existingOptions
              ) {
                if (
                  incomingOptionIds.includes(
                    existingOption.id
                  )
                ) {
                  continue;
                }

                const responseCount =
                  await tx.response.count({
                    where: {
                      optionId:
                        existingOption.id,
                    },
                  });

                if (responseCount > 0) {
                  await tx.pollOption.update({
                    where: {
                      id:
                        existingOption.id,
                    },

                    data: {
                      isActive: false,
                    },
                  });
                } else {
                  await tx.pollOption.delete({
                    where: {
                      id:
                        existingOption.id,
                    },
                  });
                }
              }
            }

            /*
            |--------------------------------------------------------------------------
            | HANDLE REMOVED QUESTIONS
            |--------------------------------------------------------------------------
            */

            for (
              const existingQuestion
              of existingPoll.questions
            ) {
              if (
                incomingQuestionIds.includes(
                  existingQuestion.id
                )
              ) {
                continue;
              }

              const responseCount =
                await tx.response.count({
                  where: {
                    questionId:
                      existingQuestion.id,
                  },
                });

              if (responseCount > 0) {
                /*
                |--------------------------------------------------------------------------
                | We cannot safely delete a question that
                | already has responses because the Prisma
                | schema cascades question deletion into
                | responses.
                |
                | There is no isActive field on questions,
                | so preserve the question.
                |--------------------------------------------------------------------------
                */

                continue;
              }

              await tx.pollQuestion.delete({
                where: {
                  id:
                    existingQuestion.id,
                },
              });
            }

            /*
            |--------------------------------------------------------------------------
            | RETURN COMPLETE POLL
            |--------------------------------------------------------------------------
            */

            return tx.poll.findUnique({
              where: {
                id: pollId,
              },

              include: {
                position: true,
                campaign: true,

                targetCounty: true,
                targetConstituency: true,
                targetWard: true,

                questions: {
                  orderBy: {
                    order: "asc",
                  },

                  include: {
                    options: {
                      orderBy: {
                        order: "asc",
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
              },
            });
          }
        );

      return res.json({
        success: true,
        message:
          "Poll updated successfully",
        data: updatedPoll,
      });
    } catch (error) {
      console.error(
        "Dedicated poll edit error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update poll",
      });
    }
  }
);

export default router;