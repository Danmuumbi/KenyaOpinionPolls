import { Router } from "express";

import {
  requireAuth,
} from "../middleware/auth.middleware";

import {
  requireRoles,
} from "../middleware/role.middleware";

import {
  getAdminStatistics,
  getStatisticsFilterOptions,
} from "../services/statistics.service";

import { prisma } from "../config/database";


// --------------------------------------------------------------------------
// ROUTER
// --------------------------------------------------------------------------

const router = Router();


// --------------------------------------------------------------------------
// ADMIN AUTHORIZATION
// --------------------------------------------------------------------------

router.use(
  requireAuth
);

router.use(
  requireRoles(
    "SUPER_ADMIN",
    "ADMIN"
  )
);


// --------------------------------------------------------------------------
// FILTER OPTIONS
// --------------------------------------------------------------------------

router.get(
  "/filters",
  async (
    req,
    res
  ) => {

    try {

      const filters =
        await getStatisticsFilterOptions();

      return res.json({
        success: true,
        data: filters,
      });

    } catch (error) {

      console.error(
        "Statistics filters error:",
        error
      );

      return res.status(
        500
      ).json({
        success: false,
        message:
          "Failed to load statistics filters",
      });

    }

  }
);


// --------------------------------------------------------------------------
// STATISTICS
// --------------------------------------------------------------------------

router.get(
  "/",
  async (
    req,
    res
  ) => {

    try {

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
      } = req.query;


      const statistics =
        await getAdminStatistics({

          pollId:
            typeof pollId === "string"
              ? pollId
              : undefined,

          pollType:
            typeof pollType === "string"
              ? pollType
              : undefined,

          pollStatus:
            typeof pollStatus === "string"
              ? pollStatus
              : undefined,

          positionId:
            typeof positionId === "string"
              ? positionId
              : undefined,

          candidateId:
            typeof candidateId === "string"
              ? candidateId
              : undefined,

          campaignId:
            typeof campaignId === "string"
              ? campaignId
              : undefined,

          countyId:
            typeof countyId === "string"
              ? countyId
              : undefined,

          constituencyId:
            typeof constituencyId === "string"
              ? constituencyId
              : undefined,

          wardId:
            typeof wardId === "string"
              ? wardId
              : undefined,

          from:
            typeof from === "string"
              ? from
              : undefined,

          to:
            typeof to === "string"
              ? to
              : undefined,

        });


      return res.json({
        success: true,
        data: statistics,
      });

    } catch (error) {

      console.error(
        "Statistics error:",
        error
      );

      return res.status(
        500
      ).json({
        success: false,
        message:
          "Failed to generate statistics",
      });

    }

  }
);


// --------------------------------------------------------------------------
// FILTER HELPER
// --------------------------------------------------------------------------

function parseFilters(
  query: Record<string, unknown>
) {

  return {

    pollId:
      typeof query.pollId === "string"
        ? query.pollId
        : undefined,

    pollType:
      typeof query.pollType === "string"
        ? query.pollType
        : undefined,

    pollStatus:
      typeof query.pollStatus === "string"
        ? query.pollStatus
        : undefined,

    positionId:
      typeof query.positionId === "string"
        ? query.positionId
        : undefined,

    candidateId:
      typeof query.candidateId === "string"
        ? query.candidateId
        : undefined,

    campaignId:
      typeof query.campaignId === "string"
        ? query.campaignId
        : undefined,

    countyId:
      typeof query.countyId === "string"
        ? query.countyId
        : undefined,

    constituencyId:
      typeof query.constituencyId === "string"
        ? query.constituencyId
        : undefined,

    wardId:
      typeof query.wardId === "string"
        ? query.wardId
        : undefined,

    from:
      typeof query.from === "string"
        ? query.from
        : undefined,

    to:
      typeof query.to === "string"
        ? query.to
        : undefined,

  };

}


// --------------------------------------------------------------------------
// BUILD RESPONSE FILTER
// --------------------------------------------------------------------------
//
// IMPORTANT:
// candidateId is intentionally NOT applied directly to response.option.
//
// When an administrator selects a candidate, the export should still show
// the candidate's opponents in the same contest.
//
// The candidate is therefore resolved to its relevant poll(s) later in the
// export functions.
// --------------------------------------------------------------------------

function buildResponseWhere(
  filters: ReturnType<typeof parseFilters>
) {

  const where: any = {};


  // ------------------------------------------------------------------------
  // POLL
  // ------------------------------------------------------------------------

  if (
    filters.pollId
  ) {

    where.pollId =
      filters.pollId;

  }


  // ------------------------------------------------------------------------
  // GEOGRAPHY
  // ------------------------------------------------------------------------

  if (
    filters.countyId
  ) {

    where.countyId =
      filters.countyId;

  }


  if (
    filters.constituencyId
  ) {

    where.constituencyId =
      filters.constituencyId;

  }


  if (
    filters.wardId
  ) {

    where.wardId =
      filters.wardId;

  }


  // ------------------------------------------------------------------------
  // POLL-LEVEL FILTERS
  // ------------------------------------------------------------------------

  if (
    filters.pollType ||
    filters.pollStatus ||
    filters.positionId ||
    filters.campaignId
  ) {

    where.poll = {};


    if (
      filters.pollType
    ) {

      where.poll.type =
        filters.pollType;

    }


    if (
      filters.pollStatus
    ) {

      where.poll.status =
        filters.pollStatus;

    }


    if (
      filters.positionId
    ) {

      where.poll.positionId =
        filters.positionId;

    }


    if (
      filters.campaignId
    ) {

      where.poll.campaignId =
        filters.campaignId;

    }

  }


  // ------------------------------------------------------------------------
  // DATE RANGE
  // ------------------------------------------------------------------------

  if (
    filters.from ||
    filters.to
  ) {

    where.createdAt = {};


    if (
      filters.from
    ) {

      where.createdAt.gte =
        new Date(
          `${filters.from}T00:00:00`
        );

    }


    if (
      filters.to
    ) {

      where.createdAt.lte =
        new Date(
          `${filters.to}T23:59:59.999`
        );

    }

  }


  return where;

}


// --------------------------------------------------------------------------
// CSV ESCAPE
// --------------------------------------------------------------------------

function csvEscape(
  value: unknown
): string {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return `"${String(value)
    .replace(
      /"/g,
      '""'
    )
    .replace(
      /\r?\n/g,
      " "
    )}"`;

}


// --------------------------------------------------------------------------
// RESOLVE CANDIDATE CONTEXT
// --------------------------------------------------------------------------
//
// If candidateId is supplied, identify the polls in which that candidate
// appears. This lets the export show the complete contest rather than only
// the selected candidate.
// --------------------------------------------------------------------------

async function resolveCandidatePollIds(
  candidateId?: string
): Promise<string[]> {

  if (!candidateId) {

    return [];

  }


  const options =
    await prisma.pollOption.findMany({

      where: {

        candidateId,

      },

      select: {

        question: {

          select: {

            pollId: true,

          },

        },

      },

    });


  return Array.from(
    new Set(
      options.map(
        option =>
          option.question.pollId
      )
    )
  );

}


// --------------------------------------------------------------------------
// BUILD EXPORT WHERE
// --------------------------------------------------------------------------

async function buildExportWhere(
  filters: ReturnType<typeof parseFilters>
) {

  const where =
    buildResponseWhere(
      filters
    );


  // ------------------------------------------------------------------------
  // CANDIDATE CONTEXT
  // ------------------------------------------------------------------------
  //
  // Do NOT restrict option.candidateId here.
  //
  // Instead, identify the relevant poll(s), then export all candidates in
  // those contests.
  // ------------------------------------------------------------------------

  if (
    filters.candidateId
  ) {

    const candidatePollIds =
      await resolveCandidatePollIds(
        filters.candidateId
      );


    if (
      candidatePollIds.length === 0
    ) {

      where.pollId =
        "__NO_MATCHING_POLL__";

    } else {

      if (
        filters.pollId
      ) {

        if (
          candidatePollIds.includes(
            filters.pollId
          )
        ) {

          where.pollId =
            filters.pollId;

        } else {

          where.pollId =
            "__NO_MATCHING_POLL__";

        }

      } else {

        where.pollId = {

          in:
            candidatePollIds,

        };

      }

    }

  }


  return where;

}


