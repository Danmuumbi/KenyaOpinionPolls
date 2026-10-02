
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Home from "./pages/Home";
import Polls from "./pages/Polls";
import PositionPolls from "./pages/PositionPolls";
import PollDetails from "./pages/PollDetails";
import Participate from "./pages/Participate";
import PollResults from "./pages/PollResults";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

import AdminPolls from "./pages/AdminPolls";
import CreatePoll from "./pages/CreatePoll";
import AdminPollDetails from "./pages/AdminPollDetails";
import AdminCandidates from "./pages/AdminCandidates";
import AdminCandidateEdit from "./pages/AdminCandidateEdit";
import AdminStatistics from "./pages/AdminStatistics";
import ProtectedRoute from "./components/ProtectedRoute";

import FeaturedPolls from "./pages/FeaturedPolls";
import About from "./pages/About";
import Services from "./pages/Services";
import EditPoll from "./pages/EditPoll";

import AgentResponses from "./pages/AgentResponses";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =========================================================
            PUBLIC
        ========================================================= */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/polls"
          element={<Polls />}
        />

        <Route
          path="/polls/general"
          element={<Polls />}
        />

        <Route
          path="/polls/position/:positionId"
          element={<PositionPolls />}
        />

        {/* Participate must be before the generic poll route */}
        <Route
          path="/polls/:pollId/participate"
          element={<Participate />}
        />

        {/* Results */}
        <Route
          path="/polls/:pollId/results"
          element={<PollResults />}
        />

        {/* Poll details / statistics */}
        <Route
          path="/polls/:pollId"
          element={<PollDetails />}
        />


        {/* =========================================================
            AUTHENTICATION
        ========================================================= */}

        <Route
          path="/login"
          element={<Login />}
        />


        {/* =========================================================
            ADMIN
        ========================================================= */}

        <Route element={<ProtectedRoute />}>

          {/* Dashboard */}

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          {/* Polls */}

          <Route
            path="/admin/polls"
            element={<AdminPolls />}
          />

          <Route
            path="/admin/polls/create"
            element={<CreatePoll />}
          />

          <Route
            path="/admin/polls/:pollId"
            element={<AdminPollDetails />}
          />

          {/* Candidates */}

          <Route
            path="/admin/candidates"
            element={<AdminCandidates />}
          />

          <Route
  path="/admin/statistics"
  element={<AdminStatistics />}
/>

<Route path="/about" element={<About />} />
<Route path="/services" element={<Services />} />

<Route
  path="/admin/polls/:pollId/edit"
  element={<EditPoll />}
/>

<Route
  path="/admin/featured-polls"
  element={<FeaturedPolls />}
/>

<Route
  path="/admin/agent-responses"
  element={<AgentResponses />}
/>

          <Route
            path="/admin/candidates/:candidateId/edit"
            element={<AdminCandidateEdit />}
          />

        </Route>

      </Routes>
    </BrowserRouter>
  );
}

