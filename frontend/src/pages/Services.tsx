import { Link } from "react-router-dom";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import "./Services.css";

export default function Services() {
  return (
    <>
      <Navbar />

      <main className="services-page">
        <div className="services-shell">

          {/* HERO */}
          <section className="services-hero">
            <div className="services-hero-copy">
              <div className="services-eyebrow">
                <span className="services-eyebrow-dot" />
                SFD INSIGHTS SERVICES
              </div>

              <h1>
                Turning questions into
                <span>useful public insight.</span>
              </h1>

              <p>
                SFD Insights provides digital tools for creating,
                managing and presenting structured opinion polls
                in a simple and accessible way.
              </p>

              <div className="services-hero-actions">
                <Link
                  to="/polls"
                  className="services-primary-button"
                >
                  Explore polls
                  <span aria-hidden="true">→</span>
                </Link>

                <a
                  href="#services-list"
                  className="services-secondary-button"
                >
                  View services
                </a>
              </div>
            </div>

            <div className="services-hero-note">
              <span className="services-note-label">
                WHAT WE DO
              </span>

              <p>
                Create. Collect. Understand.
              </p>

              <div className="services-note-line" />

              <span className="services-note-small">
                Digital opinion &amp; research tools
              </span>
            </div>
          </section>

          {/* INTRO */}
          <section className="services-introduction">
            <div className="services-section-label">
              01 — OUR SERVICES
            </div>

            <div className="services-introduction-content">
              <h2>
                Tools for better
                <span>public feedback.</span>
              </h2>

              <div className="services-introduction-text">
                <p>
                  SFD Insights is designed to support organisations,
                  researchers and teams that need a structured way
                  to ask questions and understand responses.
                </p>

                <p>
                  Our services cover the full polling process,
                  from setting up questions to collecting responses
                  and presenting results clearly.
                </p>
              </div>
            </div>
          </section>

          {/* SERVICES */}
          <section
            id="services-list"
            className="services-list-section"
          >
            <div className="services-section-label">
              02 — WHAT WE PROVIDE
            </div>

            <div className="services-list">

              <article className="service-row">
                <div className="service-number">
                  01
                </div>

                <div className="service-content">
                  <span className="service-kicker">
                    POLL CREATION
                  </span>

                  <h3>
                    Structured online polls
                  </h3>

                  <p>
                    Create clear questions and organised poll
                    experiences for public opinion, research,
                    feedback and other structured surveys.
                  </p>
                </div>

                <div className="service-arrow">
                  →
                </div>
              </article>

              <article className="service-row">
                <div className="service-number">
                  02
                </div>

                <div className="service-content">
                  <span className="service-kicker">
                    DATA COLLECTION
                  </span>

                  <h3>
                    Digital response collection
                  </h3>

                  <p>
                    Give participants a straightforward way to
                    submit responses online while maintaining
                    organised poll data.
                  </p>
                </div>

                <div className="service-arrow">
                  →
                </div>
              </article>

              <article className="service-row">
                <div className="service-number">
                  03
                </div>

                <div className="service-content">
                  <span className="service-kicker">
                    RESULTS
                  </span>

                  <h3>
                    Clear result presentation
                  </h3>

                  <p>
                    Present collected responses through readable
                    percentages and summaries that help people
                    understand the distribution of responses.
                  </p>
                </div>

                <div className="service-arrow">
                  →
                </div>
              </article>

              <article className="service-row">
                <div className="service-number">
                  04
                </div>

                <div className="service-content">
                  <span className="service-kicker">
                    LOCATION-BASED POLLING
                  </span>

                  <h3>
                    Geographic poll targeting
                  </h3>

                  <p>
                    Organise polls around relevant geographic
                    areas such as counties, constituencies and
                    wards where applicable.
                  </p>
                </div>

                <div className="service-arrow">
                  →
                </div>
              </article>

              <article className="service-row">
                <div className="service-number">
                  05
                </div>

                <div className="service-content">
                  <span className="service-kicker">
                    PUBLIC FEEDBACK
                  </span>

                  <h3>
                    Community opinion &amp; feedback
                  </h3>

                  <p>
                    Use structured online questions to gather
                    feedback on public topics, services, issues
                    and community-focused questions.
                  </p>
                </div>

                <div className="service-arrow">
                  →
                </div>
              </article>

              <article className="service-row">
                <div className="service-number">
                  06
                </div>

                <div className="service-content">
                  <span className="service-kicker">
                    RESEARCH SUPPORT
                  </span>

                  <h3>
                    Research-oriented polling
                  </h3>

                  <p>
                    Support research activities that require
                    structured online responses and clearly
                    presented findings.
                  </p>
                </div>

                <div className="service-arrow">
                  →
                </div>
              </article>

            </div>
          </section>

          {/* WORKFLOW */}
          <section className="services-workflow">
            <div className="services-section-label">
              03 — THE PROCESS
            </div>

            <div className="workflow-heading">
              <h2>
                From an idea
                <span>to measurable responses.</span>
              </h2>

              <p>
                A simple workflow keeps the polling experience
                focused from beginning to end.
              </p>
            </div>

            <div className="workflow-grid">

              <article className="workflow-step">
                <span>01</span>

                <h3>
                  Define
                </h3>

                <p>
                  Establish the question, audience and scope
                  of the poll.
                </p>
              </article>

              <article className="workflow-step">
                <span>02</span>

                <h3>
                  Collect
                </h3>

                <p>
                  Make the poll available and collect voluntary
                  responses.
                </p>
              </article>

              <article className="workflow-step">
                <span>03</span>

                <h3>
                  Present
                </h3>

                <p>
                  Turn collected responses into clear,
                  understandable results.
                </p>
              </article>

              <article className="workflow-step">
                <span>04</span>

                <h3>
                  Understand
                </h3>

                <p>
                  Use the results as a source of insight while
                  considering their context and limitations.
                </p>
              </article>

            </div>
          </section>

          {/* WHO IT IS FOR */}
          <section className="services-audience">
            <div className="services-section-label">
              04 — WHO IT CAN SERVE
            </div>

            <div className="audience-layout">
              <div className="audience-main">
                <h2>
                  Built for teams
                  <span>that need to ask.</span>
                </h2>

                <p>
                  Different organisations may have different
                  questions. The platform can support a range of
                  structured opinion and feedback activities.
                </p>
              </div>

              <div className="audience-list">

                <div className="audience-item">
                  <span>01</span>
                  <p>
                    Research teams
                  </p>
                </div>

                <div className="audience-item">
                  <span>02</span>
                  <p>
                    Community organisations
                  </p>
                </div>

                <div className="audience-item">
                  <span>03</span>
                  <p>
                    Public-interest projects
                  </p>
                </div>

                <div className="audience-item">
                  <span>04</span>
                  <p>
                    Organisations seeking feedback
                  </p>
                </div>

              </div>
            </div>
          </section>

          {/* IMPORTANT NOTE */}
          <section className="services-note-section">
            <div className="services-note-panel">

              <div className="services-section-label">
                05 — IMPORTANT CONTEXT
              </div>

              <h2>
                Results need
                <span>context.</span>
              </h2>

              <p>
                SFD Insights presents responses collected through
                online polls. The results of a particular poll
                depend on its question, participants, timing,
                reach and methodology.
              </p>

              <p>
                Poll results should therefore be understood as
                information about the responses collected through
                that poll, rather than automatically being treated
                as official statistics or election results.
              </p>

              <div className="services-note-rule" />

              <span className="services-note-foot">
                Clear questions. Responsible presentation.
              </span>

            </div>
          </section>

          {/* CTA */}
          <section className="services-closing">
            <div className="services-closing-copy">
              <span className="services-section-label">
                READY TO EXPLORE?
              </span>

              <h2>
                Start with
                <span>the questions.</span>
              </h2>

              <p>
                Explore the polls currently available on
                SFD Insights.
              </p>
            </div>

            <Link
              to="/polls"
              className="services-closing-button"
            >
              Explore available polls
              <span aria-hidden="true">→</span>
            </Link>
          </section>

        </div>
      </main>

      <Footer />
    </>
  );
}