// --------------------------------------------------------------------------
// ANALYTICS TYPES
// --------------------------------------------------------------------------

interface CandidateResult {
  candidateId: string | null;
  candidateName: string;
  party: string;
  position: string;
  poll: string;
  question: string;
  responses: number;
  percentage: number;

  pollId: string;
  questionId: string;

  targetCounty: string;
  targetConstituency: string;
  targetWard: string;
}

interface QuestionResult {
  questionId: string;
  poll: string;
  question: string;
  responses: number;
}

interface GeographyResult {
  name: string;
  responses: number;
  participants: number;
  percentage: number;
}


// --------------------------------------------------------------------------
// BUILD CANDIDATE RESULTS
// --------------------------------------------------------------------------
//
// Includes candidates with ZERO responses.
//
// This is important because an administrator should see the entire contest,
// not only candidates who received votes.
// --------------------------------------------------------------------------

async function buildCandidateResults(
  responses: any[],
  where: any
): Promise<CandidateResult[]> {

  const pollIds =
    Array.from(
      new Set(
        responses.map(
          response =>
            response.pollId
        )
      )
    );


  if (
    pollIds.length === 0
  ) {

    return [];

  }


  const questions =
    await prisma.pollQuestion.findMany({

      where: {

        pollId: {

          in:
            pollIds,

        },

      },

      include: {

        poll: {

          include: {

            position: true,

          },

        },

        options: {

          where: {

            isActive: true,

          },

          include: {

            candidate: {

              include: {

                position: true,

              },

            },

          },

          orderBy: {

            order: "asc",

          },

        },

      },

      orderBy: {

        order: "asc",

      },

    });


  const responseCounts =
    new Map<string, number>();


  const responseTotals =
    new Map<string, number>();


  for (
    const response of responses
  ) {

    const questionId =
      response.questionId;


    responseTotals.set(
      questionId,
      (
        responseTotals.get(
          questionId
        ) ?? 0
      ) + 1
    );


    if (
      response.option.candidateId
    ) {

      const key =
        `${questionId}:${response.option.candidateId}`;


      responseCounts.set(
        key,
        (
          responseCounts.get(
            key
          ) ?? 0
        ) + 1
      );

    }

  }


  const results:
    CandidateResult[] = [];


  for (
    const question of questions
  ) {

    const total =
      responseTotals.get(
        question.id
      ) ?? 0;


    for (
      const option of question.options
    ) {

      // Only candidate-backed options belong in the candidate comparison.
      if (
        !option.candidate
      ) {

        continue;

      }


      const candidate =
        option.candidate;


      const key =
        `${question.id}:${candidate.id}`;


      const count =
        responseCounts.get(
          key
        ) ?? 0;


      const percentage =
        total > 0
          ? Number(
              (
                count /
                total
              * 100
              ).toFixed(2)
            )
          : 0;


      results.push({

        candidateId:
          candidate.id,

        candidateName:
          candidate.name,

        party:
          candidate.party
            ?? "",

        position:
          candidate.position?.name
            ?? question.poll.position?.name
            ?? "",

        poll:
          question.poll.title,

        question:
          question.question,

        responses:
          count,

        percentage,

      });

    }

  }


  return results;

}


// --------------------------------------------------------------------------
// BUILD QUESTION RESULTS
// --------------------------------------------------------------------------

function buildQuestionResults(
  responses: any[]
): QuestionResult[] {

  const map =
    new Map<
      string,
      QuestionResult
    >();


  for (
    const response of responses
  ) {

    const existing =
      map.get(
        response.questionId
      );


    if (
      existing
    ) {

      existing.responses += 1;

    } else {

      map.set(
        response.questionId,
        {

          questionId:
            response.questionId,

          poll:
            response.poll.title,

          question:
            response.question.question,

          responses:
            1,

        }
      );

    }

  }


  return Array.from(
    map.values()
  );

}


// --------------------------------------------------------------------------
// BUILD GEOGRAPHY RESULTS
// --------------------------------------------------------------------------

function buildGeographyResults(
  responses: any[],
  type:
    | "county"
    | "constituency"
    | "ward"
): GeographyResult[] {

  const groups =
    new Map<
      string,
      {
        name: string;
        responses: number;
        participants: Set<string>;
      }
    >();


  for (
    const response of responses
  ) {

    let id: string | null =
      null;

    let name =
      "N/A";


    if (
      type === "county"
    ) {

      id =
        response.countyId;

      name =
        response.county?.name
          ?? "N/A";

    }


    if (
      type === "constituency"
    ) {

      id =
        response.constituencyId;

      name =
        response.constituency?.name
          ?? "N/A";

    }


    if (
      type === "ward"
    ) {

      id =
        response.wardId;

      name =
        response.ward?.name
          ?? "N/A";

    }


    const key =
      id ?? `unknown-${name}`;


    const existing =
      groups.get(
        key
      );


    if (
      existing
    ) {

      existing.responses += 1;

      existing.participants.add(
        response.participantId
      );

    } else {

      groups.set(
        key,
        {

          name,

          responses: 1,

          participants:
            new Set([
              response.participantId,
            ]),

        }
      );

    }

  }


  const total =
    responses.length;


  return Array.from(
    groups.values()
  )
    .map(
      group => ({

        name:
          group.name,

        responses:
          group.responses,

        participants:
          group.participants.size,

        percentage:
          total > 0
            ? Number(
                (
                  group.responses /
                  total *
                  100
                ).toFixed(2)
              )
            : 0,

      })
    )
    .sort(
      (
        a,
        b
      ) =>
        b.responses -
        a.responses
    );

}


// --------------------------------------------------------------------------
// CSV EXPORT
// --------------------------------------------------------------------------

