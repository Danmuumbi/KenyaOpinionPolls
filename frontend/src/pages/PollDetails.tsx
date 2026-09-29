import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getPollResults,
  getPublicPoll,
} from "../api/public";

import type {
  PollResults,
  PublicPollDetails,
} from "../api/public";

export default function PollDetails() {
  const { pollId } = useParams<{ pollId: string }>();

  const [poll, setPoll] = useState<PublicPollDetails | null>(null);
  const [results, setResults] = useState<PollResults | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pollId) return;

    const loadPoll = async () => {
      try {
        setLoading(true);
        setError("");

        const pollData = await getPublicPoll(pollId);
        setPoll(pollData);

        if (pollData.allowResults) {
          const resultData = await getPollResults(pollId);
          setResults(resultData);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load this poll."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPoll();
  }, [pollId]);

  const summaries = useMemo(() => {
    if (!results) return [];

    return results.questions.map((question) => {
      const options = [...question.options].sort(
        (a, b) => b.percentage - a.percentage
      );

      if (question.totalResponses === 0 || options.length === 0) {
        return {
          questionId: question.id,
          text: "There are not yet enough responses to generate a poll summary.",
        };
      }

      const first = options[0];
      const second = options[1];

      const firstName = first.candidate?.name || first.label;
      const firstPercentage = first.percentage;

      if (firstPercentage === 0) {
        return {
          questionId: question.id,
          text: "Responses have not yet produced a measurable level of support for any option.",
        };
      }

      if (
        second &&
        Math.abs(first.percentage - second.percentage) <= 5
      ) {
        const secondName = second.candidate?.name || second.label;

        return {
          questionId: question.id,
          text: `${firstName} currently has the largest share of expressed support, with ${secondName} relatively close behind.`,
        };
      }

      if (firstPercentage >= 50) {
        return {
          questionId: question.id,
          text: `${firstName} currently has the largest share of expressed support in this poll, with more than half of the recorded percentage distribution.`,
        };
      }

      return {
        questionId: question.id,
        text: `${firstName} currently has the largest share of expressed support in this poll.`,
      };
    });
  }, [results]);

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading poll results...</p>
        </div>
      </main>
    );
  }

  if (error || !poll) {
    return (
      <main style={styles.page}>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>!</div>

          <h1 style={styles.errorTitle}>Unable to load poll</h1>

          <p style={styles.errorText}>
            {error || "This poll could not be found."}
          </p>

          <Link to="/polls" style={styles.backButton}>
            Back to Polls
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <style>{`
        @keyframes pollSpinner {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={styles.container}>
        <Link to="/polls" style={styles.backLink}>
          ← Back to Polls
        </Link>

        <section style={styles.header}>
          <div style={styles.badge}>Opinion Poll</div>

          <h1 style={styles.title}>{poll.title}</h1>

          {poll.description && (
            <p style={styles.description}>{poll.description}</p>
          )}

          <div style={styles.metaRow}>
            {poll.position?.name && (
              <span style={styles.metaItem}>
                <span style={styles.metaIcon}>◉</span>
                {poll.position.name}
              </span>
            )}

            {poll.targetCounty?.name && (
              <span style={styles.metaItem}>
                <span style={styles.metaIcon}>⌖</span>
                {poll.targetCounty.name}
              </span>
            )}

            {poll.targetConstituency?.name && (
              <span style={styles.metaItem}>
                {poll.targetConstituency.name}
              </span>
            )}

            {poll.targetWard?.name && (
              <span style={styles.metaItem}>
                {poll.targetWard.name}
              </span>
            )}
          </div>
        </section>

        {!poll.allowResults ? (
          <section style={styles.unavailableCard}>
            <div style={styles.unavailableIcon}>◌</div>

            <h2 style={styles.unavailableTitle}>
              Results are currently unavailable
            </h2>

            <p style={styles.unavailableText}>
              The poll administrator has chosen not to display
              public statistics for this poll at this time.
            </p>

            <Link
              to={`/polls/${poll.id}/participate`}
              style={styles.primaryButton}
            >
              Participate in this Poll
            </Link>
          </section>
        ) : (
          <>
            <section style={styles.resultsIntro}>
              <div>
                <p style={styles.eyebrow}>
                  CURRENT POLL DISTRIBUTION
                </p>

                <h2 style={styles.resultsTitle}>
                  What people are saying
                </h2>

                <p style={styles.resultsDescription}>
                  The percentages below show how responses are
                  currently distributed among the available
                  options.
                </p>
              </div>

              <div style={styles.liveIndicator}>
                <span style={styles.liveDot} />
                Live results
              </div>
            </section>

            {results && results.questions.length > 0 ? (
              results.questions.map((question, questionIndex) => {
                const summary = summaries.find(
                  (item) => item.questionId === question.id
                );

                const sortedOptions = [...question.options].sort(
                  (a, b) => b.percentage - a.percentage
                );

                return (
                  <section
                    key={question.id}
                    style={styles.questionCard}
                  >
                    <div style={styles.questionHeader}>
                      <div>
                        <span style={styles.questionNumber}>
                          {String(questionIndex + 1).padStart(2, "0")}
                        </span>

                        <h3 style={styles.questionTitle}>
                          {question.question}
                        </h3>
                      </div>
                    </div>

                    {summary && (
                      <div style={styles.summaryCard}>
                        <div style={styles.summaryIcon}>✦</div>

                        <div>
                          <p style={styles.summaryLabel}>
                            Poll Summary
                          </p>

                          <p style={styles.summaryText}>
                            {summary.text}
                          </p>
                        </div>
                      </div>
                    )}

                    <div style={styles.resultsList}>
                      {sortedOptions.map((option, index) => {
                        const candidate = option.candidate;

                        const candidateName =
                          candidate?.name || option.label;

                        const percentage = Math.max(
                          0,
                          Math.min(100, option.percentage)
                        );

                        const isLeading =
                          index === 0 && percentage > 0;

                        return (
                          <article
                            key={option.id}
                            style={{
                              ...styles.candidateCard,
                              ...(isLeading
                                ? styles.leadingCandidate
                                : {}),
                            }}
                          >
                            <div style={styles.candidateTop}>
                              <div style={styles.candidateIdentity}>
                                {candidate?.photoUrl ? (
                                  <img
                                    src={candidate.photoUrl}
                                    alt={candidate.name}
                                    style={styles.candidateImage}
                                  />
                                ) : (
                                  <div
                                    style={
                                      styles.candidatePlaceholder
                                    }
                                  >
                                    {candidateName
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                )}

                                <div>
                                  <div
                                    style={styles.candidateNameRow}
                                  >
                                    <h4
                                      style={styles.candidateName}
                                    >
                                      {candidateName}
                                    </h4>

                                    {isLeading && (
                                      <span
                                        style={styles.leadingBadge}
                                      >
                                        Leading
                                      </span>
                                    )}
                                  </div>

                                  {candidate?.party && (
                                    <p style={styles.partyName}>
                                      {candidate.party}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div style={styles.percentageBlock}>
                                <strong style={styles.percentage}>
                                  {percentage.toFixed(1)}%
                                </strong>
                              </div>
                            </div>

                            <div style={styles.barTrack}>
                              <div
                                style={{
                                  ...styles.barFill,
                                  width: `${percentage}%`,
                                }}
                              />
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })
            ) : (
              <section style={styles.emptyCard}>
                <div style={styles.emptyIcon}>○</div>

                <h2 style={styles.emptyTitle}>
                  No responses yet
                </h2>

                <p style={styles.emptyText}>
                  There are currently no responses available
                  for this poll.
                </p>
              </section>
            )}

            <section style={styles.participateCard}>
              <div>
                <p style={styles.participateEyebrow}>
                  HAVE YOUR SAY
                </p>

                <h2 style={styles.participateTitle}>
                  Add your opinion
                </h2>

                <p style={styles.participateText}>
                  Participate in this poll and add your response
                  to the current public opinion distribution.
                </p>
              </div>

              <Link
                to={`/polls/${poll.id}/participate`}
                style={styles.primaryButton}
              >
                Participate in this Poll
                <span>→</span>
              </Link>
            </section>

            {(poll.methodologyNote ||
              poll.disclosureNote) && (
              <section style={styles.informationSection}>
                <h2 style={styles.informationTitle}>
                  About this poll
                </h2>

                {poll.methodologyNote && (
                  <div style={styles.infoBlock}>
                    <h3>Methodology</h3>
                    <p>{poll.methodologyNote}</p>
                  </div>
                )}

                {poll.disclosureNote && (
                  <div style={styles.infoBlock}>
                    <h3>Disclosure</h3>
                    <p>{poll.disclosureNote}</p>
                  </div>
                )}
              </section>
            )}

            <section style={styles.notice}>
              <div style={styles.noticeIcon}>i</div>

              <div>
                <h3 style={styles.noticeTitle}>
                  Important information
                </h3>

                <p style={styles.noticeText}>
                  These figures represent responses submitted
                  through this opinion poll. They are not official
                  election results and should not be interpreted
                  as an official election outcome.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    color: "#0f172a",
    padding: "40px 20px 80px",
  },

  container: {
    width: "100%",
    maxWidth: "1050px",
    margin: "0 auto",
  },

  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    color: "#64748b",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "28px",
  },

  header: {
    background:
      "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
    color: "#fff",
    borderRadius: "24px",
    padding: "42px",
    marginBottom: "30px",
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.12)",
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 12px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.18)",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "18px",
  },

  title: {
    margin: 0,
    fontSize: "clamp(30px, 5vw, 48px)",
    lineHeight: 1.08,
    letterSpacing: "-0.03em",
  },

  description: {
    maxWidth: "750px",
    margin: "18px 0 0",
    color: "rgba(255,255,255,0.78)",
    fontSize: "16px",
    lineHeight: 1.7,
  },

  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "26px",
  },

  metaItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "8px 12px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.82)",
    fontSize: "13px",
  },

  metaIcon: {
    color: "#93c5fd",
  },

  resultsIntro: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "24px",
    marginBottom: "20px",
  },

  eyebrow: {
    margin: "0 0 8px",
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.12em",
  },

  resultsTitle: {
    margin: 0,
    fontSize: "30px",
    letterSpacing: "-0.025em",
  },

  resultsDescription: {
    margin: "9px 0 0",
    maxWidth: "650px",
    color: "#64748b",
    lineHeight: 1.6,
    fontSize: "15px",
  },

  liveIndicator: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "#ecfdf5",
    color: "#047857",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  liveDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#10b981",
  },

  questionCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "22px",
    padding: "28px",
    marginBottom: "20px",
    boxShadow: "0 8px 25px rgba(15, 23, 42, 0.045)",
  },

  questionHeader: {
    marginBottom: "20px",
  },

  questionNumber: {
    display: "block",
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.1em",
    marginBottom: "6px",
  },

  questionTitle: {
    margin: 0,
    fontSize: "21px",
    lineHeight: 1.35,
    color: "#0f172a",
  },

  summaryCard: {
    display: "flex",
    gap: "13px",
    alignItems: "flex-start",
    padding: "16px",
    borderRadius: "16px",
    background: "#eff6ff",
    border: "1px solid #dbeafe",
    marginBottom: "20px",
  },

  summaryIcon: {
    width: "34px",
    height: "34px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "10px",
    background: "#2563eb",
    color: "#fff",
    fontSize: "17px",
    fontWeight: 800,
  },

  summaryLabel: {
    margin: "0 0 4px",
    color: "#1d4ed8",
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  summaryText: {
    margin: 0,
    color: "#334155",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  resultsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  candidateCard: {
    padding: "17px",
    borderRadius: "17px",
    border: "1px solid #e2e8f0",
    background: "#fff",
  },

  leadingCandidate: {
    border: "1px solid #bfdbfe",
    background: "#f8fbff",
  },

  candidateTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "13px",
  },

  candidateIdentity: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    minWidth: 0,
  },

  candidateImage: {
    width: "52px",
    height: "52px",
    borderRadius: "14px",
    objectFit: "cover",
    flexShrink: 0,
    border: "1px solid #e2e8f0",
  },

  candidatePlaceholder: {
    width: "52px",
    height: "52px",
    borderRadius: "14px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#e2e8f0",
    color: "#475569",
    fontSize: "20px",
    fontWeight: 800,
  },

  candidateNameRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
  },

  candidateName: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 750,
    color: "#0f172a",
  },

  partyName: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  leadingBadge: {
    display: "inline-flex",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "10px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },

  percentageBlock: {
    flexShrink: 0,
    textAlign: "right",
  },

  percentage: {
    color: "#0f172a",
    fontSize: "22px",
    letterSpacing: "-0.03em",
  },

  barTrack: {
    width: "100%",
    height: "9px",
    overflow: "hidden",
    borderRadius: "999px",
    background: "#e2e8f0",
  },

  barFill: {
    height: "100%",
    minWidth: "0",
    borderRadius: "999px",
    background:
      "linear-gradient(90deg, #2563eb, #60a5fa)",
    transition: "width 0.7s ease",
  },

  participateCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "25px",
    marginTop: "28px",
    padding: "30px",
    borderRadius: "22px",
    background: "#0f172a",
    color: "#fff",
  },

  participateEyebrow: {
    margin: "0 0 7px",
    color: "#93c5fd",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.1em",
  },

  participateTitle: {
    margin: 0,
    fontSize: "25px",
  },

  participateText: {
    margin: "8px 0 0",
    maxWidth: "620px",
    color: "#cbd5e1",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "13px 18px",
    borderRadius: "12px",
    background: "#2563eb",
    color: "#fff",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 700,
    whiteSpace: "nowrap",
    border: "none",
  },

  informationSection: {
    marginTop: "28px",
    padding: "25px",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
  },

  informationTitle: {
    margin: "0 0 20px",
    fontSize: "20px",
  },

  infoBlock: {
    marginBottom: "18px",
  },

  notice: {
    display: "flex",
    gap: "13px",
    marginTop: "18px",
    padding: "17px",
    borderRadius: "15px",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
  },

  noticeIcon: {
    width: "27px",
    height: "27px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#cbd5e1",
    color: "#334155",
    fontWeight: 800,
    fontSize: "13px",
  },

  noticeTitle: {
    margin: "0 0 5px",
    fontSize: "13px",
  },

  noticeText: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.6,
  },

  unavailableCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "22px",
    padding: "55px 30px",
    textAlign: "center",
  },

  unavailableIcon: {
    fontSize: "40px",
    color: "#64748b",
    marginBottom: "12px",
  },

  unavailableTitle: {
    margin: 0,
    fontSize: "24px",
  },

  unavailableText: {
    maxWidth: "550px",
    margin: "10px auto 25px",
    color: "#64748b",
    lineHeight: 1.6,
  },

  emptyCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "22px",
    padding: "55px 30px",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "42px",
    color: "#94a3b8",
    marginBottom: "10px",
  },

  emptyTitle: {
    margin: 0,
    fontSize: "22px",
  },

  emptyText: {
    margin: "8px 0 0",
    color: "#64748b",
  },

  loadingContainer: {
    minHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  spinner: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    border: "3px solid #dbeafe",
    borderTopColor: "#2563eb",
    animation: "pollSpinner 0.8s linear infinite",
  },

  loadingText: {
    marginTop: "14px",
    color: "#64748b",
    fontSize: "14px",
  },

  errorContainer: {
    maxWidth: "520px",
    margin: "100px auto",
    padding: "35px",
    background: "#fff",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    textAlign: "center",
  },

  errorIcon: {
    width: "42px",
    height: "42px",
    margin: "0 auto 15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#fee2e2",
    color: "#dc2626",
    fontWeight: 800,
  },

  errorTitle: {
    margin: 0,
    fontSize: "22px",
  },

  errorText: {
    margin: "10px 0 22px",
    color: "#64748b",
    lineHeight: 1.6,
  },

  backButton: {
    display: "inline-flex",
    padding: "11px 16px",
    borderRadius: "10px",
    background: "#0f172a",
    color: "#fff",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 700,
  },
};