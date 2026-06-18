import { useState } from 'react';
import { Clock3, FileText, ShieldAlert, Trash2, X } from 'lucide-react';

function HistoryPanel({ history, onDeleteHistory, onClearHistory }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());

  const handleDeleteClick = (id) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async (id) => {
    setDeletingIds((prev) => new Set([...prev, id]));
    setConfirmDeleteId(null);
    setTimeout(() => {
      onDeleteHistory(id);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  };

  const handleConfirmClearAll = () => {
    setConfirmClearAll(false);
    onClearHistory();
  };

  return (
    <section className="historyPanel glassCard staggerItem" aria-label="Upload history">
      <div className="sectionTitle" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock3 size={18} />
          <h2>Upload History</h2>
        </div>
        {history.length > 0 && (
          <div style={{ position: 'relative' }}>
            {confirmClearAll ? (
              <div className="confirmTooltip">
                <span>Clear all?</span>
                <button className="confirmYes" onClick={handleConfirmClearAll} type="button">Yes</button>
                <button className="confirmNo" onClick={() => setConfirmClearAll(false)} type="button">No</button>
              </div>
            ) : (
              <button className="clearAllBtn" onClick={() => setConfirmClearAll(true)} type="button" title="Clear all history">
                <Trash2 size={13} />
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      <div className="historyList">
        {history.length === 0 ? (
          <p className="mutedText">No reviewed files yet in this session.</p>
        ) : (
          history.map((item) => {
            const itemId = item.id || `${item.document_name}-${item.reviewed_at}`;
            const isDeleting = deletingIds.has(itemId);
            return (
              <article className={`historyItem ${isDeleting ? 'historyItemDeleting' : ''}`} key={itemId}>
                <FileText size={16} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{item.document_name}</strong>
                  <span>{new Date(item.reviewed_at).toLocaleString()}</span>
                </div>
                <div className="historyMeta">
                  <span>{item.risk_score}/100</span>
                  <small>
                    <ShieldAlert size={12} />
                    {item.authenticity_status.replaceAll('_', ' ')}
                  </small>
                </div>
                <div className="historyDeleteWrapper">
                  {confirmDeleteId === itemId ? (
                    <div className="confirmTooltip">
                      <span>Delete?</span>
                      <button className="confirmYes" onClick={() => handleConfirmDelete(itemId)} type="button">Yes</button>
                      <button className="confirmNo" onClick={() => setConfirmDeleteId(null)} type="button">No</button>
                    </div>
                  ) : (
                    <button className="deleteHistoryBtn" onClick={() => handleDeleteClick(itemId)} type="button" title="Delete this entry">
                      <X size={13} />
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

export default HistoryPanel;