router.get(
  "/export/csv",
  async (
    req,
    res
  ) => {

    try {

      const filters =
        parseFilters(
          req.query as Record<
            string,
            unknown
          >
        );


      const where =
        await buildExportWhere(
          filters
        );


      const responses =
        await prisma.response.findMany({

          where,

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


            county: true,

            constituency: true,

            ward: true,

          },


          orderBy: {

            createdAt: "asc",

          },

        });


      // ---------------------------------------------------------------------
      // ANALYTICS
      // ---------------------------------------------------------------------

      const candidateResults =
        await buildCandidateResults(
          responses,
          where
        );


      const questionResults =
        buildQuestionResults(
          responses
        );


      const countyResults =
        buildGeographyResults(
          responses,
          "county"
        );


      const constituencyResults =
        buildGeographyResults(
          responses,
          "constituency"
        );


      const wardResults =
        buildGeographyResults(
          responses,
          "ward"
        );


      const uniqueParticipants =
        new Set(
          responses.map(
            response =>
              response.participantId
          )
        ).size;


      const uniquePolls =
        new Set(
          responses.map(
            response =>
              response.pollId
          )
        ).size;


      const uniqueQuestions =
        new Set(
          responses.map(
            response =>
              response.questionId
          )
        ).size;


      const uniqueCounties =
        new Set(
          responses
            .map(
              response =>
                response.countyId
            )
            .filter(
              Boolean
            )
        ).size;


      const uniqueConstituencies =
        new Set(
          responses
            .map(
              response =>
                response.constituencyId
            )
            .filter(
              Boolean
            )
        ).size;


      const uniqueWards =
        new Set(
          responses
            .map(
              response =>
                response.wardId
            )
            .filter(
              Boolean
            )
        ).size;


      // ---------------------------------------------------------------------
      // CSV COLUMNS
      // ---------------------------------------------------------------------

      const header = [

        "Record Type",

        "Poll",

        "Poll Type",

        "Poll Status",

        "Position",

        "Campaign",

        "Question",

        "Candidate",

        "Party",

        "Responses",

        "Percentage",

        "Geography Level",

        "Geography",

        "Participants",

        "Selected Option",

        "Response County",

        "Response Constituency",

        "Response Ward",

        "Poll Target County",

        "Poll Target Constituency",

        "Poll Target Ward",

        "Participant ID",

        "Response ID",

        "Response Date",

        "IP Hash",

        "User Agent Hash",

      ];


      const rows: unknown[][] = [];


      // ---------------------------------------------------------------------
      // OVERVIEW RECORD
      // ---------------------------------------------------------------------

      rows.push([

        "OVERVIEW",

        "",

        "",

        "",

        "",

        "",

        "",

        "",

        "",

        responses.length,

        100,

        "",

        "",

        uniqueParticipants,

        "",

        "",

        "",

        "",

        "",

        "",

        "",

        "",

        "",

        "",

        "",

        "",

      ]);


      // ---------------------------------------------------------------------
      // CANDIDATE RESULTS
      // ---------------------------------------------------------------------

      for (
        const result of candidateResults
      ) {

        rows.push([

          "CANDIDATE_RESULT",

          result.poll,

          "",

          "",

          result.position,

          "",

          result.question,

          result.candidateName,

          result.party,

          result.responses,

          result.percentage,

          "",

          "",

          "",

          "",

          "",

          "",

          "",

          "",

          "",

          "",

          "",

          "",

          "",

          "",

          "",

        ]);

      }


      // ---------------------------------------------------------------------
      // QUESTION RESULTS
      // ---------------------------------------------------------------------

      for (
        const result of questionResults
      ) {

        const percentage =
          responses.length > 0
            ? Number(
                (
                  result.responses /
                  responses.length *
                  100
                ).toFixed(2)
              )
            : 0;


        rows.push([

          "QUESTION_RESULT",

          result.poll,

          "",

          "",

          "",

          "",

          result.question,

          "",

          "",

          result.responses,

          percentage,

          "",

          "",

          "",

          "",

          "",

          "",

          "",

          "",

          "",

          "",

          "",

          "",

          "",

          "",

          "",

        ]);

      }


      // ---------------------------------------------------------------------
      // GEOGRAPHY RESULTS
      // ---------------------------------------------------------------------

      const geographyGroups = [

        [
          "COUNTY",
          countyResults,
        ],

        [
          "CONSTITUENCY",
          constituencyResults,
        ],

        [
          "WARD",
          wardResults,
        ],

      ] as const;


      for (
        const [
          level,
          results,
        ] of geographyGroups
      ) {

        for (
          const result of results
        ) {

          rows.push([

            "GEOGRAPHY_RESULT",

            "",

            "",

            "",

            "",

            "",

            "",

            "",

            "",

            result.responses,

            result.percentage,

            level,

            result.name,

            result.participants,

            "",

            "",

            "",

            "",

            "",

            "",

            "",

            "",

            "",

            "",

            "",

            "",

          ]);

        }

      }


      // ---------------------------------------------------------------------
      // INDIVIDUAL RESPONSES
      // ---------------------------------------------------------------------

      for (
        const response of responses
      ) {

        const candidate =
          response.option
            .candidate;


        rows.push([

          "RESPONSE",

          response.poll.title,

          response.poll.type,

          response.poll.status,

          response.poll.position?.name
            ?? "",

          response.poll.campaign?.name
            ?? "",

          response.question.question,

          candidate?.name
            ?? "",

          candidate?.party
            ?? "",

          1,

          "",

          "",

          "",

          "",

          response.option.label,

          response.county?.name
            ?? "",

          response.constituency?.name
            ?? "",

          response.ward?.name
            ?? "",

          response.poll.targetCounty?.name
            ?? "",

          response.poll.targetConstituency?.name
            ?? "",

          response.poll.targetWard?.name
            ?? "",

          response.participantId,

          response.id,

          response.createdAt.toISOString(),

          response.ipHash
            ?? "",

          response.userAgentHash
            ?? "",

        ]);

      }


      // ---------------------------------------------------------------------
      // BUILD CSV
      // ---------------------------------------------------------------------

      const csvContent = [

        header
          .map(
            csvEscape
          )
          .join(","),

        ...rows.map(
          row =>
            row
              .map(
                csvEscape
              )
              .join(",")
        ),

      ].join("\n");


      // ---------------------------------------------------------------------
      // FILENAME
      // ---------------------------------------------------------------------

      const filename =
        `kenya-opinion-polls-${new Date()
          .toISOString()
          .slice(
            0,
            10
          )}.csv`;


      res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
      );


      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );


      return res
        .status(200)
        .send(csvContent);

    } catch (error) {

      console.error(
        "CSV export error:",
        error
      );


      return res.status(
        500
      ).json({

        success: false,

        message:
          "Failed to generate CSV export",

      });

    }

  }
);

// --------------------------------------------------------------------------
// PDF EXPORT
// --------------------------------------------------------------------------

