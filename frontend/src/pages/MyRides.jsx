import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import * as api from '../api/api.js';

export default function MyRides() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [myRides, setMyRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [bookRes, ridesRes] = await Promise.all([
          api.getMyBookings(),
          api.getMyRides(),
        ]);
        setBookings(bookRes.data);
        setMyRides(ridesRes.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function cancelBooking(id) {
    await api.updateBookingStatus(id, 'cancelled');
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
  }

  async function cancelRide(id) {
    await api.cancelRide(id);
    setMyRides(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
  }

  const statusBadge = (status) => {
    const colors = { pending: 'badge-yellow', confirmed: 'badge-green', cancelled: 'badge-red', active: 'badge-green' };
    return <span className={`badge ${colors[status] || 'badge-gray'}`}>{status}</span>;
  };

  return (
    <div className="my-rides-page">
      <div className="container">
        <h1>My Trips</h1>
        <p className="welcome">Welcome back, {user?.name.split(' ')[0]}!</p>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'bookings' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            🎫 My Bookings ({bookings.length})
          </button>
          <button
            className={`tab ${activeTab === 'offered' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('offered')}
          >
            🚗 Rides I Offer ({myRides.length})
          </button>
        </div>

        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : activeTab === 'bookings' ? (
          <div className="trips-list">
            {bookings.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🎫</span>
                <h3>No bookings yet</h3>
                <p>Find a ride and book your first seat!</p>
                <Link to="/rides" className="btn btn-primary">Find Rides</Link>
              </div>
            ) : (
              bookings.map(b => (
                <div key={b.id} className="trip-card">
                  <div className="trip-route">
                    <strong>{b.from_city}</strong> → <strong>{b.to_city}</strong>
                  </div>
                  <div className="trip-meta">
                    <span>📅 {new Date(b.departure_date + 'T00:00:00').toLocaleDateString('en-ZW', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span>🕐 {b.departure_time}</span>
                    <span>💺 {b.seats_booked} seat{b.seats_booked > 1 ? 's' : ''}</span>
                    <span>💵 ${(b.seats_booked * b.price_per_seat).toFixed(2)}</span>
                    <span>🚗 {b.driver_name}</span>
                  </div>
                  <div className="trip-actions">
                    {statusBadge(b.status)}
                    {b.status !== 'cancelled' && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => cancelBooking(b.id)}
                      >
                        Cancel
                      </button>
                    )}
                    <Link to={`/rides/${b.ride_id}`} className="btn btn-sm btn-outline">View Ride</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="trips-list">
            {myRides.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🚗</span>
                <h3>You haven't offered any rides yet</h3>
                <p>Start earning by sharing your next journey!</p>
                <Link to="/post-ride" className="btn btn-primary">Offer a Ride</Link>
              </div>
            ) : (
              myRides.map(r => (
                <div key={r.id} className="trip-card">
                  <div className="trip-route">
                    <strong>{r.from_city}</strong> → <strong>{r.to_city}</strong>
                  </div>
                  <div className="trip-meta">
                    <span>📅 {new Date(r.departure_date + 'T00:00:00').toLocaleDateString('en-ZW', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span>🕐 {r.departure_time}</span>
                    <span>💺 {(r.booked_seats || 0)}/{r.available_seats} booked</span>
                    <span>💵 ${Number(r.price_per_seat).toFixed(2)}/seat</span>
                  </div>
                  <div className="trip-actions">
                    {statusBadge(r.status)}
                    {r.status === 'active' && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => cancelRide(r.id)}
                      >
                        Cancel Ride
                      </button>
                    )}
                    <Link to={`/rides/${r.id}`} className="btn btn-sm btn-outline">View</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
