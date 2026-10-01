import { Link } from "react-router-dom";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import "./About.css";

export default function About() {
  return (
    <>
      <Navbar />

      <main className="about-page">
        <div className="about-shell">

          {/* HERO */}
          <section className="about-hero">
            <div className="about-hero-copy">
              <div className="about-eyebrow">
                <span className="about-eyebrow-dot" />
                ABOUT SFD INSIGHTS
              </div>

              <h1>
                A clearer way to
                <span>understand public opinion.</span>
              </h1>

              <p className="about-hero-description">
                SFD Insights is an independent online platform for
                collecting and presenting voluntary public opinion
                through simple, accessible polls.
              </p>

              <div className="about-hero-actions">
                <Link
                  to="/polls"
                  className="about-primary-button"
                >
                  Explore polls
                  <span aria-hidden="true">→</span>
                </Link>

                <a
                  href="#how-it-works"
                  className="about-secondary-button"
                >
                  How it works
                </a>
              </div>
            </div>

            <div className="about-hero-note">
              <span className="about-note-label">
                OUR APPROACH
              </span>

              <p>
                Ask clearly. Collect responsibly.
                Present the results honestly.
              </p>

              <div className="about-note-line" />

              <span className="about-note-small">
                Voluntary online opinion
              </span>
            </div>
          </section>

          {/* INTRO */}
          <section className="about-introduction">
            <div className="about-section-label">
              01 — WHY SFD INSIGHTS
            </div>

            <div className="about-introduction-content">
              <h2>
                Public opinion deserves
                <span>space to be heard.</span>
              </h2>

              <div className="about-introduction-text">
                <p>
                  People have opinions about the issues, services,
                  leadership and questions that affect their
                  communities. SFD Insights provides a digital space
                  where those opinions can be collected through
                  structured online polls.
                </p>

                <p>
                  The platform is designed to make participation
                  straightforward while presenting responses in a
                  way that is easy to understand.
                </p>
              </div>
            </div>
          </section>

          {/* PRINCIPLES */}
          <section className="about-principles">
            <div className="about-section-label">
              02 — OUR PRINCIPLES
            </div>

            <div className="principles-grid">

              <article className="principle">
                <span className="principle-number">
                  01
                </span>

                <h3>
                  Clarity
                </h3>

                <p>
                  Questions and poll information should be
                  understandable before someone decides to
                  participate.
                </p>
              </article>

              <article className="principle">
                <span className="principle-number">
                  02
                </span>

                <h3>
                  Transparency
                </h3>

                <p>
                  Results are presented as responses collected
                  through the platform, with important context
                  provided where it matters.
                </p>
              </article>

              <article className="principle">
                <span className="principle-number">
                  03
                </span>

                <h3>
                  Accessibility
                </h3>

                <p>
                  The experience is built to work across devices,
                  from larger screens to everyday mobile phones.
                </p>
              </article>

              <article className="principle">
                <span className="principle-number">
                  04
                </span>

                <h3>
                  Responsibility
                </h3>

                <p>
                  Online poll results are treated as collected
                  opinions, not as official election results or
                  definitive representations of a population.
                </p>
              </article>

            </div>
          </section>

          {/* HOW IT WORKS */}
          <section
            id="how-it-works"
            className="about-process"
          >
            <div className="about-section-label">
              03 — HOW IT WORKS
            </div>

            <div className="process-heading">
              <div>
                <h2>
                  From question
                  <span>to public response.</span>
                </h2>
              </div>

              <p>
                SFD Insights keeps the participation process
                deliberately simple.
              </p>
            </div>

            <div className="process-list">

              <article className="process-row">
                <div className="process-number">
                  01
                </div>

                <div className="process-content">
                  <h3>
                    Find a poll
                  </h3>

                  <p>
                    Explore active polls and find questions
                    relevant to the available locations,
                    positions or public topics.
                  </p>
                </div>

                <div className="process-arrow">
                  →
                </div>
              </article>

              <article className="process-row">
                <div className="process-number">
                  02
                </div>

                <div className="process-content">
                  <h3>
                    Share your response
                  </h3>

                  <p>
                    Select the response that represents your
                    view and submit the poll through the
                    participation form.
                  </p>
                </div>

                <div className="process-arrow">
                  →
                </div>
              </article>

              <article className="process-row">
                <div className="process-number">
                  03
                </div>

                <div className="process-content">
                  <h3>
                    Explore the results
                  </h3>

                  <p>
                    Where results are available, responses are
                    presented as percentages to show the
                    distribution recorded by the platform.
                  </p>
                </div>

                <div className="process-arrow">
                  →
                </div>
              </article>

            </div>
          </section>

          {/* RESULTS / CONTEXT */}
          <section className="about-results">
            <div className="results-panel">

              <div className="about-section-label">
                04 — READING THE RESULTS
              </div>

              <h2>
                A poll is a snapshot,
                <span>not a prediction.</span>
              </h2>

              <p>
                Results on SFD Insights represent responses
                submitted through the platform for a particular
                poll. They can help show how participants responded
                to a question at a particular point in time.
              </p>

              <p>
                They should not be interpreted as official election
                results, a census, or necessarily as a statistically
                representative sample of the wider population.
              </p>

              <div className="results-rule" />

              <div className="results-footnote">
                <span>IMPORTANT</span>

                <p>
                  Participation is voluntary. The meaning of any
                  result depends on the question, audience,
                  participation and methodology of the individual
                  poll.
                </p>
              </div>

            </div>
          </section>

          {/* DATA & PRIVACY */}
          <section className="about-data">
            <div className="about-section-label">
              05 — DATA &amp; PRIVACY
            </div>

            <div className="data-grid">

              <div className="data-main">
                <h2>
                  Participation should
                  <span>remain straightforward.</span>
                </h2>

                <p>
                  SFD Insights is designed around voluntary
                  participation. The public experience focuses on
                  answering the question rather than creating an
                  unnecessary account or social profile.
                </p>

                <p>
                  Information collected by the platform is handled
                  according to its applicable privacy and security
                  practices.
                </p>
              </div>

              <div className="data-points">

                <div className="data-point">
                  <span className="data-point-mark">
                    ✓
                  </span>

                  <div>
                    <h3>
                      Voluntary participation
                    </h3>

                    <p>
                      You choose whether to participate in a
                      poll.
                    </p>
                  </div>
                </div>

                <div className="data-point">
                  <span className="data-point-mark">
                    ✓
                  </span>

                  <div>
                    <h3>
                      Results with context
                    </h3>

                    <p>
                      Poll results are presented with
                      information about what they represent.
                    </p>
                  </div>
                </div>

                <div className="data-point">
                  <span className="data-point-mark">
                    ✓
                  </span>

                  <div>
                    <h3>
                      Security matters
                    </h3>

                    <p>
                      Platform safeguards are used to help
                      protect the integrity of participation.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* CLOSING CTA */}
          <section className="about-closing">
            <div className="closing-copy">
              <span className="about-section-label">
                HAVE YOUR SAY
              </span>

              <h2>
                See the questions.
                <span>Share your view.</span>
              </h2>

              <p>
                Explore the available polls and participate in
                the conversations that interest you.
              </p>
            </div>

            <Link
              to="/polls"
              className="closing-button"
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