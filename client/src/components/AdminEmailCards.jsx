import { useState, useEffect, useCallback, useRef } from 'react';
import DOMPurify from 'dompurify';
import ColorPalettePicker from './ColorPalettePicker';
import { api } from '../api';

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const str = String(dateStr);
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function EmailComposerCard() {
  const [families, setFamilies] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [excludeOptedOut, setExcludeOptedOut] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedFamilies, setExpandedFamilies] = useState(new Set());
  const [subject, setSubject] = useState('');
  const editorRef = useRef(null);
  const imgInputRef = useRef(null);
  const savedSelection = useRef(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const loadRecipients = useCallback(async (exclude) => {
    try {
      const data = await api.getAdminEmailRecipients('', exclude);
      setFamilies(data.families);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { loadRecipients(excludeOptedOut); }, [loadRecipients, excludeOptedOut]);

  const allUsers = families.flatMap(f => f.users);

  const toggleUser = (id) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleFamily = (family) => {
    const ids = family.users.map(u => u.id);
    setSelectedUsers(prev => {
      const next = new Set(prev);
      const allSelected = ids.every(id => next.has(id));
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const toggleExpandFamily = (familyId) => {
    setExpandedFamilies(prev => {
      const next = new Set(prev);
      if (next.has(familyId)) next.delete(familyId); else next.add(familyId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedUsers.size === allUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(allUsers.map(u => u.id)));
    }
  };

  const handleOptOutToggle = () => {
    const next = !excludeOptedOut;
    setExcludeOptedOut(next);
    setSelectedUsers(new Set());
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const html = editorRef.current?.innerHTML?.trim() || '';
    if (selectedUsers.size === 0 || !subject.trim() || !html || html === '<br>') return;
    setSending(true);
    setResult('');
    setError('');
    try {
      const res = await api.adminSendEmail({
        subject: subject.trim(),
        bodyHtml: html,
        userIds: [...selectedUsers],
      });
      setResult(`Email sent to ${res.sent} recipient${res.sent !== 1 ? 's' : ''}`);
      setSubject('');
      if (editorRef.current) editorRef.current.innerHTML = '';
      setSelectedUsers(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const optedOutCount = families.flatMap(f => f.users).filter(u => u.optedOut).length;

  return (
    <div className="system-card">
      <h3>Send Email</h3>
      <p className="system-description">Send a branded email to selected users.</p>

      <div className="email-filter-row">
        <button
          className={`email-filter-toggle ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
          title="Filter recipients"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 3h14M4 8h8M6 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Recipients
        </button>
        <span className="email-selected-count">{selectedUsers.size} selected</span>
      </div>

      {showFilters && (
        <div className="email-filter-panel">
          <div className="email-filter-options">
            <label className="email-opt-out-toggle">
              <input
                type="checkbox"
                checked={excludeOptedOut}
                onChange={handleOptOutToggle}
              />
              Exclude users who opted out of marketing emails
              {!excludeOptedOut && optedOutCount > 0 && <span className="email-opt-out-count">({optedOutCount} opted out)</span>}
            </label>
            <button className="btn btn-secondary btn-small" onClick={selectAll}>
              {selectedUsers.size === allUsers.length && allUsers.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="email-recipients-list">
            {families.map(f => {
              const familyUserIds = f.users.map(u => u.id);
              const allFamilySelected = familyUserIds.length > 0 && familyUserIds.every(id => selectedUsers.has(id));
              const someFamilySelected = familyUserIds.some(id => selectedUsers.has(id));
              const expanded = expandedFamilies.has(f.id);

              return (
                <div key={f.id} className="email-family-group">
                  <div className="email-family-header">
                    <label className="email-family-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={allFamilySelected}
                        ref={el => { if (el) el.indeterminate = someFamilySelected && !allFamilySelected; }}
                        onChange={() => toggleFamily(f)}
                      />
                    </label>
                    <div className="email-family-label" onClick={() => toggleExpandFamily(f.id)}>
                      <strong>{f.name}</strong>
                      <span className="email-family-count">{f.users.length}</span>
                      <span className={`email-expand-arrow ${expanded ? 'open' : ''}`}>&#9654;</span>
                    </div>
                  </div>
                  {expanded && f.users.map(u => (
                    <label key={u.id} className="email-user-row">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(u.id)}
                        onChange={() => toggleUser(u.id)}
                      />
                      <span className="email-user-name">{u.name}</span>
                      <span className="email-user-email">{u.email}</span>
                      <span className="email-user-role">{u.role}</span>
                      {u.optedOut && <span className="email-opted-out-badge">Opted out</span>}
                    </label>
                  ))}
                </div>
              );
            })}
            {families.length === 0 && <p style={{ color: 'var(--text-subdued)', fontSize: '0.875rem' }}>No users found</p>}
          </div>
        </div>
      )}

      <form onSubmit={handleSend} className="email-compose-form">
        <div className="form-field">
          <label>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Important update from FamilySync"
            maxLength={255}
            required
          />
        </div>
        <div className="form-field">
          <label>Message</label>
          <div className="rte-toolbar">
            <button type="button" className="rte-btn" title="Bold" onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold'); }}><strong>B</strong></button>
            <button type="button" className="rte-btn" title="Italic" onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic'); }}><em>I</em></button>
            <button type="button" className="rte-btn" title="Underline" onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline'); }}><u>U</u></button>
            <span className="rte-sep" />
            <select className="rte-select" title="Font Size" defaultValue="" onChange={(e) => { if (e.target.value) { document.execCommand('fontSize', false, e.target.value); e.target.value = ''; } }}>
              <option value="" disabled>Size</option>
              <option value="1">Small</option>
              <option value="3">Normal</option>
              <option value="5">Large</option>
              <option value="7">Huge</option>
            </select>
            <ColorPalettePicker
              onSelect={(color) => {
                if (savedSelection.current) {
                  const sel = window.getSelection();
                  sel.removeAllRanges();
                  sel.addRange(savedSelection.current);
                }
                document.execCommand('foreColor', false, color);
              }}
              onOpen={() => {
                const sel = window.getSelection();
                if (sel.rangeCount > 0) savedSelection.current = sel.getRangeAt(0).cloneRange();
              }}
            />
            <span className="rte-sep" />
            <button type="button" className="rte-btn" title="Bullet List" onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertUnorderedList'); }}>• List</button>
            <button type="button" className="rte-btn" title="Numbered List" onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertOrderedList'); }}>1. List</button>
            <span className="rte-sep" />
            <button type="button" className="rte-btn" title="Link" onMouseDown={(e) => { e.preventDefault(); const url = prompt('Enter URL:'); if (url) document.execCommand('createLink', false, url); }}>Link</button>
            <button type="button" className="rte-btn" title="Image from URL" onMouseDown={(e) => { e.preventDefault(); const url = prompt('Enter image URL:'); if (url) document.execCommand('insertImage', false, url); }}>Image URL</button>
            <button type="button" className="rte-btn" title="Upload Image" onMouseDown={(e) => { e.preventDefault(); imgInputRef.current?.click(); }}>Upload</button>
            <input
              ref={imgInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const res = await api.adminUploadImage(file);
                  editorRef.current?.focus();
                  document.execCommand('insertImage', false, res.url);
                } catch (err) {
                  setError(`Upload failed: ${err.message}`);
                }
                e.target.value = '';
              }}
            />
          </div>
          <div
            ref={editorRef}
            className="rte-editor"
            contentEditable
            role="textbox"
            aria-label="Email body"
            aria-multiline="true"
            data-placeholder="Write your email content here..."
            onInput={() => setError('')}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={sending || selectedUsers.size === 0 || !subject.trim()}
        >
          {sending ? 'Sending...' : `Send to ${selectedUsers.size} Recipient${selectedUsers.size !== 1 ? 's' : ''}`}
        </button>
      </form>

      {result && <div className="broadcast-result success">{result}</div>}
      {error && <div className="broadcast-result error">{error}</div>}
    </div>
  );
}

export function EmailLogCard() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.getAdminEmailLog({ limit: 5 })
      .then(data => { setLogs(data.logs); setTotal(data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="system-card">
      <div className="chart-section-header" style={{ marginBottom: 12 }}>
        <h3>Recent Emails ({total})</h3>
        {total > 5 && <a href="/admin/email-log" className="btn btn-secondary btn-small">View Full History</a>}
      </div>
      <p className="system-description">Last {Math.min(5, logs.length)} email{logs.length !== 1 ? 's' : ''} sent from the admin panel.</p>

      {loading && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading...</p>}

      {!loading && logs.length === 0 && (
        <p style={{ color: 'var(--text-subdued)', fontSize: '0.875rem', padding: '12px 0' }}>No emails sent yet</p>
      )}

      {logs.map(log => (
        <div key={log.id} className={`email-log-entry ${log.status === 'failed' ? 'failed' : ''}`}>
          <div className="email-log-header" role="button" tabIndex={0} aria-expanded={expanded === log.id} onClick={() => setExpanded(expanded === log.id ? null : log.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(expanded === log.id ? null : log.id); } }}>
            <div className="email-log-subject">
              {log.subject}
              {log.status === 'failed' && <span className="email-log-badge failed">Failed</span>}
              {log.status === 'partial' && <span className="email-log-badge partial">Partial</span>}
            </div>
            <div className="email-log-meta">
              <span>{log.recipientCount} recipient{log.recipientCount !== 1 ? 's' : ''}</span>
              <span className="email-log-dot">&bull;</span>
              <span>{log.sentByName}</span>
              <span className="email-log-dot">&bull;</span>
              <span>{formatDateTime(log.createdAt)}</span>
            </div>
          </div>
          {expanded === log.id && (
            <div className="email-log-details">
              <div className="email-log-recipients">
                <strong>Recipients:</strong>
                <div className="email-log-recipient-list">
                  {log.recipients.map((r, i) => (
                    <div key={i} className="email-log-recipient-row">
                      <span className={`email-log-status-dot ${r.status === 'sent' ? 'sent' : r.status === 'failed' ? 'failed' : ''}`}>
                        {r.status === 'sent' ? '✓' : r.status === 'failed' ? '✗' : '–'}
                      </span>
                      <span className="email-log-recipient-name">{r.name}</span>
                      <span className="email-log-recipient-email">{r.email}</span>
                      {r.error && <span className="email-log-recipient-error">{r.error}</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="email-log-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(log.bodyHtml) }} />
              {log.errorMessage && (
                <div className="email-log-error">Error: {log.errorMessage}</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function UnsubscribedUsersCard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminUnsubscribedUsers()
      .then(data => setUsers(data.users))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="system-card">
      <h3>Unsubscribed from Marketing Emails ({users.length})</h3>
      <p className="system-description">Users who have opted out of receiving marketing emails.</p>

      {loading && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading...</p>}

      {!loading && users.length === 0 && (
        <p style={{ color: 'var(--text-subdued)', fontSize: '0.875rem', padding: '12px 0' }}>No users have unsubscribed</p>
      )}

      {!loading && users.length > 0 && (
        <div className="unsub-list">
          {users.map(u => (
            <div key={u.id} className="unsub-user-row">
              <span className="unsub-user-name">{u.name}</span>
              <span className="unsub-user-email">{u.email}</span>
              <span className="unsub-user-family">{u.familyName || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function InactiveUsersCard() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [reactivating, setReactivating] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.getAdminInactiveUsers();
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectByFamily = (familyId) => {
    const familyUserIds = users.filter(u => u.familyId === familyId).map(u => u.id);
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = familyUserIds.every(id => next.has(id));
      familyUserIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map(u => u.id)));
    }
  };

  const handleReactivate = async () => {
    if (selected.size === 0) return;
    setReactivating(true);
    setResult('');
    setError('');
    try {
      const res = await api.adminReactivateUsers([...selected]);
      setResult(`${res.reactivated} account${res.reactivated !== 1 ? 's' : ''} reactivated`);
      setSelected(new Set());
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setReactivating(false);
    }
  };

  // Group by family
  const families = {};
  users.forEach(u => {
    const key = u.familyId || 'none';
    if (!families[key]) families[key] = { name: u.familyName || 'No Family', ref: u.familyRef || '', users: [] };
    families[key].users.push(u);
  });

  return (
    <div className="system-card">
      <h3>Inactive Accounts</h3>
      <p className="system-description">Child accounts that have been removed by parents. Select accounts to reactivate.</p>

      {loading && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading...</p>}

      {!loading && users.length === 0 && (
        <p style={{ color: 'var(--text-subdued)', fontSize: '0.875rem', padding: '12px 0' }}>No inactive accounts</p>
      )}

      {!loading && users.length > 0 && (
        <>
          <div className="inactive-actions">
            <button className="btn btn-secondary btn-small" onClick={selectAll}>
              {selected.size === users.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              className="btn btn-primary btn-small"
              disabled={selected.size === 0 || reactivating}
              onClick={handleReactivate}
            >
              {reactivating ? 'Reactivating...' : `Reactivate (${selected.size})`}
            </button>
          </div>

          {Object.entries(families).map(([familyId, family]) => (
            <div key={familyId} className="inactive-family-group">
              <div className="inactive-family-header" onClick={() => selectByFamily(Number(familyId))}>
                <strong>{family.name}</strong>
                {family.ref && <span className="inactive-family-ref">{family.ref}</span>}
              </div>
              {family.users.map(u => (
                <label key={u.id} className="inactive-user-row">
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggle(u.id)}
                  />
                  <span className="inactive-user-name">{u.name}</span>
                  <span className="inactive-user-email">{u.email}</span>
                  <span className="inactive-user-role">{u.role}</span>
                </label>
              ))}
            </div>
          ))}
        </>
      )}

      {result && <div className="broadcast-result success">{result}</div>}
      {error && <div className="broadcast-result error">{error}</div>}
    </div>
  );
}
