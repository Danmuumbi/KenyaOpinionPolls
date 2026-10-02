import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";

import { prisma } from "./config/database";

import authRoutes from "./routes/auth.routes";
import geographyRoutes from "./routes/geography.routes";
import positionRoutes from "./routes/position.routes";
import pollRoutes from "./routes/poll.routes";
import responseRoutes from "./routes/response.routes";

import adminPollRoutes from "./routes/admin-poll.routes";
import adminQuestionRoutes from "./routes/admin-question.routes";
import adminOptionRoutes from "./routes/admin-option.routes";
import adminCandidateRoutes from "./routes/admin-candidate.routes";
import publicRoutes from "./routes/public.routes";
import adminStatisticsRoutes from "./routes/admin-statistics.routes";

import featuredPollsRoutes from "./routes/featured-polls.routes";

import publicFeaturedPollsRoutes from "./routes/public-featured-polls.routes";
import adminPollEditRoutes from "./routes/admin-poll-edit.routes";

import agentResponseRoutes from "./routes/agent-response.routes";
const app = express();

const PORT =
  Number(process.env.PORT) || 5000;

app.use(helmet());

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      "https://kenya-opinion-polls-three.vercel.app",

    credentials: true,
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(cookieParser());

app.use(morgan("dev"));

const generalLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 300,

    standardHeaders: true,

    legacyHeaders: false,
  });

app.use(generalLimiter);

/*
|--------------------------------------------------------------------------
| Basic API
|--------------------------------------------------------------------------
*/

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message:
      "Kenya Opinion Polls API is running",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "API is healthy",
    timestamp:
      new Date().toISOString(),
  });
});

app.get(
  "/api/health/database",
  async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      return res.json({
        success: true,
        message:
          "Database connection is healthy",
        database: "PostgreSQL",
      });
    } catch (error) {
      console.error(
        "Database health check failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Database connection failed",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth",
  authRoutes
);

/*
|--------------------------------------------------------------------------
| Public geography
|--------------------------------------------------------------------------
*/

app.use(
  "/api/geography",
  geographyRoutes
);

/*
|--------------------------------------------------------------------------
| Public positions
|--------------------------------------------------------------------------
*/

app.use(
  "/api/positions",
  positionRoutes
);

/*
|--------------------------------------------------------------------------
| Public polls
|--------------------------------------------------------------------------
*/

app.use(
  "/api/polls",
  pollRoutes
);

/*
|--------------------------------------------------------------------------
| Public responses
|--------------------------------------------------------------------------
*/

app.use(
  "/api/responses",
  responseRoutes
);

app.use(
  "/api/admin/polls",
  adminPollRoutes
);

app.use(
  "/api/admin",
  adminQuestionRoutes
);

app.use(
  "/api/admin",
  adminOptionRoutes
);

app.use(
  "/api/admin/candidates",
  adminCandidateRoutes
);

app.use("/api/public", publicRoutes);


app.use(
  "/api/admin/statistics",
  adminStatisticsRoutes
);

app.use(
  "/api/admin/featured-polls",
  featuredPollsRoutes
);

app.use(
  "/api/public/featured-polls",
  publicFeaturedPollsRoutes
);


app.use(
  "/api/admin/polls",
  adminPollEditRoutes
);

app.use(
  "/api/agent-responses",
  agentResponseRoutes
);

/*
|--------------------------------------------------------------------------
| Start server
|--------------------------------------------------------------------------
*/

app.listen(
  PORT,
  () => {
    console.log(
      `API running on http://localhost:${PORT}`
    );
  }
);