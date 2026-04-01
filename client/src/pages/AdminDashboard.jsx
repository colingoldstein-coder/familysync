import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { EmailComposerCard, EmailLogCard, UnsubscribedUsersCard, InactiveUsersCard } from '../components/AdminEmailCards';
import '../styles/shared.css';
import './AdminDashboard.css';

const COLORS = {
  green: '#1DB954',
  blue: '#3498db',
  orange: '#f39c12',
  red: '#e74c3c',
  purple: '#9b59b6',
  teal: '#1abc9c',
};

const PIE_COLORS = [COLORS.green, COLORS.blue, COLORS.orange, COLORS.red, COLORS.purple, COLORS.teal];

const PERIODS = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: '1 Year', value: '365d' },
];

const tooltipStyle = {
  contentStyle: { background: '#282828', border: '1px solid #333', borderRadius: 8, fontSize: '0.8125rem' },
  labelStyle: { color: '#b3b3b3' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  // Handle ISO timestamps, date objects, and plain YYYY-MM-DD strings
  const str = String(dateStr);
  const plain = str.includes('T') ? str.split('T')[0] : str.slice(0, 10);
  const d = new Date(plain + 'T00:00:00');
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const str = String(dateStr);
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function DataTable({ columns, rows, defaultSort }) {
  const [sortCol, setSortCol] = useState(defaultSort || 0);
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (idx) => {
    if (sortCol === idx) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(idx);
      setSortDir('desc');
    }
  };

  const sorted = [...rows].sort((a, b) => {
    const aVal = a[columns[sortCol].key];
    const bVal = b[columns[sortCol].key];
    if (typeof aVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
  });

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={col.key} onClick={() => handleSort(i)}>
                {col.label}
                <span className={`sort-arrow ${sortCol === i ? 'active' : ''}`}>
                  {sortCol === i ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : ''}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i}>
              {columns.map(col => (
                <td key={col.key}>{col.render ? col.render(row[col.key]) : row[col.key]}</td>
              ))}
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 20 }}>No data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ChartSection({ title, children, tableColumns, tableRows, defaultSort }) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="chart-section">
      <div className="chart-section-header">
        <h3>{title}</h3>
        {tableColumns && (
          <button className="data-table-toggle" onClick={() => setShowTable(!showTable)}>
            {showTable ? 'Hide data' : 'Show data'}
          </button>
        )}
      </div>
      {children}
      {showTable && tableColumns && (
        <DataTable columns={tableColumns} rows={tableRows} defaultSort={defaultSort} />
      )}
    </div>
  );
}

