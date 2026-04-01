import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import '../styles/shared.css';
import './AdminDashboard.css';

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(String(dateStr));
  if (isNaN(d)) return String(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function AdminEmailLog() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState('desc');

  const load = useCallback(async (p) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20, sort, order };
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (statusFilter) params.status = statusFilter;
      const data = await api.getAdminEmailLog(params);
      setLogs(data.logs);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [sort, order, fromDate, toDate, statusFilter]);

  useEffect(() => { setPage(1); load(1); }, [load]);

  const handlePage = (p) => {
    setPage(p);
    load(p);
  };

  const handleSort = (col) => {
    if (sort === col) {
      setOrder(o => o === 'desc' ? 'asc' : 'desc');
    } else {
      setSort(col);
      setOrder('desc');
    }
  };

  const sortArrow = (col) => {
    if (sort !== col) return <span className="sort-arrow">&#8597;</span>;
    return <span className="sort-arrow active">{order === 'desc' ? '&#9660;' : '&#9650;'}</span>;
  };

  return (
    <div className="admin-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <a href="/admin" className="btn btn-secondary btn-small">&larr; Back</a>
        <h2 style={{ margin: 0 }}>Email Log ({total})</h2>
      </div>

      <div className="email-log-filters">
        <div className="email-log-filter-group">
          <label className="period-date-label">From</label>
          <input type="date" className="period-date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="email-log-filter-group">
          <label className="period-date-label">To</label>
          <input type="date" className="period-date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="email-log-filter-group">
          <label className="period-date-label">Status</label>
          <select className="period-date" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="sent">Sent</option>
            <option value="partial">Partial</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        {(fromDate || toDate || statusFilter) && (
          <button className="btn btn-secondary btn-small" onClick={() => { setFromDate(''); setToDate(''); setStatusFilter(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      <div className="data-table-wrap" style={{ maxHeight: 'none' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('date')}>Date {sortArrow('date')}</th>
              <th onClick={() => handleSort('subject')}>Subject {sortArrow('subject')}</th>
              <th onClick={() => handleSort('recipients')}>Recipients {sortArrow('recipients')}</th>
              <th onClick={() => handleSort('status')}>Status {sortArrow('status')}</th>
              <th>Sent By</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>Loading...</td></tr>
            )}
            {!loading && logs.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-subdued)' }}>No emails found</td></tr>
            )}
            {!loading && logs.map(log => (
              <tr key={log.id} className="email-log-table-row" onClick={() => setExpanded(expanded === log.id ? null : log.id)} style={{ cursor: 'pointer' }}>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.createdAt)}</td>
                <td>
                  {log.subject}
                  {log.status === 'failed' && <span className="email-log-badge failed" style={{ marginLeft: 8 }}>Failed</span>}
                  {log.status === 'partial' && <span className="email-log-badge partial" style={{ marginLeft: 8 }}>Partial</span>}
                </td>
                <td>{log.recipientCount}</td>
                <td>
                  <span className={`email-log-status-label ${log.status}`}>{log.status}</span>
                </td>
                <td>{log.sentByName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {expanded && (() => {
        const log = logs.find(l => l.id === expanded);
        if (!log) return null;
        return (
          <div className="email-log-expanded-panel">
            <div className="email-log-expanded-header">
              <h3>{log.subject}</h3>
              <button className="btn btn-secondary btn-small" onClick={() => setExpanded(null)}>Close</button>
            </div>
            <div className="email-log-expanded-meta">
              {formatDateTime(log.createdAt)} &bull; Sent by {log.sentByName} &bull; {log.recipientCount} recipient{log.recipientCount !== 1 ? 's' : ''}
            </div>

            <div className="email-log-recipients" style={{ marginTop: 16 }}>
              <strong>Recipients:</strong>
              <div className="email-log-recipient-list">
                {log.recipients.map((r, i) => (
                  <div key={i} className="email-log-recipient-row">
                    <span className={`email-log-status-dot ${r.status === 'sent' ? 'sent' : r.status === 'failed' ? 'failed' : ''}`}>
                      {r.status === 'sent' ? '\u2713' : r.status === 'failed' ? '\u2717' : '\u2013'}
                    </span>
                    <span className="email-log-recipient-name">{r.name}</span>
                    <span className="email-log-recipient-email">{r.email}</span>
                    {r.error && <span className="email-log-recipient-error">{r.error}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="email-log-body" style={{ marginTop: 16 }} dangerouslySetInnerHTML={{ __html: log.bodyHtml }} />
            {log.errorMessage && <div className="email-log-error">Error: {log.errorMessage}</div>}
          </div>
        );
      })()}

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-small" disabled={page <= 1} onClick={() => handlePage(page - 1)}>Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button className="btn btn-secondary btn-small" disabled={page >= totalPages} onClick={() => handlePage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