router.get(
  "/export/pdf",
  async (req, res) => {
    try {
      // --------------------------------------------------------------------
      // FILTERS
      // --------------------------------------------------------------------

      const filters = parseFilters(
        req.query as Record<string, unknown>
      );

      const where = await buildExportWhere(filters);

      // --------------------------------------------------------------------
      // RESPONSES
      // --------------------------------------------------------------------

      const responses = await prisma.response.findMany({
        where,

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
                },
              },
            },
          },

          county: true,
          constituency: true,
          ward: true,
        },

        orderBy: {
          createdAt: "asc",
        },
      });

      // --------------------------------------------------------------------
      // ANALYTICS
      // --------------------------------------------------------------------

      const candidateResults =
        await buildCandidateResults(
          responses,
          where
        );

      const questionResults =
        buildQuestionResults(
          responses
        );

      const countyResults =
        buildGeographyResults(
          responses,
          "county"
        );

      const constituencyResults =
        buildGeographyResults(
          responses,
          "constituency"
        );

      const wardResults =
        buildGeographyResults(
          responses,
          "ward"
        );

      // --------------------------------------------------------------------
      // OVERVIEW
      // --------------------------------------------------------------------

      const uniqueParticipants =
        new Set(
          responses.map(
            response =>
              response.participantId
          )
        ).size;

      const uniquePolls =
        new Set(
          responses.map(
            response =>
              response.pollId
          )
        ).size;

      const uniqueQuestions =
        new Set(
          responses.map(
            response =>
              response.questionId
          )
        ).size;

      const uniqueCounties =
        new Set(
          responses
            .map(
              response =>
                response.countyId
            )
            .filter(Boolean)
        ).size;

      const uniqueConstituencies =
        new Set(
          responses
            .map(
              response =>
                response.constituencyId
            )
            .filter(Boolean)
        ).size;

      const uniqueWards =
        new Set(
          responses
            .map(
              response =>
                response.wardId
            )
            .filter(Boolean)
        ).size;

      // --------------------------------------------------------------------
      // DATE RANGE
      // --------------------------------------------------------------------

      const oldestResponse =
        responses.length > 0
          ? responses[0].createdAt
          : null;

      const latestResponse =
        responses.length > 0
          ? responses[
              responses.length - 1
            ].createdAt
          : null;

      // --------------------------------------------------------------------
      // POLL SUMMARY
      // --------------------------------------------------------------------

      interface PollSummary {
        id: string;
        title: string;
        type: string;
        status: string;
        position: string;
        campaign: string;
        county: string;
        constituency: string;
        ward: string;
        responses: number;
        participants: number;
      }

      const pollMap =
        new Map<string, PollSummary>();

      for (
        const response of responses
      ) {
        const poll =
          response.poll;

        const existing =
          pollMap.get(
            poll.id
          );

        if (existing) {
          existing.responses += 1;
        } else {
          pollMap.set(
            poll.id,
            {
              id:
                poll.id,

              title:
                poll.title,

              type:
                poll.type,

              status:
                poll.status,

              position:
                poll.position?.name
                  ?? "General",

              campaign:
                poll.campaign?.name
                  ?? "",

              county:
                poll.targetCounty?.name
                  ?? "",

              constituency:
                poll.targetConstituency?.name
                  ?? "",

              ward:
                poll.targetWard?.name
                  ?? "",

              responses:
                1,

              participants:
                0,
            }
          );
        }
      }

      for (
        const poll of pollMap.values()
      ) {
        const participantIds =
          new Set(
            responses
              .filter(
                response =>
                  response.pollId ===
                  poll.id
              )
              .map(
                response =>
                  response.participantId
              )
          );

        poll.participants =
          participantIds.size;
      }

      const pollSummaries =
        Array.from(
          pollMap.values()
        );

      // --------------------------------------------------------------------
      // PDFKIT
      // --------------------------------------------------------------------

      const PDFDocument =
        require("pdfkit");

      const doc =
        new PDFDocument({
          size: "A4",
          margin: 48,
          bufferPages: true,
          autoFirstPage: true,

          info: {
            Title:
              "SFD Insights — Opinion Poll Statistics Report",

            Author:
              "SFD Insights",

            Subject:
              "Recorded public opinion polling statistics",

            Keywords:
              "SFD Insights, Kenya, opinion polls, statistics",
          },
        });

      const today =
        new Date();

      const dateStamp =
        today
          .toISOString()
          .slice(0, 10);

      const filename =
        `sfd-insights-statistics-report-${dateStamp}.pdf`;

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      doc.pipe(res);

      // --------------------------------------------------------------------
      // DESIGN SYSTEM
      // --------------------------------------------------------------------

      const COLORS = {
        blue: "#2563eb",
        darkBlue: "#1d4ed8",
        orange: "#f59e0b",
        ink: "#172033",
        muted: "#64748b",
        light: "#f7f9fc",
        border: "#dfe5ed",
        white: "#ffffff",
        green: "#15803d",
      };

      const PAGE_WIDTH =
        595.28;

      const PAGE_HEIGHT =
        841.89;

      const LEFT =
        48;

      const RIGHT =
        PAGE_WIDTH - 48;

      const CONTENT_WIDTH =
        RIGHT - LEFT;

      const TOP =
        72;

      /*
       * Keep all content safely above the footer.
       *
       * IMPORTANT:
       * Footer content is positioned absolutely and never participates
       * in PDFKit's normal text flow.
       */

      const FOOTER_LINE_Y =
        776;

      const FOOTER_TEXT_Y =
        785;

      const BOTTOM =
        758;

      // --------------------------------------------------------------------
      // BASIC HELPERS
      // --------------------------------------------------------------------

      const formatNumber =
        (value: number) =>
          value.toLocaleString(
            "en-US"
          );

      const formatDate =
        (value: Date | null) => {
          if (!value) {
            return "Not available";
          }

          return value.toLocaleDateString(
            "en-KE",
            {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }
          );
        };

      const formatDateTime =
        (value: Date | null) => {
          if (!value) {
            return "Not available";
          }

          return value.toLocaleString(
            "en-KE",
            {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }
          );
        };

      const cleanText =
        (
          value: unknown,
          fallback = "—"
        ) => {
          if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
          ) {
            return fallback;
          }

          return String(value);
        };

      const truncate =
        (
          value: unknown,
          max = 65
        ) => {
          const text =
            cleanText(
              value,
              ""
            );

          if (
            text.length <= max
          ) {
            return text;
          }

          return (
            text.slice(
              0,
              max - 1
            ) + "…"
          );
        };

      // --------------------------------------------------------------------
      // CONTEST SCOPE
      // --------------------------------------------------------------------

      /*
       * IMPORTANT:
       *
       * Contest geography comes directly from CandidateResult.
       *
       * We DO NOT search the responses array using:
       *
       *     poll.title
       *     question.text
       *
       * because titles/questions are not unique identifiers.
       *
       * This guarantees that:
       *
       * Muvau Kikuumini MCA
       *     remains Muvau Kikuumini.
       *
       * Makueni Governor
       *     remains Makueni County.
       *
       * Nairobi Governor
       *     remains Nairobi County.
       */

      const getCandidateScope =
        (
          result: CandidateResult
        ) => {
          const parts: string[] = [];

          if (
            result.targetWard
          ) {
            parts.push(
              `Ward: ${result.targetWard}`
            );
          }

          if (
            result.targetConstituency
          ) {
            parts.push(
              `Constituency: ${result.targetConstituency}`
            );
          }

          if (
            result.targetCounty
          ) {
            parts.push(
              `County: ${result.targetCounty}`
            );
          }

          if (
            parts.length === 0
          ) {
            return "National / no geographic target";
          }

          return parts.join(
            "  •  "
          );
        };

      const getCandidateScopeLevel =
        (
          result: CandidateResult
        ) => {
          if (
            result.targetWard
          ) {
            return "WARD CONTEST";
          }

          if (
            result.targetConstituency
          ) {
            return "CONSTITUENCY CONTEST";
          }

          if (
            result.targetCounty
          ) {
            return "COUNTY CONTEST";
          }

          if (
            result.position
          ) {
            return "POSITION CONTEST";
          }

          return "PUBLIC OPINION";
        };

      // --------------------------------------------------------------------
      // PAGE HEADER
      // --------------------------------------------------------------------

      const drawPageHeader =
        (
          title =
            "Administrative Statistics Report"
        ) => {
          doc.save();

          doc
            .rect(
              LEFT,
              26,
              8,
              8
            )
            .fillColor(
              COLORS.orange
            )
            .fill();

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(
              10
            )
            .fillColor(
              COLORS.ink
            )
            .text(
              "SFD INSIGHTS",
              LEFT + 15,
              23,
              {
                lineBreak: false,
              }
            );

          doc
            .font(
              "Helvetica"
            )
            .fontSize(
              7
            )
            .fillColor(
              COLORS.muted
            )
            .text(
              "PUBLIC OPINION  •  DATA  •  INSIGHT",
              LEFT + 15,
              36,
              {
                lineBreak: false,
              }
            );

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(
              8
            )
            .fillColor(
              COLORS.muted
            )
            .text(
              title.toUpperCase(),
              LEFT,
              47,
              {
                align: "right",
                width:
                  CONTENT_WIDTH,
                lineBreak: false,
              }
            );

          doc
            .moveTo(
              LEFT,
              54
            )
            .lineTo(
              RIGHT,
              54
            )
            .lineWidth(
              0.7
            )
            .strokeColor(
              COLORS.border
            )
            .stroke();

          doc.restore();
        };

      // --------------------------------------------------------------------
      // PAGE FOOTER
      // --------------------------------------------------------------------

      const drawPageFooter =
        (
          pageNumber: number,
          totalPages: number
        ) => {
          doc.save();

          doc
            .moveTo(
              LEFT,
              FOOTER_LINE_Y
            )
            .lineTo(
              RIGHT,
              FOOTER_LINE_Y
            )
            .lineWidth(
              0.5
            )
            .strokeColor(
              COLORS.border
            )
            .stroke();

          doc
            .font(
              "Helvetica"
            )
            .fontSize(
              7
            )
            .fillColor(
              COLORS.muted
            )
            .text(
              "SFD INSIGHTS  •  Kenya Opinion Polls",
              LEFT,
              FOOTER_TEXT_Y,
              {
                width: 190,
                height: 10,
                lineBreak: false,
              }
            );

          doc
            .text(
              "Recorded platform responses — not official election results",
              LEFT + 190,
              FOOTER_TEXT_Y,
              {
                width: 230,
                height: 10,
                align: "center",
                lineBreak: false,
              }
            );

          doc
            .text(
              `Page ${pageNumber} of ${totalPages}`,
              RIGHT - 75,
              FOOTER_TEXT_Y,
              {
                width: 75,
                height: 10,
                align: "right",
                lineBreak: false,
              }
            );

          doc.restore();
        };

      // --------------------------------------------------------------------
      // PAGE MANAGEMENT
      // --------------------------------------------------------------------

      const newPage =
        (
          headerTitle =
            "Administrative Statistics Report"
        ) => {
          doc.addPage();

          drawPageHeader(
            headerTitle
          );

          doc.y =
            TOP + 20;
        };

      const ensureSpace =
        (
          height = 80,
          headerTitle =
            "Administrative Statistics Report"
        ) => {
          if (
            doc.y + height >
            BOTTOM
          ) {
            newPage(
              headerTitle
            );
          }
        };

      // --------------------------------------------------------------------
      // SECTION TITLE
      // --------------------------------------------------------------------

      const drawSectionTitle =
        (
          title: string,
          eyebrow?: string
        ) => {
          ensureSpace(
            70
          );

          if (eyebrow) {
            doc
              .font(
                "Helvetica-Bold"
              )
              .fontSize(
                7
              )
              .fillColor(
                COLORS.blue
              )
              .text(
                eyebrow.toUpperCase(),
                LEFT,
                doc.y,
                {
                  lineBreak: false,
                }
              );

            doc.moveDown(
              0.3
            );
          }

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(
              17
            )
            .fillColor(
              COLORS.ink
            )
            .text(
              title,
              {
                lineGap: 1,
              }
            );

          doc.moveDown(
            0.25
          );

          doc
            .moveTo(
              LEFT,
              doc.y
            )
            .lineTo(
              LEFT + 45,
              doc.y
            )
            .lineWidth(
              2
            )
            .strokeColor(
              COLORS.orange
            )
            .stroke();

          doc.moveDown(
            0.7
          );
        };

      // --------------------------------------------------------------------
      // PARAGRAPH
      // --------------------------------------------------------------------

      const drawParagraph =
        (
          text: string,
          size = 9,
          color = COLORS.muted
        ) => {
          ensureSpace(
            45
          );

          doc
            .font(
              "Helvetica"
            )
            .fontSize(
              size
            )
            .fillColor(
              color
            )
            .text(
              text,
              {
                width:
                  CONTENT_WIDTH,
                lineGap: 2,
              }
            );

          doc.moveDown(
            0.5
          );
        };

      // --------------------------------------------------------------------
      // METRIC
      // --------------------------------------------------------------------

      const drawMetric =
        (
          x: number,
          y: number,
          width: number,
          label: string,
          value: string
        ) => {
          doc
            .rect(
              x,
              y,
              width,
              68
            )
            .fillColor(
              COLORS.light
            )
            .fill();

          doc
            .rect(
              x,
              y,
              3,
              68
            )
            .fillColor(
              COLORS.blue
            )
            .fill();

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(
              19
            )
            .fillColor(
              COLORS.ink
            )
            .text(
              value,
              x + 13,
              y + 12,
              {
                width:
                  width - 20,
                lineBreak: false,
              }
            );

          doc
            .font(
              "Helvetica"
            )
            .fontSize(
              7.5
            )
            .fillColor(
              COLORS.muted
            )
            .text(
              label.toUpperCase(),
              x + 13,
              y + 43,
              {
                width:
                  width - 20,
                lineBreak: false,
              }
            );
        };

      // --------------------------------------------------------------------
      // TABLE
      // --------------------------------------------------------------------

      const drawTableHeader =
        (
          columns: {
            title: string;
            x: number;
            width: number;
          }[],
          y = doc.y
        ) => {
          doc
            .rect(
              LEFT,
              y - 4,
              CONTENT_WIDTH,
              21
            )
            .fillColor(
              COLORS.ink
            )
            .fill();

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(
              7
            )
            .fillColor(
              COLORS.white
            );

          for (
            const column of columns
          ) {
            doc.text(
              column.title.toUpperCase(),
              column.x,
              y + 2,
              {
                width:
                  column.width,
                lineBreak: false,
              }
            );
          }

          doc.y =
            y + 25;
        };

      const drawTableRow =
        (
          values: string[],
          columns: {
            title: string;
            x: number;
            width: number;
          }[],
          alternate = false,
          headerTitle =
            "Administrative Statistics Report"
        ) => {
          const rowY =
            doc.y;

          const heights =
            values.map(
              (
                value,
                index
              ) =>
                doc.heightOfString(
                  value,
                  {
                    width:
                      columns[index]
                        .width - 8,
                    font:
                      "Helvetica",
                    fontSize:
                      7.5,
                  }
                )
            );

          const rowHeight =
            Math.max(
              24,
              ...heights.map(
                height =>
                  height + 10
              )
            );

          ensureSpace(
            rowHeight + 5,
            headerTitle
          );

          const actualY =
            doc.y;

          if (
            alternate
          ) {
            doc
              .rect(
                LEFT,
                actualY - 5,
                CONTENT_WIDTH,
                rowHeight
              )
              .fillColor(
                COLORS.light
              )
              .fill();
          }

          doc
            .font(
              "Helvetica"
            )
            .fontSize(
              7.5
            )
            .fillColor(
              COLORS.ink
            );

          values.forEach(
            (
              value,
              index
            ) => {
              doc.text(
                value,
                columns[index].x,
                actualY,
                {
                  width:
                    columns[index]
                      .width - 8,
                  lineGap: 1,
                }
              );
            }
          );

          doc
            .moveTo(
              LEFT,
              actualY +
                rowHeight -
                5
            )
            .lineTo(
              RIGHT,
              actualY +
                rowHeight -
                5
            )
            .lineWidth(
              0.35
            )
            .strokeColor(
              COLORS.border
            )
            .stroke();

          doc.y =
            actualY +
            rowHeight;
        };

      // --------------------------------------------------------------------
      // COVER PAGE
      // --------------------------------------------------------------------

      doc.y =
        105;

      doc
        .rect(
          LEFT,
          95,
          8,
          110
        )
        .fillColor(
          COLORS.orange
        )
        .fill();

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(
          12
        )
        .fillColor(
          COLORS.blue
        )
        .text(
          "SFD INSIGHTS",
          LEFT + 25,
          100
        );

      doc
        .font(
          "Helvetica"
        )
        .fontSize(
          8
        )
        .fillColor(
          COLORS.muted
        )
        .text(
          "PUBLIC OPINION  •  DATA  •  INSIGHT",
          LEFT + 25,
          118
        );

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(
          29
        )
        .fillColor(
          COLORS.ink
        )
        .text(
          "Opinion Poll\nStatistics Report",
          LEFT + 25,
          170,
          {
            width: 450,
            lineGap: 2,
          }
        );

      doc
        .font(
          "Helvetica"
        )
        .fontSize(
          11
        )
        .fillColor(
          COLORS.muted
        )
        .text(
          "A structured view of recorded opinion poll activity, contest response distribution and geographic participation.",
          LEFT + 25,
          260,
          {
            width: 410,
            lineGap: 4,
          }
        );

      doc
        .rect(
          LEFT + 25,
          340,
          CONTENT_WIDTH - 50,
          155
        )
        .fillColor(
          COLORS.light
        )
        .fill();

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(
          8
        )
        .fillColor(
          COLORS.blue
        )
        .text(
          "REPORT SNAPSHOT",
          LEFT + 45,
          362
        );

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(
          12
        )
        .fillColor(
          COLORS.ink
        )
        .text(
          `${formatNumber(responses.length)} recorded answers`,
          LEFT + 45,
          390
        );

      doc
        .font(
          "Helvetica"
        )
        .fontSize(
          9
        )
        .fillColor(
          COLORS.muted
        )
        .text(
          `${formatNumber(uniqueParticipants)} participants  •  ${formatNumber(uniquePolls)} polls  •  ${formatNumber(uniqueQuestions)} questions`,
          LEFT + 45,
          414
        );

      doc
        .font(
          "Helvetica"
        )
        .fontSize(
          8
        )
        .fillColor(
          COLORS.muted
        )
        .text(
          `Data period: ${formatDate(oldestResponse)} — ${formatDate(latestResponse)}`,
          LEFT + 45,
          442
        );

      doc
        .font(
          "Helvetica"
        )
        .fontSize(
          8
        )
        .fillColor(
          COLORS.muted
        )
        .text(
          `Generated: ${formatDateTime(today)}`,
          LEFT + 45,
          461
        );

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(
          8
        )
        .fillColor(
          COLORS.ink
        )
        .text(
          "Prepared for analysis, media reference and public-interest reporting.",
          LEFT + 45,
          480
        );

      doc
        .font(
          "Helvetica"
        )
        .fontSize(
          8
        )
        .fillColor(
          COLORS.muted
        )
        .text(
          "This document reports recorded responses collected through the SFD Insights platform. It is not an official election result, census or automatically representative sample.",
          LEFT + 25,
          545,
          {
            width:
              CONTENT_WIDTH - 50,
            lineGap: 3,
          }
        );

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(
          8
        )
        .fillColor(
          COLORS.ink
        )
        .text(
          "SFD INSIGHTS  /  KENYA",
          LEFT + 25,
          690
        );

      doc
        .font(
          "Helvetica"
        )
        .fontSize(
          7
        )
        .fillColor(
          COLORS.muted
        )
        .text(
          "Independent online opinion polling and public-interest data presentation.",
          LEFT + 25,
          707
        );

      // --------------------------------------------------------------------
      // EXECUTIVE SUMMARY
      // --------------------------------------------------------------------

      newPage(
        "Executive Summary"
      );

      drawSectionTitle(
        "At a glance",
        "01  /  Executive summary"
      );

      drawParagraph(
        "This report describes recorded responses available under the selected reporting scope. Political contests are kept as separate analytical units according to their poll, question and geographic target."
      );

      const metricGap =
        10;

      const metricWidth =
        (
          CONTENT_WIDTH -
          metricGap * 2
        ) / 3;

      let metricY =
        doc.y;

      drawMetric(
        LEFT,
        metricY,
        metricWidth,
        "Recorded answers",
        formatNumber(
          responses.length
        )
      );

      drawMetric(
        LEFT +
          metricWidth +
          metricGap,
        metricY,
        metricWidth,
        "Participants",
        formatNumber(
          uniqueParticipants
        )
      );

      drawMetric(
        LEFT +
          (
            metricWidth +
            metricGap
          ) * 2,
        metricY,
        metricWidth,
        "Polls",
        formatNumber(
          uniquePolls
        )
      );

      metricY +=
        84;

      drawMetric(
        LEFT,
        metricY,
        metricWidth,
        "Questions",
        formatNumber(
          uniqueQuestions
        )
      );

      drawMetric(
        LEFT +
          metricWidth +
          metricGap,
        metricY,
        metricWidth,
        "Counties",
        formatNumber(
          uniqueCounties
        )
      );

      drawMetric(
        LEFT +
          (
            metricWidth +
            metricGap
          ) * 2,
        metricY,
        metricWidth,
        "Wards",
        formatNumber(
          uniqueWards
        )
      );

      doc.y =
        metricY +
        92;

      // --------------------------------------------------------------------
      // CONTEST INDEX
      // --------------------------------------------------------------------

      /*
       * IMPORTANT:
       *
       * Group directly using pollId + questionId.
       *
       * Never use poll title + question text.
       */

      const contestMap =
        new Map<
          string,
          {
            first: CandidateResult;
            candidates: Set<string>;
            responses: number;
          }
        >();

      for (
        const result of candidateResults
      ) {
        const key =
          `${result.pollId}::${result.questionId}`;

        const existing =
          contestMap.get(
            key
          );

        if (existing) {
          existing.candidates.add(
            result.candidateName
          );

          existing.responses +=
            result.responses;
        } else {
          contestMap.set(
            key,
            {
              first:
                result,

              candidates:
                new Set([
                  result.candidateName,
                ]),

              responses:
                result.responses,
            }
          );
        }
      }

      if (
        contestMap.size > 0
      ) {
        drawSectionTitle(
          "Contests covered",
          "Political contest index"
        );

        drawParagraph(
          "Each contest is treated as its own analytical unit. Geographic scope is taken directly from the poll configuration. Contests from different counties, constituencies or wards are not combined merely because they concern the same political position."
        );

        const contestColumns = [
          {
            title: "Position",
            x: LEFT,
            width: 90,
          },
          {
            title: "Geographic scope",
            x: LEFT + 95,
            width: 220,
          },
          {
            title: "Candidates",
            x: LEFT + 320,
            width: 70,
          },
          {
            title: "Answers",
            x: LEFT + 395,
            width: 80,
          },
        ];

        drawTableHeader(
          contestColumns
        );

        let contestIndex = 0;

        for (
          const contest of contestMap.values()
        ) {
          const first =
            contest.first;

          drawTableRow(
            [
              truncate(
                first.position ||
                  "General",
                20
              ),

              truncate(
                getCandidateScope(
                  first
                ),
                45
              ),

              formatNumber(
                contest.candidates.size
              ),

              formatNumber(
                contest.responses
              ),
            ],
            contestColumns,
            contestIndex % 2 === 1,
            "Contest Index"
          );

          contestIndex++;
        }
      }

      // --------------------------------------------------------------------
      // POLL OVERVIEW
      // --------------------------------------------------------------------

      newPage(
        "Poll Overview"
      );

      drawSectionTitle(
        "Poll activity",
        "02  /  Poll overview"
      );

      drawParagraph(
        "This section identifies the polls represented in the selected dataset and shows the geographic target attached to each poll."
      );

      if (
        pollSummaries.length === 0
      ) {
        drawParagraph(
          "No poll activity was found for the selected reporting scope."
        );
      } else {
        const pollColumns = [
          {
            title: "Poll",
            x: LEFT,
            width: 155,
          },
          {
            title: "Position",
            x: LEFT + 160,
            width: 75,
          },
          {
            title: "Scope",
            x: LEFT + 240,
            width: 175,
          },
          {
            title: "Answers",
            x: LEFT + 420,
            width: 65,
          },
        ];

        drawTableHeader(
          pollColumns
        );

        pollSummaries.forEach(
          (
            poll,
            index
          ) => {
            const scope =
              [
                poll.ward
                  ? `Ward: ${poll.ward}`
                  : "",

                poll.constituency
                  ? `Constituency: ${poll.constituency}`
                  : "",

                poll.county
                  ? `County: ${poll.county}`
                  : "",
              ]
                .filter(Boolean)
                .join(
                  "  •  "
                ) ||
              "National / general";

            drawTableRow(
              [
                truncate(
                  poll.title,
                  32
                ),

                truncate(
                  poll.position,
                  17
                ),

                truncate(
                  scope,
                  42
                ),

                formatNumber(
                  poll.responses
                ),
              ],
              pollColumns,
              index % 2 === 1,
              "Poll Overview"
            );
          }
        );
      }

      // --------------------------------------------------------------------
      // CONTEST RESULTS
      // --------------------------------------------------------------------

      newPage(
        "Contest Results"
      );

      drawSectionTitle(
        "Contest response distribution",
        "03  /  Political results"
      );

      drawParagraph(
        "Each contest below is shown within its own poll question and geographic scope. Percentages represent the share of recorded answers calculated by the polling platform for that question. Candidate ordering follows the configured poll option order and should not be interpreted as an electoral ranking."
      );

      if (
        candidateResults.length === 0
      ) {
        drawParagraph(
          "No candidate results were found for the selected reporting scope."
        );
      } else {
        /*
         * ---------------------------------------------------------------
         * GROUP BY REAL DATABASE IDENTIFIERS
         * ---------------------------------------------------------------
         *
         * This is the critical fix.
         *
         * pollId + questionId uniquely identifies the contest.
         *
         * We do NOT use:
         *
         *     poll.title
         *     question.text
         *
         * because two polls can have the same title/question.
         */

        const grouped =
          new Map<
            string,
            CandidateResult[]
          >();

        for (
          const result of candidateResults
        ) {
          const key =
            `${result.pollId}::${result.questionId}`;

          const existing =
            grouped.get(
              key
            );

          if (existing) {
            existing.push(
              result
            );
          } else {
            grouped.set(
              key,
              [result]
            );
          }
        }

        for (
          const results of grouped.values()
        ) {
          const first =
            results[0];

          const position =
            first.position ||
            "Political position";

          const scope =
            getCandidateScope(
              first
            );

          const scopeLevel =
            getCandidateScopeLevel(
              first
            );

          // --------------------------------------------------------------
          // CONTEST HEADER
          // --------------------------------------------------------------

          ensureSpace(
            160,
            "Contest Results"
          );

          const headerY =
            doc.y;

          doc
            .rect(
              LEFT,
              headerY,
              CONTENT_WIDTH,
              96
            )
            .fillColor(
              COLORS.light
            )
            .fill();

          doc
            .rect(
              LEFT,
              headerY,
              4,
              96
            )
            .fillColor(
              COLORS.blue
            )
            .fill();

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(
              7
            )
            .fillColor(
              COLORS.blue
            )
            .text(
              scopeLevel,
              LEFT + 16,
              headerY + 12,
              {
                lineBreak: false,
              }
            );

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(
              13
            )
            .fillColor(
              COLORS.ink
            )
            .text(
              position,
              LEFT + 16,
              headerY + 27,
              {
                width:
                  CONTENT_WIDTH - 32,
                lineBreak: false,
              }
            );

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(
              8
            )
            .fillColor(
              COLORS.ink
            )
            .text(
              scope,
              LEFT + 16,
              headerY + 48,
              {
                width:
                  CONTENT_WIDTH - 32,
                lineBreak: false,
              }
            );

          doc
            .font(
              "Helvetica"
            )
            .fontSize(
              7.5
            )
            .fillColor(
              COLORS.muted
            )
            .text(
              `Poll: ${truncate(first.poll, 90)}`,
              LEFT + 16,
              headerY + 64,
              {
                width:
                  CONTENT_WIDTH - 32,
                lineBreak: false,
              }
            );

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(
              8
            )
            .fillColor(
              COLORS.ink
            )
            .text(
              truncate(
                first.question,
                110
              ),
              LEFT + 16,
              headerY + 78,
              {
                width:
                  CONTENT_WIDTH - 32,
                lineBreak: false,
              }
            );

          doc.y =
            headerY +
            112;

          // --------------------------------------------------------------
          // CONTEST SUMMARY
          // --------------------------------------------------------------

          const totalContestResponses =
            results.reduce(
              (
                total,
                result
              ) =>
                total +
                result.responses,
              0
            );

          const summaryWidth =
            (
              CONTENT_WIDTH - 10
            ) / 2;

          doc
            .rect(
              LEFT,
              doc.y,
              summaryWidth,
              48
            )
            .fillColor(
              COLORS.light
            )
            .fill();

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(
              15
            )
            .fillColor(
              COLORS.ink
            )
            .text(
              formatNumber(
                totalContestResponses
              ),
              LEFT + 12,
              doc.y + 9
            );

          doc
            .font(
              "Helvetica"
            )
            .fontSize(
              7
            )
            .fillColor(
              COLORS.muted
            )
            .text(
              "RECORDED ANSWERS",
              LEFT + 12,
              doc.y + 30
            );

          doc
            .rect(
              LEFT +
                summaryWidth +
                10,
              doc.y,
              summaryWidth,
              48
            )
            .fillColor(
              COLORS.light
            )
            .fill();

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(
              15
            )
            .fillColor(
              COLORS.ink
            )
            .text(
              formatNumber(
                results.length
              ),
              LEFT +
                summaryWidth +
                22,
              doc.y + 9
            );

          doc
            .font(
              "Helvetica"
            )
            .fontSize(
              7
            )
            .fillColor(
              COLORS.muted
            )
            .text(
              "CANDIDATE OPTIONS",
              LEFT +
                summaryWidth +
                22,
              doc.y + 30
            );

          doc.y +=
            66;

          // --------------------------------------------------------------
          // CANDIDATE DISTRIBUTION
          // --------------------------------------------------------------

          const labelWidth =
            155;

          const barWidth =
            250;

          const percentX =
            LEFT +
            labelWidth +
            barWidth +
            15;

          for (
            const result of results
          ) {
            ensureSpace(
              46,
              "Contest Results"
            );

            const rowY =
              doc.y;

            const percentage =
              Math.max(
                0,
                Math.min(
                  100,
                  Number(
                    result.percentage
                  ) || 0
                )
              );

            doc
              .font(
                "Helvetica-Bold"
              )
              .fontSize(
                8.5
              )
              .fillColor(
                COLORS.ink
              )
              .text(
                truncate(
                  result.candidateName,
                  28
                ),
                LEFT,
                rowY,
                {
                  width:
                    labelWidth - 8,
                  lineBreak: false,
                }
              );

            doc
              .font(
                "Helvetica"
              )
              .fontSize(
                6.8
              )
              .fillColor(
                COLORS.muted
              )
              .text(
                truncate(
                  result.party ||
                    "Independent / Not specified",
                  30
                ),
                LEFT,
                rowY + 13,
                {
                  width:
                    labelWidth - 8,
                  lineBreak: false,
                }
              );

            // Track
            doc
              .rect(
                LEFT +
                  labelWidth,
                rowY + 5,
                barWidth,
                8
              )
              .fillColor(
                COLORS.border
              )
              .fill();

            // Value
            if (
              percentage > 0
            ) {
              doc
                .rect(
                  LEFT +
                    labelWidth,
                  rowY + 5,
                  Math.max(
                    2,
                    barWidth *
                      (
                        percentage /
                        100
                      )
                  ),
                  8
                )
                .fillColor(
                  COLORS.blue
                )
                .fill();
            }

            doc
              .font(
                "Helvetica-Bold"
              )
              .fontSize(
                9
              )
              .fillColor(
                COLORS.ink
              )
              .text(
                `${percentage}%`,
                percentX,
                rowY,
                {
                  width: 48,
                  align: "right",
                  lineBreak: false,
                }
              );

            doc
              .font(
                "Helvetica"
              )
              .fontSize(
                6.5
              )
              .fillColor(
                COLORS.muted
              )
              .text(
                `${formatNumber(
                  result.responses
                )} answers`,
                percentX - 5,
                rowY + 13,
                {
                  width: 53,
                  align: "right",
                  lineBreak: false,
                }
              );

            doc.y =
              rowY +
              34;
          }

          // --------------------------------------------------------------
          // CONTEST INTERPRETATION
          // --------------------------------------------------------------

          ensureSpace(
            55,
            "Contest Results"
          );

          doc
            .rect(
              LEFT,
              doc.y,
              CONTENT_WIDTH,
              45
            )
            .fillColor(
              COLORS.light
            )
            .fill();

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(
              7
            )
            .fillColor(
              COLORS.ink
            )
            .text(
              "HOW TO READ THIS CONTEST",
              LEFT + 12,
              doc.y + 9
            );

          doc
            .font(
              "Helvetica"
            )
            .fontSize(
              7
            )
            .fillColor(
              COLORS.muted
            )
            .text(
              "Percentages describe the distribution of recorded answers within this specific poll question and geographic scope. They are not population estimates and should not be compared with a different geographic contest unless the underlying poll explicitly defines a common comparison scope.",
              LEFT + 12,
              doc.y + 21,
              {
                width:
                  CONTENT_WIDTH - 24,
                lineGap: 1.5,
              }
            );

          doc.y +=
            58;
        }
      }

      // --------------------------------------------------------------------
      // QUESTION SUMMARY
      // --------------------------------------------------------------------

      newPage(
        "Question Summary"
      );

      drawSectionTitle(
        "Question activity",
        "04  /  Question summary"
      );

      drawParagraph(
        "This section shows recorded answer activity for each question within the selected reporting scope."
      );

      if (
        questionResults.length === 0
      ) {
        drawParagraph(
          "No question-level results were found."
        );
      } else {
        const questionColumns = [
          {
            title: "Poll",
            x: LEFT,
            width: 165,
          },
          {
            title: "Question",
            x: LEFT + 170,
            width: 265,
          },
          {
            title: "Answers",
            x: LEFT + 440,
            width: 60,
          },
        ];

        drawTableHeader(
          questionColumns
        );

        questionResults.forEach(
          (
            result,
            index
          ) => {
            drawTableRow(
              [
                truncate(
                  result.poll,
                  32
                ),

                truncate(
                  result.question,
                  63
                ),

                formatNumber(
                  result.responses
                ),
              ],
              questionColumns,
              index % 2 === 1,
              "Question Summary"
            );
          }
        );
      }

      // --------------------------------------------------------------------
      // GEOGRAPHIC DISTRIBUTION
      // --------------------------------------------------------------------

      const drawGeographySection =
        (
          title: string,
          eyebrow: string,
          results: GeographyResult[]
        ) => {
          newPage(
            title
          );

          drawSectionTitle(
            title,
            eyebrow
          );

          drawParagraph(
            "The figures below describe recorded platform participation associated with the selected geographic level. They should not be interpreted as population shares."
          );

          if (
            results.length === 0
          ) {
            drawParagraph(
              `No ${title.toLowerCase()} data were found for the selected reporting scope.`
            );

            return;
          }

          const columns = [
            {
              title: "Location",
              x: LEFT,
              width: 245,
            },
            {
              title: "Participants",
              x: LEFT + 250,
              width: 90,
            },
            {
              title: "Answers",
              x: LEFT + 345,
              width: 70,
            },
            {
              title: "Share",
              x: LEFT + 420,
              width: 75,
            },
          ];

          drawTableHeader(
            columns
          );

          results.forEach(
            (
              result,
              index
            ) => {
              drawTableRow(
                [
                  truncate(
                    result.name,
                    45
                  ),

                  formatNumber(
                    result.participants
                  ),

                  formatNumber(
                    result.responses
                  ),

                  `${result.percentage}%`,
                ],
                columns,
                index % 2 === 1,
                title
              );
            }
          );
        };

      drawGeographySection(
        "County distribution",
        "05  /  Geographic participation",
        countyResults
      );

      drawGeographySection(
        "Constituency distribution",
        "06  /  Geographic participation",
        constituencyResults
      );

      drawGeographySection(
        "Ward distribution",
        "07  /  Geographic participation",
        wardResults
      );

      // --------------------------------------------------------------------
      // METHODOLOGY
      // --------------------------------------------------------------------

      newPage(
        "Methodology & Notes"
      );

      drawSectionTitle(
        "Methodology & interpretation",
        "08  /  Report notes"
      );

      drawParagraph(
        "This document is generated from recorded online responses stored by the SFD Insights polling platform under the selected filters. It provides an administrative and media-readable summary of the available platform data."
      );

      const noteBlocks = [
        {
          title:
            "Recorded answers",

          text:
            "An answer represents a recorded response to a poll question. The total answer count may therefore differ from the number of distinct participants because one participant can answer more than one question.",
        },

        {
          title:
            "Participants",

          text:
            "Participant totals represent distinct participant identifiers within the selected reporting scope. They should not automatically be interpreted as a census of all people who viewed or were eligible to participate.",
        },

        {
          title:
            "Contest percentages",

          text:
            "Candidate percentages describe the distribution of recorded answers within the specific poll question and geographic scope shown in the contest section. Separate contests are not combined simply because they involve the same political position.",
        },

        {
          title:
            "Geographic participation",

          text:
            "County, constituency and ward figures describe platform participation associated with those geographic groups. They are not population estimates or measures of population representation.",
        },

        {
          title:
            "Candidate filtering",

          text:
            "When a candidate is selected as an administrative filter, the relevant contest remains contextualized with the other candidates in that same contest where the underlying poll data supports it.",
        },

        {
          title:
            "Interpretation",

          text:
            "Poll results should be considered together with collection period, target population, geographic scope, question wording, participation method and any methodology disclosed for the specific poll.",
        },
      ];

      for (
        const note of noteBlocks
      ) {
        ensureSpace(
          90,
          "Methodology & Notes"
        );

        doc
          .font(
            "Helvetica-Bold"
          )
          .fontSize(
            9
          )
          .fillColor(
            COLORS.ink
          )
          .text(
            note.title
          );

        doc.moveDown(
          0.2
        );

        doc
          .font(
            "Helvetica"
          )
          .fontSize(
            8.5
          )
          .fillColor(
            COLORS.muted
          )
          .text(
            note.text,
            {
              width:
                CONTENT_WIDTH,
              lineGap: 2,
            }
          );

        doc.moveDown(
          0.8
        );
      }

      // --------------------------------------------------------------------
      // FINAL DISCLOSURE
      // --------------------------------------------------------------------

      ensureSpace(
        115,
        "Methodology & Notes"
      );

      const disclosureY =
        doc.y;

      doc
        .rect(
          LEFT,
          disclosureY,
          CONTENT_WIDTH,
          92
        )
        .fillColor(
          COLORS.light
        )
        .fill();

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(
          9
        )
        .fillColor(
          COLORS.ink
        )
        .text(
          "IMPORTANT DATA DISCLOSURE",
          LEFT + 15,
          disclosureY + 14,
          {
            lineBreak: false,
          }
        );

      doc
        .font(
          "Helvetica"
        )
        .fontSize(
          8
        )
        .fillColor(
          COLORS.muted
        )
        .text(
          "SFD Insights presents recorded online opinion data. These figures are not official election results, census figures or a guarantee of statistical representation of the wider Kenyan population. Media and other users should review the methodology and collection context before drawing broader conclusions.",
          LEFT + 15,
          disclosureY + 34,
          {
            width:
              CONTENT_WIDTH - 30,
            lineGap: 2,
          }
        );

      // --------------------------------------------------------------------
      // PAGE NUMBERS / FOOTERS
      // --------------------------------------------------------------------

      /*
       * Capture the pages BEFORE drawing the footers.
       *
       * The footer uses absolute coordinates and cannot create a new page.
       */

      const pageRange =
        doc.bufferedPageRange();

      const totalPages =
        pageRange.count;

      for (
        let page =
          pageRange.start;

        page <
        pageRange.start +
          pageRange.count;

        page++
      ) {
        doc.switchToPage(
          page
        );

        drawPageFooter(
          page + 1,
          totalPages
        );
      }

      // --------------------------------------------------------------------
      // FINISH
      // --------------------------------------------------------------------

      doc.end();

    } catch (error) {
      console.error(
        "PDF export error:",
        error
      );

      if (
        !res.headersSent
      ) {
        return res.status(
          500
        ).json({
          success:
            false,

          message:
            "Failed to generate PDF export",
        });
      }
    }
  }
);

// --------------------------------------------------------------------------
// EXPORT ROUTER
// --------------------------------------------------------------------------

export default router;