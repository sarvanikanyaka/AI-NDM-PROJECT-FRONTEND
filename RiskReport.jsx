import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleX,
  FileText,
  Info,
  MessageSquareText,
  ShieldAlert,
} from 'lucide-react';

const suggestions = [
  'What is the biggest risk in this contract?',
  'Is this NDA fair to both parties?',
  'What clauses should I negotiate?',
];

const riskStyles = {
  HIGH: {
    label: 'RED',
    icon: CircleX,
  },
  MEDIUM: {
    label: 'YELLOW',
    icon: AlertTriangle,
  },
  LOW: {
    label: 'GREEN',
    icon: CheckCircle2,
  },
};

function RiskReport({ report, onAskSuggestion }) {
  const [displayScore, setDisplayScore] = useState(0);
  const scoreLevel = getScoreLevel(report.risk_score);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (displayScore / 100) * circumference;

  useEffect(() => {
    let frameId;
    const start = performance.now();
    const duration = 1100;
    const animate = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      setDisplayScore(Math.round(report.risk_score * easeOutCubic(progress)));
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [report.risk_score]);

  const sortedFlags = useMemo(
    () =>
      [...report.flags].sort(
        (first, second) => riskWeight(second.risk_level) - riskWeight(first.risk_level),
      ),
    [report.flags],
  );

  return (
    <article className="riskReport">
      <header className="reportHeader">
        <div>
          <span className="liveBadge">Live API Response</span>
          <h2>{report.document_name}</h2>
          <p>{report.summary}</p>
        </div>
        <div className={`scoreRing ${scoreLevel}`}>
          <svg viewBox="0 0 132 132" aria-label={`Risk score ${report.risk_score}`}>
            <circle className="scoreTrack" cx="66" cy="66" r="54" />
            <circle
              className="scoreProgress"
              cx="66"
              cy="66"
              r="54"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="scoreContent">
            <strong>{displayScore}</strong>
            <span>/100</span>
          </div>
        </div>
      </header>

      <section className="qualityStrip" aria-label="Retrieval quality">
        <Info size={17} />
        <span>Top similarity</span>
        <strong>{formatMetric(report.retrieval_quality?.top_similarity)}</strong>
        <span>Mean similarity</span>
        <strong>{formatMetric(report.retrieval_quality?.mean_similarity)}</strong>
      </section>

      <section className={`authenticityBanner ${authenticityClass(report.authenticity_status)}`}>
        <ShieldAlert size={21} />
        <div>
          <strong>{formatAuthenticity(report.authenticity_status)}</strong>
          <p>{report.authenticity_explanation || 'Authenticity signal is not available.'}</p>
        </div>
        <span>{report.authenticity_score || 0}% confidence</span>
      </section>

      <div className="flagList">
        {sortedFlags.map((flag, index) => (
          <RiskFlag flag={flag} index={index} key={`${flag.clause_name}-${flag.risk_level}`} />
        ))}
      </div>

      <section className="suggestionPanel" aria-label="Suggested legal questions">
        <div className="sectionTitle compact">
          <MessageSquareText size={18} />
          <h2>Smart Suggestions</h2>
        </div>
        <div className="suggestionGrid">
          {suggestions.map((question) => (
            <button type="button" key={question} onClick={() => onAskSuggestion?.(question)}>
              {question}
            </button>
          ))}
        </div>
      </section>
    </article>
  );
}

function RiskFlag({ flag, index }) {
  const style = riskStyles[flag.risk_level] || riskStyles.LOW;
  const Icon = style.icon;
  return (
    <section
      className={`riskFlag ${flag.risk_level.toLowerCase()}`}
      style={{ animationDelay: `${index * 110}ms` }}
    >
      <div className="flagHead">
        <div className="flagTitle">
          <Icon size={23} />
          <div>
            <h3>{flag.clause_name}</h3>
            <span>{style.label} flag</span>
          </div>
        </div>
        <div className="flagMeta">
          <span className={`riskBadge ${flag.risk_level.toLowerCase()}`}>{style.label}</span>
          <ShieldAlert size={20} />
        </div>
      </div>
      <p>{flag.plain_english_explanation}</p>
      {flag.evidence ? (
        <div className="evidenceBox">
          <FileText size={16} />
          <span>{flag.evidence}</span>
        </div>
      ) : null}
    </section>
  );
}

function getScoreLevel(score) {
  if (score <= 40) {
    return 'scoreRed';
  }
  if (score <= 70) {
    return 'scoreAmber';
  }
  return 'scoreGreen';
}

function riskWeight(level) {
  return { HIGH: 3, MEDIUM: 2, LOW: 1 }[level] || 0;
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
}

function formatMetric(value) {
  if (typeof value !== 'number') {
    return '0.000';
  }
  return value.toFixed(3);
}

function authenticityClass(status) {
  if (status === 'LIKELY_VALID_NDA') {
    return 'valid';
  }
  if (status === 'NEEDS_MANUAL_CHECK') {
    return 'check';
  }
  return 'fake';
}

function formatAuthenticity(status) {
  if (!status) {
    return 'Authenticity unknown';
  }
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default RiskReport;
