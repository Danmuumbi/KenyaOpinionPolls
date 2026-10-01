// import { prisma } from "../config/database";
import { prisma } from "../config/database";
import type { PollType, PollStatus } from "../generated/prisma/enums";
// import type { Prisma, PollType, PollStatus } from "../generated/prisma";

export interface StatisticsFilters {
  pollId?: string;
  pollType?: PollType;
  pollStatus?: PollStatus;

  positionId?: string;
  candidateId?: string;
  campaignId?: string;

  countyId?: string;
  constituencyId?: string;
  wardId?: string;

  from?: string;
  to?: string;
}

function buildWhere(filters: StatisticsFilters) {
  const {
    pollId,
    pollType,
    pollStatus,
    positionId,
    candidateId,
    campaignId,
    countyId,
    constituencyId,
    wardId,
    from,
    to,
  } = filters;

  const createdAt: any = {};

  if (from) {
    const date = new Date(from);

    if (!Number.isNaN(date.getTime())) {
      createdAt.gte = date;
    }
  }

  if (to) {
    const date = new Date(to);

    if (!Number.isNaN(date.getTime())) {
      date.setHours(23, 59, 59, 999);
      createdAt.lte = date;
    }
  }

  return {
    ...(pollId && {
      pollId,
    }),

    ...((pollType ||
      pollStatus ||
      positionId ||
      campaignId) && {
      poll: {
        ...(pollType && {
          type: pollType,
        }),

        ...(pollStatus && {
          status: pollStatus,
        }),

        ...(positionId && {
          positionId,
        }),

        ...(campaignId && {
          campaignId,
        }),
      },
    }),

    ...(candidateId && {
      option: {
        candidateId,
      },
    }),

    ...(countyId && {
      countyId,
    }),

    ...(constituencyId && {
      constituencyId,
    }),

    ...(wardId && {
      wardId,
    }),

    ...(Object.keys(createdAt).length > 0 && {
      createdAt,
    }),
  };
}


/*
|--------------------------------------------------------------------------
| FILTER OPTIONS
|--------------------------------------------------------------------------
*/

