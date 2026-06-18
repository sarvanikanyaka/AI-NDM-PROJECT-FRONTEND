import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Activity, BarChart3, FileSearch, Scale, Sparkles, TrendingUp } from 'lucide-react';
import AuthGate from './AuthGate.jsx';
import ChatAssistant from './ChatAssistant.jsx';
import HistoryPanel from './HistoryPanel.jsx';
import RiskReport from './RiskReport.jsx';
import Upload from './Upload.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const emptyMetrics = {
  total_contracts_reviewed: 0,
  average_risk_score: 0,
  most_flagged_clause_type: null,
  clause_counts: {},
};

function App() {
  const [report, setReport] = useState(null);
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiStatus, setApiStatus] = useState('checking');
  const [queuedQuestion, setQueuedQuestion] = useState(null);
  const [auth, setAuth] = useState(() => {
    const saved = window.localStorage.getItem('legalReviewAuth');
    return saved ? JSON.parse(saved) : null;
  });
  const [history, setHistory] = useState([]);

  const api = useMemo(
    () =>
      axios.create({
        baseURL: API_BASE_URL,
        timeout: 120000,
      }),
    [],
  );

  const refreshMetrics = useCallback(async () => {
    const response = await api.get('/metrics');
    setMetrics(response.data);
    setApiStatus('online');
  }, [api]);

  const refreshHistory = useCallback(async () => {
    if (!auth?.token) {
      setHistory([]);
      return;
    }
    const response = await api.get('/api/history', {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    setHistory(response.data);
  }, [api, auth]);

  useEffect(() => {
    refreshMetrics().catch(() => {
      setMetrics(emptyMetrics);
      setApiStatus('offline');
    });
  }, [refreshMetrics]);

  useEffect(() => {
    refreshHistory().catch(() => setHistory([]));
  }, [refreshHistory]);

  const contractContext = useMemo(() => buildContractContext(report), [report]);

  const handleReview = async (file) => {
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post('/review', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${auth.token}`,
        },
      });
      setReport(response.data);
      await refreshMetrics();
      await refreshHistory();
    } catch (requestError) {
      const status = requestError.response?.status;
      const message =
        requestError.response?.data?.detail ||
        requestError.message ||
        'The review did not finish in the browser request.';
      const prefix = status ? `API ${status}: ` : '';
      const hint =
        status === 400
          ? ' This usually means the PDF is corrupted, image-only, blank, non-English, or not a valid PDF.'
          : ' Confirm the backend is running and try again.';
      setError(`${prefix}${message}${hint}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (question) => {
    setQueuedQuestion({ id: Date.now(), text: question });
  };

  const handleAuthenticated = (payload) => {
    window.localStorage.setItem('legalReviewAuth', JSON.stringify(payload));
    setAuth(payload);
  };

  const handleLogout = () => {
    window.localStorage.removeItem('legalReviewAuth');
    setAuth(null);
    setReport(null);
    setHistory([]);
  };

  // ── Delete single history item ──
  const handleDeleteHistory = async (id) => {
    try {
      await api.delete(`/api/history/${id}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      await refreshHistory();
    } catch (e) {
      console.error('Delete history item failed:', e);
      // Optimistic removal even if backend fails
      setHistory((prev) => prev.filter((item) => (item.id || `${item.document_name}-${item.reviewed_at}`) !== id));
    }
  };

  // ── Clear all history ──
  const handleClearHistory = async () => {
    try {
      await api.delete('/api/history', {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setHistory([]);
    } catch (e) {
      console.error('Clear all history failed:', e);
      // Optimistic clear even if backend fails
      setHistory([]);
    }
  };

  if (!auth) {
    return <AuthGate api={api} onAuthenticated={handleAuthenticated} />;
  }

  return (
    <main className="appShell">
      <div className="ambientGlow one" />
      <div className="ambientGlow two" />
      <nav className="topBar">
        <div className="brandCluster">
          <div className="brandMark" aria-hidden="true">
            <Scale size={29} />
          </div>
          <div>
            <h1>Legal Contract Review Agent</h1>
            <p>AI-powered NDA risk detection with clause-level evidence.</p>
          </div>
        </div>
        <div className="statusCluster">
          <span className="capstoneBadge">Signed in: {auth.name}</span>
          <button className="logoutButton" type="button" onClick={handleLogout}>
            Logout
          </button>
          <span className="capstoneBadge">Hexaware GenAI Capstone</span>
          <span className={`ragBadge ${apiStatus}`}>
            <Activity size={16} />
            {apiStatus === 'online' ? 'API Online' : 'LangGraph RAG'}
          </span>
        </div>
      </nav>

      <section className="workspace">
        <aside className="leftRail">
          <Upload onReview={handleReview} loading={loading} error={error} apiStatus={apiStatus} />
          <MetricsDashboard metrics={metrics} />
          <HistoryPanel
            history={history}
            onDeleteHistory={handleDeleteHistory}
            onClearHistory={handleClearHistory}
          />
        </aside>

        <section className="reportPanel glassCard" aria-label="Risk report workspace">
          {loading ? (
            <LoadingState />
          ) : report ? (
            <RiskReport report={report} onAskSuggestion={handleSuggestion} />
          ) : (
            <EmptyState />
          )}
        </section>
      </section>

      <ChatAssistant
        apiBaseUrl={API_BASE_URL}
        contractContext={contractContext}
        queuedQuestion={queuedQuestion}
      />
    </main>
  );
}

function MetricsDashboard({ metrics }) {
  const clauseEntries = Object.entries(metrics.clause_counts || {});
  return (
    <section className="metricsPanel glassCard staggerItem" aria-label="Metrics dashboard">
      <div className="sectionTitle">
        <BarChart3 size={18} />
        <h2>Live Metrics</h2>
      </div>
      <div className="metricGrid premiumMetrics">
        <Metric
          icon={<Activity size={18} />}
          label="Reviewed"
          value={metrics.total_contracts_reviewed}
        />
        <Metric
          icon={<TrendingUp size={18} />}
          label="Avg. Score"
          value={metrics.average_risk_score}
        />
        <Metric
          icon={<Sparkles size={18} />}
          label="Most Flagged"
          value={metrics.most_flagged_clause_type || 'None'}
        />
      </div>
      <div className="clauseBars">
        {clauseEntries.length === 0 ? (
          <p className="mutedText">Clause metrics appear after the first review.</p>
        ) : (
          clauseEntries.map(([clause, count]) => (
            <div className="clauseBar" key={clause}>
              <span>{clause}</span>
              <meter min="0" max="10" value={Math.min(count, 10)} aria-label={clause} />
              <strong>{count}</strong>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="metricTile">
      <div className="metricIcon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="stateBox" role="status" aria-live="polite">
      <div className="scanner">
        <FileSearch size={46} />
      </div>
      <h2>Reviewing contract</h2>
      <p>Parsing PDF, retrieving clauses, running legal risk analysis, and scoring exposure.</p>
      <div className="progressRail">
        <span />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="stateBox">
      <div className="scanner idle">
        <FileSearch size={46} />
      </div>
      <h2>Upload an NDA PDF</h2>
      <p>The live report will show risk score, clause flags, evidence, and plain-English explanations.</p>
    </div>
  );
}

function buildContractContext(report) {
  if (!report) {
    return '';
  }
  const flagText = report.flags
    .map(
      (flag) =>
        `${flag.clause_name}: ${flag.risk_level}. ${flag.plain_english_explanation}. Evidence: ${
          flag.evidence || 'Not available'
        }`,
    )
    .join('\n');
  return [
    `Document: ${report.document_name}`,
    `Risk score: ${report.risk_score}/100`,
    `Summary: ${report.summary}`,
    `Retrieval quality: ${JSON.stringify(report.retrieval_quality || {})}`,
    flagText,
  ].join('\n');
}

export default App;
