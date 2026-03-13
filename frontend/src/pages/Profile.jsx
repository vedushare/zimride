import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import * as api from '../api/api.js';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser, login, token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saveStatus, setSaveStatus] = useState('');

  const isOwn = currentUser && String(currentUser.id) === String(id);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  async function fetchProfile() {
    try {
      const res = await api.getUser(id);
      setProfile(res.data);
      setEditForm({ name: res.data.name, phone: res.data.phone || '', bio: res.data.bio || '' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaveStatus('saving');
    try {
      const res = await api.updateProfile(editForm);
      setProfile(prev => ({ ...prev, ...res.data }));
      // Update auth context too
      login(token, { ...currentUser, name: res.data.name });
      setEditing(false);
      setSaveStatus('');
    } catch {
      setSaveStatus('error');
    }
  }

  if (loading) return <div className="loading-page"><div className="loading-spinner">Loading...</div></div>;
  if (!profile) return <div className="error-page"><p>User not found</p><Link to="/">← Home</Link></div>;

  const ratingStars = profile.rating ? '★'.repeat(Math.round(profile.rating)) + '☆'.repeat(5 - Math.round(profile.rating)) : '☆☆☆☆☆';

  return (
    <div className="profile-page">
      <div className="container-sm">
        <div className="profile-card">
          <div className="profile-avatar">{profile.name[0].toUpperCase()}</div>
          {editing ? (
            <div className="profile-edit">
              <div className="form-group">
                <label>Name</label>
                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+263 77 123 4567" />
              </div>
              <div className="form-group">
                <label>About me</label>
                <textarea value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} rows={3} placeholder="Tell others about yourself..." />
              </div>
              {saveStatus === 'error' && <div className="alert alert-error">Failed to save</div>}
              <div className="form-actions">
                <button className="btn btn-primary" onClick={handleSave} disabled={saveStatus === 'saving'}>
                  {saveStatus === 'saving' ? 'Saving...' : 'Save'}
                </button>
                <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="profile-name">{profile.name}</h2>
              {profile.phone && <p className="profile-phone">📞 {profile.phone}</p>}
              <div className="profile-rating">
                <span className="stars">{ratingStars}</span>
                <span className="rating-count"> {profile.rating > 0 ? profile.rating.toFixed(1) : 'No ratings yet'} ({profile.total_ratings} review{profile.total_ratings !== 1 ? 's' : ''})</span>
              </div>
              {profile.bio && <p className="profile-bio">{profile.bio}</p>}
              <div className="profile-stats">
                <div className="stat">
                  <span className="stat-number">{profile.rides_as_driver}</span>
                  <span className="stat-label">Active Rides</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{profile.total_ratings}</span>
                  <span className="stat-label">Reviews</span>
                </div>
              </div>
              <p className="profile-since">Member since {new Date(profile.created_at).toLocaleDateString('en-ZW', { month: 'long', year: 'numeric' })}</p>
              {isOwn && (
                <button className="btn btn-outline" onClick={() => setEditing(true)}>Edit Profile</button>
              )}
            </>
          )}
        </div>

        {profile.recent_reviews && profile.recent_reviews.length > 0 && (
          <div className="reviews-section">
            <h3>Recent Reviews</h3>
            {profile.recent_reviews.map(review => (
              <div key={review.id} className="review-card">
                <div className="review-header">
                  <span className="reviewer-name">{review.reviewer_name}</span>
                  <span className="review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                </div>
                {review.comment && <p className="review-comment">{review.comment}</p>}
                <span className="review-date">{new Date(review.created_at).toLocaleDateString('en-ZW')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
