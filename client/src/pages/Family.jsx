import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import '../styles/shared.css';
import './Family.css';

export default function Family() {
  const { user, family } = useAuth();
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [familyInfo, setFamilyInfo] = useState(family);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('child');
  const [inviting, setInviting] = useState(false);

  const load = async () => {
    try {
      const [membersData, meData, invData] = await Promise.all([
        api.getFamilyMembers(),
        api.getMe(),
        user.isAdmin ? api.getInvitations() : Promise.resolve({ invitations: [] }),
      ]);
      setMembers(membersData.members);
      setFamilyInfo(meData.family);
      setInvitations(invData.invitations);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setInviting(true);
    try {
      await api.sendInvite({ email: inviteEmail, role: inviteRole });
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('child');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!confirm(`Remove ${member.name} from the family? This will delete all their tasks and requests.`)) return;
    setError('');
    setSuccess('');
    try {
      await api.removeFamilyMember(member.id);
      setSuccess(`${member.name} has been removed`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResendInvite = async (invite) => {
    setError('');
    setSuccess('');
    try {
      await api.resendInvite(invite.id);
      setSuccess(`Invitation resent to ${invite.email}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const parents = members.filter(m => m.role === 'parent');
  const children = members.filter(m => m.role === 'child');
  const pendingInvites = invitations.filter(i => i.status === 'pending');

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{familyInfo?.name || 'Your Family'}</h1>
        <p>{user.isAdmin ? 'Manage your family members' : 'Your family members'}</p>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      {user.isAdmin && (
        <div className="card invite-card">
          <h3>Invite Family Member</h3>
          <p className="invite-hint">Send an email invitation. You choose their role.</p>
          <form onSubmit={handleInvite} className="invite-form">
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="family.member@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="child">Child</option>
                <option value="parent">Parent</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={inviting}>
              {inviting ? 'Sending...' : 'Send Invitation'}
            </button>
          </form>
        </div>
      )}

      {user.isAdmin && pendingInvites.length > 0 && (
        <div className="members-section">
          <h2>Pending Invitations</h2>
          <div className="card-grid">
            {pendingInvites.map(invite => (
              <div key={invite.id} className="card member-card">
                <div className="member-avatar" style={{ background: '#666' }}>
                  ?
                </div>
                <div className="member-info">
                  <h3>{invite.email}</h3>
                  <p>Invited {(() => { const s = String(invite.created_at).slice(0, 10); return new Date(s + 'T00:00:00').toLocaleDateString(); })()}</p>
                </div>
                <span className="badge badge-pending" style={{ textTransform: 'capitalize' }}>{invite.role}</span>
                <button className="btn btn-primary btn-sm" onClick={() => handleResendInvite(invite)}>Resend</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="members-section">
        <h2>Parents</h2>
        <div className="card-grid">
          {parents.map(member => (
            <div key={member.id} className="card member-card">
              <div className="member-avatar" style={{ background: member.avatar_color || '#1DB954' }}>
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="member-info">
                <h3>
                  {member.name} {member.id === user.id ? '(You)' : ''}
                  {member.is_admin ? ' — Admin' : ''}
                </h3>
                <p>{member.email}</p>
              </div>
              <span className="badge badge-accepted">Parent</span>
              {user.isAdmin && member.id !== user.id && (
                <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(member)}>Remove</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="members-section">
        <h2>Children</h2>
        {children.length === 0 ? (
          <div className="empty-state">
            <h3>No children yet</h3>
            <p>{user.isAdmin ? 'Use the invite form above to add children' : 'The family admin can invite children'}</p>
          </div>
        ) : (
          <div className="card-grid">
            {children.map(member => (
              <div key={member.id} className="card member-card">
                <div className="member-avatar" style={{ background: member.avatar_color || '#3498db' }}>
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="member-info">
                  <h3>{member.name} {member.id === user.id ? '(You)' : ''}</h3>
                  <p>{member.email}</p>
                </div>
                <span className="badge badge-pending">Child</span>
                {user.isAdmin && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(member)}>Remove</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
