import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api/api.js';

const ZIMBABWE_CITIES = [
  'Harare', 'Bulawayo', 'Mutare', 'Gweru', 'Kwekwe', 'Kadoma', 'Masvingo',
  'Chinhoyi', 'Bindura', 'Marondera', 'Chiredzi', 'Victoria Falls', 'Hwange',
  'Kariba', 'Beitbridge', 'Rusape', 'Zvishavane', 'Redcliff', 'Chegutu', 'Chipinge',
];

const AMENITIES = [
  { id: 'music', label: '🎵 Music', desc: 'Music during the trip' },
  { id: 'aircon', label: '❄️ Air con', desc: 'Air conditioning' },
  { id: 'wifi', label: '📶 Wi-Fi', desc: 'Mobile hotspot available' },
  { id: 'luggage', label: '🧳 Boot space', desc: 'Extra luggage space' },
  { id: 'smoking', label: '🚬 Smoking ok', desc: 'Smoking allowed' },
  { id: 'pets', label: '🐾 Pets ok', desc: 'Pets welcome' },
];

export default function PostRide() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    from_city: '',
    to_city: '',
    departure_date: '',
    departure_time: '',
    available_seats: 3,
    price_per_seat: '',
    description: '',
    amenities: [],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function toggleAmenity(id) {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(id)
        ? prev.amenities.filter(a => a !== id)
        : [...prev.amenities, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.from_city || !form.to_city) { setError('Please select departure and destination cities'); return; }
    if (form.from_city === form.to_city) { setError('Departure and destination cities must be different'); return; }
    if (!form.departure_date || !form.departure_time) { setError('Please select departure date and time'); return; }
    if (!form.price_per_seat || form.price_per_seat < 0) { setError('Please enter a valid price'); return; }

    setLoading(true);
    try {
      const res = await api.postRide(form);
      navigate(`/rides/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post ride');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="post-ride-page">
      <div className="container-sm">
        <div className="page-header">
          <h1>🚗 Offer a Ride</h1>
          <p>Share your journey and help fellow Zimbabweans travel</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="post-form">
          <div className="form-section">
            <h3>Route Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>From *</label>
                <select
                  value={form.from_city}
                  onChange={e => setForm({ ...form, from_city: e.target.value })}
                  required
                >
                  <option value="">Select city</option>
                  {ZIMBABWE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>To *</label>
                <select
                  value={form.to_city}
                  onChange={e => setForm({ ...form, to_city: e.target.value })}
                  required
                >
                  <option value="">Select city</option>
                  {ZIMBABWE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Departure Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={form.departure_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm({ ...form, departure_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Time *</label>
                <input
                  type="time"
                  value={form.departure_time}
                  onChange={e => setForm({ ...form, departure_time: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Seats & Price</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Available Seats *</label>
                <select
                  value={form.available_seats}
                  onChange={e => setForm({ ...form, available_seats: parseInt(e.target.value) })}
                >
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Price per Seat (USD) *</label>
                <input
                  type="number"
                  placeholder="e.g. 15"
                  min="0"
                  step="0.50"
                  value={form.price_per_seat}
                  onChange={e => setForm({ ...form, price_per_seat: parseFloat(e.target.value) })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Amenities</h3>
            <div className="amenities-grid">
              {AMENITIES.map(a => (
                <label key={a.id} className={`amenity-toggle ${form.amenities.includes(a.id) ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.amenities.includes(a.id)}
                    onChange={() => toggleAmenity(a.id)}
                  />
                  {a.label}
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3>Additional Information</h3>
            <div className="form-group">
              <label>Description (optional)</label>
              <textarea
                placeholder="Describe your trip, pickup point, any preferences..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? 'Posting...' : '✅ Post Ride'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
