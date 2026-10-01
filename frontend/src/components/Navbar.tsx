import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  NavLink,
} from "react-router-dom";

import "../styles/navigation.css";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20);
    }

    handleScroll();

    window.addEventListener(
      "scroll",
      handleScroll,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape" &&
        menuOpen
      ) {
        setMenuOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function toggleMenu() {
    setMenuOpen((current) => !current);
  }

  return (
    <header
      className={`sfd-header ${
        scrolled
          ? "sfd-header--scrolled"
          : ""
      } ${
        menuOpen
          ? "sfd-header--menu-open"
          : ""
      }`}
    >

      {/* DESKTOP / MOBILE BAR */}

      <div className="sfd-header__bar">

        {/* BRAND */}

        <Link
          to="/"
          className="sfd-logo"
          onClick={closeMenu}
          aria-label="SFD Insights home"
        >
          <span className="sfd-logo__mark">
            <span />
            <span />
            <span />
          </span>

          <span className="sfd-logo__text">
            <strong>SFD</strong>
            <small>INSIGHTS</small>
          </span>
        </Link>


        {/* DESKTOP NAVIGATION */}

        <nav
          className="sfd-header__nav"
          aria-label="Primary navigation"
        >

          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `sfd-header__link ${
                isActive
                  ? "sfd-header__link--active"
                  : ""
              }`
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/polls"
            className={({ isActive }) =>
              `sfd-header__link ${
                isActive
                  ? "sfd-header__link--active"
                  : ""
              }`
            }
          >
            Explore
          </NavLink>

          <NavLink
            to="/polls/general"
            className={({ isActive }) =>
              `sfd-header__link ${
                isActive
                  ? "sfd-header__link--active"
                  : ""
              }`
            }
          >
            Public Opinion
          </NavLink>

          <NavLink
            to="/about"
            className={({ isActive }) =>
              `sfd-header__link ${
                isActive
                  ? "sfd-header__link--active"
                  : ""
              }`
            }
          >
            About
          </NavLink>

          <NavLink
            to="/services"
            className={({ isActive }) =>
              `sfd-header__link ${
                isActive
                  ? "sfd-header__link--active"
                  : ""
              }`
            }
          >
            Services
          </NavLink>

        </nav>


        {/* RIGHT SIDE */}

        <div className="sfd-header__right">

          <div className="sfd-header__status">
            <span className="sfd-header__status-dot" />
            <span>
              Independent polling
            </span>
          </div>

          <Link
            to="/polls"
            className="sfd-header__cta"
            onClick={closeMenu}
          >
            <span>
              Explore polls
            </span>

            <span
              aria-hidden="true"
              className="sfd-header__cta-arrow"
            >
              ↗
            </span>
          </Link>


          {/* HAMBURGER */}

          <button
            type="button"
            className={`sfd-menu ${
              menuOpen
                ? "sfd-menu--open"
                : ""
            }`}
            onClick={toggleMenu}
            aria-label={
              menuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            aria-controls="sfd-mobile-menu"
          >
            <span />
            <span />
          </button>

        </div>

      </div>


      {/* MOBILE OVERLAY */}

      <div
        className={`sfd-mobile-overlay ${
          menuOpen
            ? "sfd-mobile-overlay--open"
            : ""
        }`}
        onClick={closeMenu}
        aria-hidden="true"
      />


      {/* MOBILE MENU */}

      <div
        id="sfd-mobile-menu"
        className={`sfd-mobile-menu ${
          menuOpen
            ? "sfd-mobile-menu--open"
            : ""
        }`}
        aria-hidden={!menuOpen}
      >

        <div className="sfd-mobile-menu__top">

          <div>
            <span className="sfd-mobile-menu__label">
              SFD INSIGHTS
            </span>

            <p>
              Public opinion,
              <br />
              clearly presented.
            </p>
          </div>

          <button
            type="button"
            className="sfd-mobile-close"
            onClick={closeMenu}
            aria-label="Close navigation menu"
          >
            <span />
            <span />
          </button>

        </div>


        <nav
          className="sfd-mobile-menu__nav"
          aria-label="Mobile navigation"
        >

          <NavLink
            to="/"
            end
            onClick={closeMenu}
            className={({ isActive }) =>
              `sfd-mobile-link ${
                isActive
                  ? "sfd-mobile-link--active"
                  : ""
              }`
            }
          >
            <span className="sfd-mobile-link__number">
              01
            </span>

            <strong>
              Home
            </strong>

            <span
              aria-hidden="true"
              className="sfd-mobile-link__arrow"
            >
              →
            </span>
          </NavLink>


          <NavLink
            to="/polls"
            onClick={closeMenu}
            className={({ isActive }) =>
              `sfd-mobile-link ${
                isActive
                  ? "sfd-mobile-link--active"
                  : ""
              }`
            }
          >
            <span className="sfd-mobile-link__number">
              02
            </span>

            <strong>
              Explore polls
            </strong>

            <span
              aria-hidden="true"
              className="sfd-mobile-link__arrow"
            >
              →
            </span>
          </NavLink>


          <NavLink
            to="/polls/general"
            onClick={closeMenu}
            className={({ isActive }) =>
              `sfd-mobile-link ${
                isActive
                  ? "sfd-mobile-link--active"
                  : ""
              }`
            }
          >
            <span className="sfd-mobile-link__number">
              03
            </span>

            <strong>
              Public opinion
            </strong>

            <span
              aria-hidden="true"
              className="sfd-mobile-link__arrow"
            >
              →
            </span>
          </NavLink>


          <NavLink
            to="/about"
            onClick={closeMenu}
            className={({ isActive }) =>
              `sfd-mobile-link ${
                isActive
                  ? "sfd-mobile-link--active"
                  : ""
              }`
            }
          >
            <span className="sfd-mobile-link__number">
              04
            </span>

            <strong>
              About SFD
            </strong>

            <span
              aria-hidden="true"
              className="sfd-mobile-link__arrow"
            >
              →
            </span>
          </NavLink>


          <NavLink
            to="/services"
            onClick={closeMenu}
            className={({ isActive }) =>
              `sfd-mobile-link ${
                isActive
                  ? "sfd-mobile-link--active"
                  : ""
              }`
            }
          >
            <span className="sfd-mobile-link__number">
              05
            </span>

            <strong>
              Services
            </strong>

            <span
              aria-hidden="true"
              className="sfd-mobile-link__arrow"
            >
              →
            </span>
          </NavLink>

        </nav>


        <div className="sfd-mobile-menu__bottom">

          <Link
            to="/polls"
            className="sfd-mobile-menu__cta"
            onClick={closeMenu}
          >
            <span>
              Find a poll
            </span>

            <strong aria-hidden="true">
              ↗
            </strong>
          </Link>


          <div className="sfd-mobile-menu__meta">
            <span>
              SFD INSIGHTS
            </span>

            <span>
              KENYA
            </span>
          </div>

        </div>

      </div>

    </header>
  );
}