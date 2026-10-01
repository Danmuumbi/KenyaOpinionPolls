import {
  Link,
} from "react-router-dom";

import "../styles/footer.css";

export default function Footer() {
  const year =
    new Date().getFullYear();

  return (
    <footer className="sfd-footer">

      {/* ================================================
          MAIN FOOTER
          ================================================ */}

      <div className="sfd-footer__main">

        <div className="sfd-footer__shell">

          {/* BRAND COLUMN */}

          <div className="sfd-footer__brand">

            <Link
              to="/"
              className="sfd-footer__logo"
              aria-label="SFD Insights home"
            >

              <span className="sfd-footer__mark">
                <span />
                <span />
                <span />
              </span>

              <span className="sfd-footer__logo-name">
                <strong>
                  SFD
                </strong>

                <small>
                  INSIGHTS
                </small>
              </span>

            </Link>


            <p className="sfd-footer__intro">
              A platform for exploring
              public opinion through
              accessible, voluntary
              online polling.
            </p>


            <div className="sfd-footer__origin">

              <span className="sfd-footer__origin-line" />

              <span>
                KENYA
              </span>

            </div>

          </div>


          {/* NAVIGATION */}

          <div className="sfd-footer__navigation">

            <div className="sfd-footer__column">

              <span className="sfd-footer__label">
                EXPLORE
              </span>

              <Link to="/">
                Home
              </Link>

              <Link to="/polls">
                Explore polls
              </Link>

              <Link to="/polls/general">
                Public opinion
              </Link>

            </div>


            <div className="sfd-footer__column">

              <span className="sfd-footer__label">
                INFORMATION
              </span>

              <Link to="/about">
                About SFD Insights
              </Link>

              <Link to="/privacy">
                Privacy
              </Link>

              <Link to="/terms">
                Terms
              </Link>

            </div>


            <div className="sfd-footer__column sfd-footer__column--wide">

              <span className="sfd-footer__label">
                OUR APPROACH
              </span>

              <p>
                We make public opinion
                easier to explore while
                keeping participation
                voluntary and transparent.
              </p>

            </div>

          </div>

        </div>

      </div>


      {/* ================================================
          PRINCIPLE STRIP
          ================================================ */}

      <div className="sfd-footer__principles">

        <div className="sfd-footer__shell">

          <div className="sfd-footer__principle">

            <span>
              01
            </span>

            <strong>
              Voluntary
            </strong>

            <p>
              Participation is your choice.
            </p>

          </div>


          <div className="sfd-footer__principle">

            <span>
              02
            </span>

            <strong>
              Accessible
            </strong>

            <p>
              Built to make polling simple.
            </p>

          </div>


          <div className="sfd-footer__principle">

            <span>
              03
            </span>

            <strong>
              Transparent
            </strong>

            <p>
              Results are presented with context.
            </p>

          </div>


          <div className="sfd-footer__principle">

            <span>
              04
            </span>

            <strong>
              Independent
            </strong>

            <p>
              Online responses are not official results.
            </p>

          </div>

        </div>

      </div>


      {/* ================================================
          BOTTOM BAR
          ================================================ */}

      <div className="sfd-footer__bottom">

        <div className="sfd-footer__shell">

          <div className="sfd-footer__bottom-inner">

            <p>
              © {year} SFD Insights
            </p>

            <span className="sfd-footer__separator">
              /
            </span>

            <p>
              Public opinion,
              made easier to explore.
            </p>


            <button
              type="button"
              className="sfd-footer__top"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                })
              }
              aria-label="Back to top"
            >

              <span>
                BACK TO TOP
              </span>

              <strong>
                ↑
              </strong>

            </button>

          </div>

        </div>

      </div>

    </footer>
  );
}