export async function getStatisticsFilterOptions() {
  const [
    polls,
    positions,
    campaigns,
    counties,
    constituencies,
    wards,
    candidates,
  ] = await Promise.all([
    prisma.poll.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        status: true,

        position: {
          select: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.position.findMany({
      where: {
        isActive: true,
      },

      select: {
        id: true,
        name: true,
        scope: true,
      },

      orderBy: {
        name: "asc",
      },
    }),

    prisma.campaign.findMany({
      where: {
        isActive: true,
      },

      select: {
        id: true,
        name: true,
        organization: true,
      },

      orderBy: {
        name: "asc",
      },
    }),

    prisma.county.findMany({
      select: {
        id: true,
        code: true,
        name: true,
      },

      orderBy: {
        name: "asc",
      },
    }),

    prisma.constituency.findMany({
      select: {
        id: true,
        code: true,
        name: true,

        county: {
          select: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: {
        name: "asc",
      },
    }),

    prisma.ward.findMany({
      select: {
        id: true,
        code: true,
        name: true,

        constituency: {
          select: {
            id: true,
            name: true,

            county: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },

      orderBy: {
        name: "asc",
      },
    }),

    prisma.candidate.findMany({
      where: {
        isActive: true,
      },

      select: {
        id: true,
        name: true,
        party: true,

        position: {
          select: {
            id: true,
            name: true,
          },
        },

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

      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return {
    polls,
    positions,
    campaigns,
    counties,
    constituencies,
    wards,
    candidates,
  };
}


/*
|--------------------------------------------------------------------------
| MAIN STATISTICS
|--------------------------------------------------------------------------
*/

export async function getAdminStatistics(
  filters: StatisticsFilters = {}
) {
  const responses =
    await prisma.response.findMany({
      where: buildWhere(filters),

      include: {
        poll: {
          include: {
            position: true,
            campaign: true,

            targetCounty: true,
            targetConstituency: true,
            targetWard: true,
          },
        },

        question: true,

        option: {
          include: {
            candidate: {
              include: {
                position: true,
                county: true,
                constituency: true,
                ward: true,
              },
            },
          },
        },

        participant: true,
        county: true,
        constituency: true,
        ward: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });


  /*
  |--------------------------------------------------------------------------
  | BASIC COUNTS
  |--------------------------------------------------------------------------
  */

  const participantIds =
    new Set(
      responses.map(
        (r) => r.participantId
      )
    );

  const pollIds =
    new Set(
      responses.map(
        (r) => r.pollId
      )
    );

  const questionIds =
    new Set(
      responses.map(
        (r) => r.questionId
      )
    );

  const countyIds =
    new Set(
      responses
        .map((r) => r.countyId)
        .filter(Boolean)
    );

  const constituencyIds =
    new Set(
      responses
        .map(
          (r) => r.constituencyId
        )
        .filter(Boolean)
    );

  const wardIds =
    new Set(
      responses
        .map((r) => r.wardId)
        .filter(Boolean)
    );


  /*
  |--------------------------------------------------------------------------
  | POLLS
  |--------------------------------------------------------------------------
  */

  const pollMap =
    new Map<string, any>();

  for (const response of responses) {
    if (
      !pollMap.has(response.pollId)
    ) {
      pollMap.set(
        response.pollId,
        {
          id: response.poll.id,

          title:
            response.poll.title,

          type:
            response.poll.type,

          status:
            response.poll.status,

          position:
            response.poll.position,

          campaign:
            response.poll.campaign,

          target: {
            county:
              response.poll
                .targetCounty,

            constituency:
              response.poll
                .targetConstituency,

            ward:
              response.poll
                .targetWard,
          },

          responses: 0,

          participants:
            new Set<string>(),

          firstResponse:
            response.createdAt,

          latestResponse:
            response.createdAt,
        }
      );
    }

    const poll =
      pollMap.get(
        response.pollId
      );

    poll.responses++;

    poll.participants.add(
      response.participantId
    );

    if (
      response.createdAt <
      poll.firstResponse
    ) {
      poll.firstResponse =
        response.createdAt;
    }

    if (
      response.createdAt >
      poll.latestResponse
    ) {
      poll.latestResponse =
        response.createdAt;
    }
  }

  const polls =
    Array.from(
      pollMap.values()
    ).map((poll) => ({
      ...poll,

      participants:
        poll.participants.size,
    }));


  /*
  |--------------------------------------------------------------------------
  | QUESTIONS
  |--------------------------------------------------------------------------
  */

  const questionMap =
    new Map<string, any>();

  for (const response of responses) {
    if (
      !questionMap.has(
        response.questionId
      )
    ) {
      questionMap.set(
        response.questionId,
        {
          id:
            response.question.id,

          pollId:
            response.pollId,

          pollTitle:
            response.poll.title,

          question:
            response.question.question,

          description:
            response.question
              .description,

          order:
            response.question.order,

          totalResponses: 0,

          options:
            new Map<string, any>(),
        }
      );
    }

    const question =
      questionMap.get(
        response.questionId
      );

    question.totalResponses++;

    if (
      !question.options.has(
        response.optionId
      )
    ) {
      question.options.set(
        response.optionId,
        {
          id:
            response.option.id,

          label:
            response.option.label,

          value:
            response.option.value,

          candidate:
            response.option
              .candidate,

          responses: 0,
        }
      );
    }

    question.options.get(
      response.optionId
    ).responses++;
  }

  const questions =
    Array.from(
      questionMap.values()
    ).map((question) => ({
      ...question,

      options:
        Array.from(
          question.options.values()
        )
          .map(
            (option: any) => ({
              ...option,

              percentage:
                question.totalResponses >
                0
                  ? Number(
                      (
                        (option.responses /
                          question.totalResponses) *
                        100
                      ).toFixed(2)
                    )
                  : 0,
            })
          )
          .sort(
            (a: any, b: any) =>
              b.responses -
              a.responses
          ),
    }));


  /*
  |--------------------------------------------------------------------------
  | CANDIDATES
  |--------------------------------------------------------------------------
  */

  const candidateMap =
    new Map<string, any>();

  for (const response of responses) {
    const candidate =
      response.option.candidate;

    if (!candidate) {
      continue;
    }

    if (
      !candidateMap.has(
        candidate.id
      )
    ) {
      candidateMap.set(
        candidate.id,
        {
          id: candidate.id,

          name:
            candidate.name,

          party:
            candidate.party,

          position:
            candidate.position,

          county:
            candidate.county,

          constituency:
            candidate.constituency,

          ward:
            candidate.ward,

          responses: 0,
        }
      );
    }

    candidateMap.get(
      candidate.id
    ).responses++;
  }

  const candidates =
    Array.from(
      candidateMap.values()
    );


  /*
  |--------------------------------------------------------------------------
  | GEOGRAPHY
  |--------------------------------------------------------------------------
  */

  function buildGeography(
    key:
      | "county"
      | "constituency"
      | "ward"
  ) {
    const map =
      new Map<string, any>();

    for (const response of responses) {
      const location =
        response[key];

      if (!location) {
        continue;
      }

      if (
        !map.has(location.id)
      ) {
        map.set(
          location.id,
          {
            id: location.id,
            name: location.name,
            responses: 0,
            participants:
              new Set<string>(),
          }
        );
      }

      const item =
        map.get(location.id);

      item.responses++;

      item.participants.add(
        response.participantId
      );
    }

    const total =
      responses.length;

    return Array.from(
      map.values()
    )
      .map((item) => ({
        id: item.id,
        name: item.name,

        responses:
          item.responses,

        participants:
          item.participants.size,

        percentage:
          total > 0
            ? Number(
                (
                  (item.responses /
                    total) *
                  100
                ).toFixed(2)
              )
            : 0,
      }))
      .sort(
        (a, b) =>
          b.responses -
          a.responses
      );
  }


  /*
  |--------------------------------------------------------------------------
  | RETURN
  |--------------------------------------------------------------------------
  */

  return {
    filters,

    overview: {
      totalResponses:
        responses.length,

      uniqueParticipants:
        participantIds.size,

      polls:
        pollIds.size,

      questions:
        questionIds.size,

      counties:
        countyIds.size,

      constituencies:
        constituencyIds.size,

      wards:
        wardIds.size,

      latestResponse:
        responses.length
          ? responses[0]
              .createdAt
          : null,

      oldestResponse:
        responses.length
          ? responses[
              responses.length - 1
            ].createdAt
          : null,
    },

    polls,

    questions,

    candidates,

    geography: {
      counties:
        buildGeography(
          "county"
        ),

      constituencies:
        buildGeography(
          "constituency"
        ),

      wards:
        buildGeography("ward"),
    },
  };
}