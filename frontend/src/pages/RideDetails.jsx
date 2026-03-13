import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import * as api from '../api/api.js';

const PAYMENT_METHODS = [
  { id: 'cash', label: '💵 USD Cash' },
  { id: 'ecocash', label: '💚 EcoCash' },
  { id: 'onemoney', label: '🔵 OneMoney' },
  { id: 'zimswitch', label: '🏦 ZimSwitch' },
  { id: 'bank_transfer', label: '🏦 Bank Transfer' },
];

function StarRating({ rating, total }) {
  return (
    <span>
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))} ({total || 0} reviews)
    </span>
  );
}

export default function RideDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingForm, setBookingForm] = useState({ seats: 1, payment_method: 'cash' });
  const [bookingStatus, setBookingStatus] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    fetchRide();
  }, [id]);

  async function fetchRide() {
    try {
      const res = await api.getRide(id);
      setRide(res.data);
    } catch {
      setError('Ride not found');
    } finally {
      setLoading(false);
    }
  }

  async function handleBook(e) {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setBookingLoading(true);
    setBookingStatus('');
    try {
      await api.bookRide({ ride_id: ride.id, seats_booked: bookingForm.seats, payment_method: bookingForm.payment_method });
      setBookingStatus('success');
      fetchRide();
    } catch (err) {
      setBookingStatus('error:' + (err.response?.data?.error || 'Booking failed'));
    } finally {
      setBookingLoading(false);
    }
  }

  if (loading) return <div className="loading-page"><div className="loading-spinner">Loading...</div></div>;
  if (error) return <div className="error-page"><p>{error}</p><Link to="/rides">← Back to rides</Link></div>;

  const availableSeats = ride.available_seats - (ride.booked_seats || 0);
  const isDriver = user && user.id === ride.driver_id;
  const amenitiesList = ride.amenities ? ride.amenities.split(',').filter(Boolean) : [];
  const amenityLabels = { music: '🎵 Music', aircon: '❄️ Air con', wifi: '📶 Wi-Fi', luggage: '🧳 Boot space', smoking: '🚬 Smoking ok', pets: '🐾 Pets ok' };

  return (
    <div className="ride-details-page">
      <div className="container">
        <Link to="/rides" className="back-link">← Back to rides</Link>

        <div className="ride-details-grid">
          {/* Main Info */}
          <div className="ride-main">
            <div className="ride-hero-card">
              <div className="ride-route-large">
                <div className="city-block">
                  <span className="time-large">{ride.departure_time}</span>
                  <span className="city-large">{ride.from_city}</span>
                </div>
                <div className="route-line">
                  <div className="route-dot"></div>
                  <div className="route-track"></div>
                  <div className="route-dot"></div>
                </div>
                <div className="city-block">
                  <span className="city-large">{ride.to_city}</span>
                </div>
              </div>
              <div className="ride-date-info">
                📅 {new Date(ride.departure_date + 'T00:00:00').toLocaleDateString('en-ZW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            {/* Driver Info */}
            <div className="driver-card">
              <h3>Your Driver</h3>
              <Link to={`/profile/${ride.driver_id}`} className="driver-profile-link">
                <div className="driver-avatar-large">{ride.driver_name[0].toUpperCase()}</div>
                <div>
                  <div className="driver-name-large">{ride.driver_name}</div>
                  <StarRating rating={ride.driver_rating || 0} total={ride.driver_total_ratings || 0} />
                  {ride.driver_bio && <p className="driver-bio">{ride.driver_bio}</p>}
                </div>
              </Link>
              {ride.driver_phone && !isDriver && user && (
                <div className="driver-contact">
                  📞 {ride.driver_phone}
                </div>
              )}
            </div>

            {/* Amenities */}
            {amenitiesList.length > 0 && (
              <div className="amenities-card">
                <h3>Amenities</h3>
                <div className="amenities-list">
                  {amenitiesList.map(a => (
                    <span key={a} className="amenity-item">{amenityLabels[a] || a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {ride.description && (
              <div className="description-card">
                <h3>About this ride</h3>
                <p>{ride.description}</p>
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="booking-sidebar">
            <div className="booking-card">
              <div className="booking-price">
                <span className="price-big">${Number(ride.price_per_seat).toFixed(2)}</span>
                <span className="price-per">per seat</span>
              </div>
              <div className="seats-available">
                💺 {availableSeats} seat{availableSeats !== 1 ? 's' : ''} available
              </div>

              {isDriver ? (
                <div className="driver-notice">You are the driver of this ride</div>
              ) : ride.status !== 'active' ? (
                <div className="alert alert-error">This ride is no longer available</div>
              ) : availableSeats === 0 ? (
                <div className="alert alert-error">This ride is fully booked</div>
              ) : !user ? (
                <Link to="/login" className="btn btn-primary btn-full">Login to Book</Link>
              ) : (
                <>
                  {bookingStatus === 'success' && (
                    <div className="alert alert-success">
                      ✅ Booking confirmed! Check My Trips for details.
                    </div>
                  )}
                  {bookingStatus.startsWith('error:') && (
                    <div className="alert alert-error">{bookingStatus.replace('error:', '')}</div>
                  )}
                  {bookingStatus !== 'success' && (
                    <form onSubmit={handleBook} className="booking-form">
                      <div className="form-group">
                        <label>Seats</label>
                        <select
                          value={bookingForm.seats}
                          onChange={e => setBookingForm({ ...bookingForm, seats: parseInt(e.target.value) })}
                        >
                          {Array.from({ length: Math.min(availableSeats, 4) }, (_, i) => i + 1).map(n => (
                            <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Payment Method</label>
                        <select
                          value={bookingForm.payment_method}
                          onChange={e => setBookingForm({ ...bookingForm, payment_method: e.target.value })}
                        >
                          {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                        </select>
                      </div>
                      <div className="booking-total">
                        Total: <strong>${(bookingForm.seats * ride.price_per_seat).toFixed(2)}</strong>
                      </div>
                      <button type="submit" className="btn btn-primary btn-full" disabled={bookingLoading}>
                        {bookingLoading ? 'Booking...' : 'Book Seats'}
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
