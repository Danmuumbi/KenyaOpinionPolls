import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  getPublicPolls,
} from "../api/public";

import type {
  PublicPoll,
} from "../api/public";

import {
  getLocationContext,
} from "../utils/locationContext";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import "./Polls.css";


export default function Polls() {
  const [polls, setPolls] =
    useState<PublicPoll[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  useEffect(() => {
    async function load() {
      try {
        const location =
          getLocationContext();

        const data =
          await getPublicPolls(
            location
          );

        setPolls(data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load polls"
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);


  if (loading) {
    return (
      <>
        <Navbar />

        <main className="polls-page">

          <section className="polls-loading">

            <div className="polls-loading__top">
              <span>
                SFD / POLLS
              </span>

              <span>
                Loading
              </span>
            </div>

            <div className="polls-loading__line" />

            <h1>
              Preparing available
              <br />
              public polls.
            </h1>

            <p>
              Please wait while we load
              the latest polls available
              to you.
            </p>

          </section>

        </main>

        <Footer />
      </>
    );
  }


  if (error) {
    return (
      <>
        <Navbar />

        <main className="polls-page">

          <section className="polls-error">

            <div className="polls-error__code">
              POLLS / ERROR
            </div>

            <div className="polls-error__mark">
              !
            </div>

            <h1>
              We couldn't load
              the polls.
            </h1>

            <p>
              {error}
            </p>

            <div className="polls-error__actions">

              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
              >
                Try again
              </button>

              <Link to="/">
                Return home
              </Link>

            </div>

          </section>

        </main>

        <Footer />
      </>
    );
  }


  return (
    <>
      <Navbar />

      <main className="polls-page">

        {/* =================================================
            PAGE INTRO
            ================================================= */}

        <section className="polls-hero">

          <div className="polls-shell">

            <div className="polls-hero__top">

              <span className="polls-kicker">
                SFD / PUBLIC POLLING
              </span>

              <span className="polls-hero__index">
                {polls.length > 0
                  ? `${String(
                      polls.length
                    ).padStart(2, "0")} AVAILABLE`
                  : "NO ACTIVE POLLS"}
              </span>

            </div>


            <div className="polls-hero__content">

              <div className="polls-hero__heading">

                <h1>
                  Explore
                  <br />
                  <span>public opinion.</span>
                </h1>

              </div>


              <div className="polls-hero__description">

                <div className="polls-hero__rule" />

                <p>
                  Take part in active public
                  opinion, research and general
                  polls available through
                  SFD Insights.
                </p>

                <p className="polls-hero__note">
                  Participation is voluntary.
                  Each poll explains what you
                  are being asked before you
                  respond.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            POLL INDEX
            ================================================= */}

        <section className="polls-index">

          <div className="polls-shell">

            <div className="polls-index__header">

              <div>

                <span className="polls-section-label">
                  CURRENT POLLS
                </span>

                <h2>
                  Open for participation
                </h2>

              </div>

              <Link
                to="/"
                className="polls-back"
              >
                <span>
                  ←
                </span>

                Home
              </Link>

            </div>


            {polls.length === 0 ? (

              <div className="polls-empty">

                <div className="polls-empty__number">
                  00
                </div>

                <div className="polls-empty__content">

                  <span>
                    NO ACTIVE POLLS
                  </span>

                  <h2>
                    Nothing is open
                    right now.
                  </h2>

                  <p>
                    There are currently no
                    general or public opinion
                    polls available for
                    participation. Check back
                    later for new polls.
                  </p>

                  <Link to="/">
                    Return to SFD Insights
                    <strong>↗</strong>
                  </Link>

                </div>

              </div>

            ) : (

              <div className="polls-list">

                {polls.map(
                  (poll, index) => (
                    <article
                      key={poll.id}
                      className="poll-item"
                    >

                      <div className="poll-item__number">
                        {String(
                          index + 1
                        ).padStart(2, "0")}
                      </div>


                      <div className="poll-item__main">

                        <div className="poll-item__meta">

                          <span>
                            PUBLIC POLL
                          </span>

                          <i />

                          <span>
                            OPEN
                          </span>

                        </div>


                        <h2>
                          {poll.title}
                        </h2>


                        {poll.description && (
                          <p>
                            {poll.description}
                          </p>
                        )}

                      </div>


                      <div className="poll-item__action">

                        <Link
                          to={`/polls/${poll.id}`}
                        >
                          <span>
                            View poll
                          </span>

                          <strong>
                            ↗
                          </strong>
                        </Link>

                      </div>

                    </article>
                  )
                )}

              </div>

            )}

          </div>

        </section>


        {/* =================================================
            TRUST / INFORMATION
            ================================================= */}

        <section className="polls-note">

          <div className="polls-shell">

            <div className="polls-note__inner">

              <div className="polls-note__label">
                ABOUT THESE POLLS
              </div>

              <div className="polls-note__content">

                <h2>
                  Your response is
                  part of a larger
                  picture.
                </h2>

                <p>
                  SFD Insights provides a
                  platform for voluntary
                  online opinion polling.
                  Responses collected here
                  represent participants who
                  choose to take part and
                  should not be interpreted
                  as official election results
                  or a scientifically
                  representative sample unless
                  a poll specifically states
                  otherwise.
                </p>

              </div>

            </div>

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}