function SystemTab() {
  const [pushStats, setPushStats] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAdminPushStats().then(setPushStats).catch(() => {});
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);
    setError('');
    try {
      const res = await api.adminBroadcastPush({ title: title.trim(), body: body.trim(), url: url.trim() || '/' });
      setResult(res);
      setTitle('');
      setBody('');
      setUrl('/');
      api.getAdminPushStats().then(setPushStats).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="system-section">
      <EmailComposerCard />
      <EmailLogCard />
      <UnsubscribedUsersCard />
      <InactiveUsersCard />

      <div className="system-card">
        <h3>Broadcast Push Notification</h3>
        <p className="system-description">Send a push notification to all users with notifications enabled.</p>

        {pushStats && (
          <div className="push-stats">
            <span className="push-stat"><strong>{pushStats.users}</strong> users subscribed</span>
            <span className="push-stat"><strong>{pushStats.subscriptions}</strong> devices registered</span>
          </div>
        )}

        <form onSubmit={handleSend} className="broadcast-form">
          <div className="form-field">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. FamilySync just got a fresh new look!"
              maxLength={100}
              required
            />
          </div>
          <div className="form-field">
            <label>Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="e.g. Open the app to get the latest update."
              maxLength={300}
              rows={3}
              required
            />
          </div>
          <div className="form-field">
            <label>Link (optional)</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={sending || !title.trim() || !body.trim()}>
            {sending ? 'Sending...' : 'Send Broadcast'}
          </button>
        </form>

        {result && (
          <div className="broadcast-result success">
            Sent to {result.sent} device{result.sent !== 1 ? 's' : ''}.
            {result.failed > 0 && ` ${result.failed} failed.`}
            {result.cleaned > 0 && ` ${result.cleaned} stale subscriptions removed.`}
          </div>
        )}
        {error && <div className="broadcast-result error">{error}</div>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [mainTab, setMainTab] = useState('analytics');
  const [period, setPeriod] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [overview, setOverview] = useState(null);
  const [registrations, setRegistrations] = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const [eventStats, setEventStats] = useState(null);
  const [activeUsers, setActiveUsers] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Records state
  const [recordsTab, setRecordsTab] = useState('users');
  const [userRecords, setUserRecords] = useState(null);
  const [familyRecords, setFamilyRecords] = useState(null);
  const [userRecordsPage, setUserRecordsPage] = useState(1);
  const [familyRecordsPage, setFamilyRecordsPage] = useState(1);
  const [recordsSearch, setRecordsSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const loadStats = useCallback(async (p) => {
    try {
      setError('');
      const [ov, reg, tasks, events, active] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminRegistrations(p),
        api.getAdminTasks(p),
        api.getAdminEvents(p),
        api.getAdminActiveUsers(p),
      ]);
      setOverview(ov);
      setRegistrations(reg);
      setTaskStats(tasks);
      setEventStats(events);
      setActiveUsers(active);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);


  const loadUserRecords = useCallback(async (page, search) => {
    try {
      const data = await api.getAdminUserRecords(page, search);
      setUserRecords(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadFamilyRecords = useCallback(async (page, search) => {
    try {
      const data = await api.getAdminFamilyRecords(page, search);
      setFamilyRecords(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadStats(period);
    loadUserRecords(1, '');
    loadFamilyRecords(1, '');
  }, []);

  const handlePeriodChange = (p) => {
    setPeriod(p);
    setLoading(true);
    loadStats(p);
  };

  if (loading && !overview) {
    return (
      <div className="admin-container">
        <div className="page-header">
          <h1>Admin Dashboard</h1>
        </div>
        <div className="empty-state"><p>Loading statistics...</p></div>
      </div>
    );
  }

  // Merge registration data for chart
  const regChartData = registrations ? (() => {
    const dateMap = {};
    registrations.users.forEach(r => { dateMap[r.date] = { ...dateMap[r.date], date: r.date, users: r.count }; });
    registrations.families.forEach(r => { dateMap[r.date] = { ...dateMap[r.date], date: r.date, families: r.count }; });
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({ ...d, users: d.users || 0, families: d.families || 0, dateLabel: formatDate(d.date) }));
  })() : [];

  // Merge task created/completed for chart
  const taskChartData = taskStats ? (() => {
    const dateMap = {};
    taskStats.created.forEach(r => { dateMap[r.date] = { ...dateMap[r.date], date: r.date, created: r.count }; });
    taskStats.completed.forEach(r => { dateMap[r.date] = { ...dateMap[r.date], date: r.date, completed: r.count }; });
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({ ...d, created: d.created || 0, completed: d.completed || 0, dateLabel: formatDate(d.date) }));
  })() : [];

  const eventChartData = eventStats ? eventStats.created.map(r => ({ ...r, dateLabel: formatDate(r.date) })) : [];

  const activeChartData = activeUsers ? activeUsers.activeUsers.map(r => ({ ...r, dateLabel: formatDate(r.date) })) : [];

  return (
    <div className="admin-container">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1>Admin Dashboard</h1>
          <p>Platform analytics and performance</p>
        </div>
        {overview && <span className="uptime-badge">Uptime: {formatUptime(overview.uptime)}</span>}
      </div>

      <div className="main-tabs">
        <button className={`main-tab ${mainTab === 'analytics' ? 'active' : ''}`} onClick={() => setMainTab('analytics')}>Analytics</button>
        <button className={`main-tab ${mainTab === 'records' ? 'active' : ''}`} onClick={() => setMainTab('records')}>Records</button>
        <button className={`main-tab ${mainTab === 'system' ? 'active' : ''}`} onClick={() => setMainTab('system')}>System</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {mainTab === 'system' && <SystemTab />}

      {mainTab === 'records' && (
        <div className="records-section" id="records">
        <div className="records-tabs">
          <button className={`records-tab ${recordsTab === 'users' ? 'active' : ''}`} onClick={() => { setRecordsTab('users'); setRecordsSearch(''); setSearchInput(''); loadUserRecords(1, ''); setUserRecordsPage(1); }}>
            Users {userRecords ? `(${userRecords.total})` : ''}
          </button>
          <button className={`records-tab ${recordsTab === 'families' ? 'active' : ''}`} onClick={() => { setRecordsTab('families'); setRecordsSearch(''); setSearchInput(''); loadFamilyRecords(1, ''); setFamilyRecordsPage(1); }}>
            Families {familyRecords ? `(${familyRecords.total})` : ''}
          </button>
        </div>

        <form className="records-search" onSubmit={(e) => {
          e.preventDefault();
          setRecordsSearch(searchInput);
          if (recordsTab === 'users') { setUserRecordsPage(1); loadUserRecords(1, searchInput); }
          else { setFamilyRecordsPage(1); loadFamilyRecords(1, searchInput); }
        }}>
          <input
            type="text"
            placeholder={recordsTab === 'users' ? 'Search by name, email, or ref...' : 'Search by name or ref...'}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="records-search-input"
          />
          <button type="submit" className="btn btn-secondary btn-small">Search</button>
          {recordsSearch && (
            <button type="button" className="btn btn-secondary btn-small" onClick={() => {
              setSearchInput(''); setRecordsSearch('');
              if (recordsTab === 'users') { setUserRecordsPage(1); loadUserRecords(1, ''); }
              else { setFamilyRecordsPage(1); loadFamilyRecords(1, ''); }
            }}>Clear</button>
          )}
        </form>

        {recordsTab === 'users' && userRecords && (
          <>
            <DataTable
              columns={[
                { key: 'ref', label: 'Ref' },
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Role', render: (v) => v ? v.charAt(0).toUpperCase() + v.slice(1) : '' },
                { key: 'familyRef', label: 'Family Ref' },
                { key: 'familyName', label: 'Family' },
                { key: 'createdAt', label: 'Joined', render: (v) => v ? formatDateTime(v) : '' },
              ]}
              rows={userRecords.users}
              defaultSort={0}
            />
            {userRecords.totalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-secondary btn-small" disabled={userRecordsPage <= 1} onClick={() => { const p = userRecordsPage - 1; setUserRecordsPage(p); loadUserRecords(p, recordsSearch); }}>Prev</button>
                <span>Page {userRecordsPage} of {userRecords.totalPages}</span>
                <button className="btn btn-secondary btn-small" disabled={userRecordsPage >= userRecords.totalPages} onClick={() => { const p = userRecordsPage + 1; setUserRecordsPage(p); loadUserRecords(p, recordsSearch); }}>Next</button>
              </div>
            )}
          </>
        )}

        {recordsTab === 'families' && familyRecords && (
          <>
            <DataTable
              columns={[
                { key: 'ref', label: 'Ref' },
                { key: 'name', label: 'Family Name' },
                { key: 'members', label: 'Members' },
                { key: 'memberList', label: 'Member Details', render: (list) => list && list.length > 0
                  ? list.map(m => `${m.name} (${m.role}${m.isAdmin ? ', admin' : ''})`).join(', ')
                  : 'None'
                },
                { key: 'createdAt', label: 'Created', render: (v) => v ? formatDateTime(v) : '' },
              ]}
              rows={familyRecords.families}
              defaultSort={0}
            />
            {familyRecords.totalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-secondary btn-small" disabled={familyRecordsPage <= 1} onClick={() => { const p = familyRecordsPage - 1; setFamilyRecordsPage(p); loadFamilyRecords(p, recordsSearch); }}>Prev</button>
                <span>Page {familyRecordsPage} of {familyRecords.totalPages}</span>
                <button className="btn btn-secondary btn-small" disabled={familyRecordsPage >= familyRecords.totalPages} onClick={() => { const p = familyRecordsPage + 1; setFamilyRecordsPage(p); loadFamilyRecords(p, recordsSearch); }}>Next</button>
              </div>
            )}
          </>
        )}
        </div>
      )}

      {mainTab === 'analytics' && <>
      {/* Overview Cards */}
      {overview && (
        <div className="overview-grid">
          <div className="overview-card">
            <div className="stat-value">{overview.families}</div>
            <div className="stat-label">Families</div>
          </div>
          <div className="overview-card">
            <div className="stat-value blue">{overview.users}</div>
            <div className="stat-label">Users ({overview.parents}P / {overview.children}C)</div>
          </div>
          <div className="overview-card">
            <div className="stat-value">{overview.totalTasks}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
          <div className="overview-card">
            <div className="stat-value orange">{overview.taskCompletionRate}%</div>
            <div className="stat-label">Completion Rate</div>
          </div>
          <div className="overview-card">
            <div className="stat-value blue">{overview.totalEvents}</div>
            <div className="stat-label">Total Events</div>
          </div>
          <div className="overview-card">
            <div className="stat-value">{overview.totalRequests}</div>
            <div className="stat-label">Help Requests</div>
          </div>
        </div>
      )}

      {/* Period Selector */}
      <div className="period-selector">
        {PERIODS.map(p => (
          <button
            key={p.value}
            className={`period-btn ${period === p.value ? 'active' : ''}`}
            onClick={() => { setCustomFrom(''); setCustomTo(''); handlePeriodChange(p.value); }}
          >
            {p.label}
          </button>
        ))}
        <span className="period-sep" />
        <label className="period-date-label">From</label>
        <input type="date" className="period-date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
        <label className="period-date-label">To</label>
        <input type="date" className="period-date" value={customTo} max={new Date().toISOString().split('T')[0]} onChange={(e) => setCustomTo(e.target.value)} />
        <button
          className="btn btn-secondary btn-small"
          disabled={!customFrom || !customTo}
          onClick={() => {
            const from = new Date(customFrom);
            const to = new Date(customTo);
            const days = Math.max(1, Math.ceil((to - from) / (1000 * 60 * 60 * 24)));
            const p = `${days}d`;
            setPeriod(p);
            setLoading(true);
            loadStats(p);
          }}
        >
          Apply
        </button>
      </div>

      {/* Registrations Chart */}
      <ChartSection
        title="User & Family Registrations"
        tableColumns={[
          { key: 'dateLabel', label: 'Date' },
          { key: 'users', label: 'Users' },
          { key: 'families', label: 'Families' },
        ]}
        tableRows={regChartData}
      >
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={regChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="dateLabel" stroke="#6a6a6a" fontSize={11} />
              <YAxis stroke="#6a6a6a" fontSize={11} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Legend />
              <Area type="monotone" dataKey="users" name="Users" stroke={COLORS.green} fill={COLORS.green} fillOpacity={0.2} />
              <Area type="monotone" dataKey="families" name="Families" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartSection>

      {/* Tasks Chart */}
      <ChartSection
        title="Task Activity"
        tableColumns={[
          { key: 'dateLabel', label: 'Date' },
          { key: 'created', label: 'Created' },
          { key: 'completed', label: 'Completed' },
        ]}
        tableRows={taskChartData}
      >
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={taskChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="dateLabel" stroke="#6a6a6a" fontSize={11} />
              <YAxis stroke="#6a6a6a" fontSize={11} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="created" name="Created" stroke={COLORS.green} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="completed" name="Completed" stroke={COLORS.blue} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartSection>

      {/* Distribution charts */}
      <div className="chart-row">
        {/* Task Status Distribution */}
        <ChartSection title="Task Status Distribution">
          <div className="pie-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskStats?.statusDistribution || []}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ status, count }) => `${status} (${count})`}
                  labelLine={false}
                  fontSize={11}
                >
                  {(taskStats?.statusDistribution || []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartSection>

        {/* Event Type Distribution */}
        <ChartSection title="Event Type Distribution">
          <div className="pie-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={eventStats?.typeDistribution || []}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ type, count }) => `${type} (${count})`}
                  labelLine={false}
                  fontSize={11}
                >
                  {(eventStats?.typeDistribution || []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartSection>
      </div>

      {/* Events Chart */}
      <ChartSection
        title="Event Activity"
        tableColumns={[
          { key: 'dateLabel', label: 'Date' },
          { key: 'count', label: 'Events Created' },
        ]}
        tableRows={eventChartData}
      >
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={eventChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="dateLabel" stroke="#6a6a6a" fontSize={11} />
              <YAxis stroke="#6a6a6a" fontSize={11} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" name="Events" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartSection>

      {/* Active Users Chart */}
      <ChartSection
        title="Active Users"
        tableColumns={[
          { key: 'dateLabel', label: 'Date' },
          { key: 'count', label: 'Active Users' },
        ]}
        tableRows={activeChartData}
      >
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="dateLabel" stroke="#6a6a6a" fontSize={11} />
              <YAxis stroke="#6a6a6a" fontSize={11} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="count" name="Active Users" stroke={COLORS.orange} fill={COLORS.orange} fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartSection>

      </>}
    </div>
  );
}
