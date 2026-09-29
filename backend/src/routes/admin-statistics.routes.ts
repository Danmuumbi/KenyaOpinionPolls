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


      // ---------------------------------------------------------------------
      // OVERVIEW
      // ---------------------------------------------------------------------

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
      // PDFKIT
      // ---------------------------------------------------------------------

      const PDFDocument =
        require(
          "pdfkit"
        );


      const doc =
        new PDFDocument({

          size: "A4",

          margin: 45,

          bufferPages: true,

        });


      const filename =
        `kenya-opinion-polls-${new Date()
          .toISOString()
          .slice(
            0,
            10
          )}.pdf`;


      res.setHeader(
        "Content-Type",
        "application/pdf"
      );


      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );


      doc.pipe(res);


      // ---------------------------------------------------------------------
      // HELPER FUNCTIONS
      // ---------------------------------------------------------------------

      const ensureSpace =
        (
          requiredHeight = 70
        ) => {

          if (
            doc.y >
            760 -
            requiredHeight
          ) {

            doc.addPage();

          }

        };


      const section =
        (
          title: string
        ) => {

          ensureSpace(
            60
          );


          doc
            .moveDown(
              1
            )
            .fontSize(14)
            .font(
              "Helvetica-Bold"
            )
            .fillColor(
              "black"
            )
            .text(
              title
            );


          doc.moveDown(
            0.5
          );

        };


      const drawTableHeader =
        (
          columns: string[]
        ) => {

          ensureSpace(
            45
          );


          doc
            .fontSize(8)
            .font(
              "Helvetica-Bold"
            );


          doc.text(
            columns.join(
              "    "
            )
          );


          doc.moveDown(
            0.25
          );

        };


      const drawTableRow =
        (
          values: unknown[]
        ) => {

          ensureSpace(
            35
          );


          doc
            .fontSize(8)
            .font(
              "Helvetica"
            );


          doc.text(
            values
              .map(
                value =>
                  String(
                    value ??
                    ""
                  )
              )
              .join(
                "    "
              )
          );


          doc.moveDown(
            0.25
          );

        };


      // ---------------------------------------------------------------------
      // TITLE
      // ---------------------------------------------------------------------

      doc
        .fontSize(20)
        .font(
          "Helvetica-Bold"
        )
        .text(
          "Kenya Opinion Polls",
          {
            align: "center",
          }
        );


      doc
        .moveDown(0.4)
        .fontSize(14)
        .font(
          "Helvetica"
        )
        .text(
          "Administrative Statistics Report",
          {
            align: "center",
          }
        );


      doc
        .moveDown(0.5)
        .fontSize(9)
        .fillColor(
          "gray"
        )
        .text(
          `Generated: ${new Date().toLocaleString()}`,
          {
            align: "center",
          }
        );


      doc.fillColor(
        "black"
      );


      // ---------------------------------------------------------------------
      // FILTERS
      // ---------------------------------------------------------------------

      section(
        "Applied Filters"
      );


      const filterEntries = [

        [
          "Poll ID",
          filters.pollId,
        ],

        [
          "Poll Type",
          filters.pollType,
        ],

        [
          "Poll Status",
          filters.pollStatus,
        ],

        [
          "Position ID",
          filters.positionId,
        ],

        [
          "Candidate ID",
          filters.candidateId,
        ],

        [
          "Campaign ID",
          filters.campaignId,
        ],

        [
          "County ID",
          filters.countyId,
        ],

        [
          "Constituency ID",
          filters.constituencyId,
        ],

        [
          "Ward ID",
          filters.wardId,
        ],

        [
          "From",
          filters.from,
        ],

        [
          "To",
          filters.to,
        ],

      ];


      for (
        const [
          label,
          value,
        ] of filterEntries
      ) {

        doc
          .fontSize(9)
          .font(
            "Helvetica-Bold"
          )
          .text(
            `${label}: `,
            {
              continued: true,
            }
          )
          .font(
            "Helvetica"
          )
          .text(
            value
              ? String(value)
              : "All"
          );

      }


      // ---------------------------------------------------------------------
      // OVERVIEW
      // ---------------------------------------------------------------------

      section(
        "Overview"
      );


      const overview = [

        [
          "Answer Responses",
          responses.length,
        ],

        [
          "Unique Participants",
          uniqueParticipants,
        ],

        [
          "Polls",
          uniquePolls,
        ],

        [
          "Questions",
          uniqueQuestions,
        ],

        [
          "Counties",
          uniqueCounties,
        ],

        [
          "Constituencies",
          uniqueConstituencies,
        ],

        [
          "Wards",
          uniqueWards,
        ],

      ];


      for (
        const [
          label,
          value,
        ] of overview
      ) {

        doc
          .fontSize(10)
          .font(
            "Helvetica-Bold"
          )
          .text(
            `${label}: `,
            {
              continued: true,
            }
          )
          .font(
            "Helvetica"
          )
          .text(
            String(value)
          );

      }


      // ---------------------------------------------------------------------
      // CONTEST / CANDIDATE RESULTS
      // ---------------------------------------------------------------------

      section(
        "Candidate Results"
      );


      doc
        .fontSize(8)
        .fillColor(
          "gray"
        )
        .text(
          "Percentages are calculated within each question/contest using the recorded answer responses for that question under the selected filters."
        );


      doc.fillColor(
        "black"
      );


      doc.moveDown(
        0.5
      );


      if (
        candidateResults.length === 0
      ) {

        doc
          .fontSize(9)
          .text(
            "No candidate results were found for the selected filters."
          );

      } else {

        drawTableHeader([
          "Candidate",
          "Party",
          "Responses",
          "%",
        ]);


        // Group candidates by poll + question so percentages are
        // understood in their correct contest.
        let previousContest =
          "";


        for (
          const result of candidateResults
        ) {

          const contest =
            `${result.poll} — ${result.question}`;


          if (
            contest !==
            previousContest
          ) {

            if (
              previousContest
            ) {

              doc.moveDown(
                0.5
              );

            }


            ensureSpace(
              55
            );


            doc
              .fontSize(9)
              .font(
                "Helvetica-Bold"
              )
              .text(
                contest
              );


            doc.moveDown(
              0.25
            );


            previousContest =
              contest;

          }


          drawTableRow([

            result.candidateName,

            result.party ||
              "Independent / Not specified",

            result.responses,

            `${result.percentage}%`,

          ]);

        }

      }


      // ---------------------------------------------------------------------
      // QUESTION RESULTS
      // ---------------------------------------------------------------------

      section(
        "Question Summary"
      );


      if (
        questionResults.length === 0
      ) {

        doc
          .fontSize(9)
          .text(
            "No question-level results were found."
          );

      } else {

        drawTableHeader([
          "Poll",
          "Question",
          "Responses",
        ]);


        for (
          const result of questionResults
        ) {

          drawTableRow([

            result.poll,

            result.question,

            result.responses,

          ]);

        }

      }


      // ---------------------------------------------------------------------
      // COUNTY RESULTS
      // ---------------------------------------------------------------------

      section(
        "County Breakdown"
      );


      if (
        countyResults.length === 0
      ) {

        doc
          .fontSize(9)
          .text(
            "No county-level results were found."
          );

      } else {

        drawTableHeader([
          "County",
          "Responses",
          "Participants",
          "%",
        ]);


        for (
          const result of countyResults
        ) {

          drawTableRow([

            result.name,

            result.responses,

            result.participants,

            `${result.percentage}%`,

          ]);

        }

      }


      // ---------------------------------------------------------------------
      // CONSTITUENCY RESULTS
      // ---------------------------------------------------------------------

      section(
        "Constituency Breakdown"
      );


      if (
        constituencyResults.length === 0
      ) {

        doc
          .fontSize(9)
          .text(
            "No constituency-level results were found."
          );

      } else {

        drawTableHeader([
          "Constituency",
          "Responses",
          "Participants",
          "%",
        ]);


        for (
          const result of constituencyResults
        ) {

          drawTableRow([

            result.name,

            result.responses,

            result.participants,

            `${result.percentage}%`,

          ]);

        }

      }


      // ---------------------------------------------------------------------
      // WARD RESULTS
      // ---------------------------------------------------------------------

      section(
        "Ward Breakdown"
      );


      if (
        wardResults.length === 0
      ) {

        doc
          .fontSize(9)
          .text(
            "No ward-level results were found."
          );

      } else {

        drawTableHeader([
          "Ward",
          "Responses",
          "Participants",
          "%",
        ]);


        for (
          const result of wardResults
        ) {

          drawTableRow([

            result.name,

            result.responses,

            result.participants,

            `${result.percentage}%`,

          ]);

        }

      }


      // ---------------------------------------------------------------------
      // RESPONSE DETAILS
      // ---------------------------------------------------------------------

      section(
        "Individual Response Details"
      );


      if (
        responses.length === 0
      ) {

        doc
          .fontSize(10)
          .font(
            "Helvetica"
          )
          .text(
            "No responses match the selected filters."
          );

      }


      responses.forEach(
        (
          response,
          index
        ) => {

          ensureSpace(
            150
          );


          const candidate =
            response.option
              .candidate;


          doc
            .fontSize(9)
            .font(
              "Helvetica-Bold"
            )
            .text(
              `${index + 1}. ${response.poll.title}`
            );


          doc
            .font(
              "Helvetica"
            )
            .text(
              `Poll Type: ${response.poll.type}`
            );


          doc.text(
            `Poll Status: ${response.poll.status}`
          );


          doc.text(
            `Position: ${
              response.poll.position?.name
                ?? "N/A"
            }`
          );


          if (
            response.poll.campaign
          ) {

            doc.text(
              `Campaign: ${response.poll.campaign.name}`
            );

          }


          doc.text(
            `Question: ${response.question.question}`
          );


          doc.text(
            `Selected Option: ${response.option.label}`
          );


          if (
            candidate
          ) {

            doc.text(
              `Candidate: ${candidate.name}`
            );


            if (
              candidate.party
            ) {

              doc.text(
                `Party: ${candidate.party}`
              );

            }

          }


          doc.text(
            `Location: ${
              response.county?.name
                ?? "N/A"
            } / ${
              response.constituency?.name
                ?? "N/A"
            } / ${
              response.ward?.name
                ?? "N/A"
            }`
          );


          doc.text(
            `Poll Target: ${
              response.poll.targetCounty?.name
                ?? "N/A"
            } / ${
              response.poll.targetConstituency?.name
                ?? "N/A"
            } / ${
              response.poll.targetWard?.name
                ?? "N/A"
            }`
          );


          doc.text(
            `Participant ID: ${response.participantId}`
          );


          doc.text(
            `Response ID: ${response.id}`
          );


          doc.text(
            `Date: ${response.createdAt.toLocaleString()}`
          );


          doc.moveDown(
            0.8
          );

        }
      );


      // ---------------------------------------------------------------------
      // METHODOLOGY NOTE
      // ---------------------------------------------------------------------

      section(
        "Report Note"
      );


      doc
        .fontSize(9)
        .font(
          "Helvetica"
        )
        .text(
          "This report contains administrative statistics from recorded online poll responses under the selected filters. Response counts represent recorded answer submissions, while participant counts represent distinct participant identifiers."
        );


      doc.moveDown();


      doc.text(
        "Candidate percentages are calculated within the applicable question or contest. Candidates with no recorded responses are included where they are configured as active options for the selected contest."
      );


      doc.moveDown();


      doc.text(
        "When a candidate is selected as a filter, the export uses that candidate to identify the relevant contest and retains the other candidates in that contest so that their results can be compared within the same report."
      );


      doc.moveDown();


      doc.text(
        "The figures should be interpreted together with the applicable poll methodology, sampling approach, geographic coverage, dates, and other disclosed limitations."
      );


      // ---------------------------------------------------------------------
      // PAGE NUMBERS
      // ---------------------------------------------------------------------

      const pageRange =
        doc.bufferedPageRange();


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


        doc
          .fontSize(8)
          .fillColor(
            "gray"
          )
          .text(
            `Kenya Opinion Polls — Page ${
              page + 1
            } of ${
              pageRange.count
            }`,
            45,
            800,
            {
              align: "center",
              width: 505,
            }
          );

      }


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

          success: false,

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