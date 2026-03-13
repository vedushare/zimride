import { Link } from 'react-router-dom';

function StarRating({ rating, total }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} className={i <= Math.round(rating) ? 'star star-filled' : 'star star-empty'}>★</span>
    );
  }
  return (
    <span className="star-rating">
      {stars} <span className="rating-count">({total || 0})</span>
    </span>
  );
}

export default function RideCard({ ride }) {
  const amenitiesList = ride.amenities ? ride.amenities.split(',').filter(Boolean) : [];
  const amenityIcons = { music: '🎵', aircon: '❄️', wifi: '📶', luggage: '🧳', smoking: '🚬', pets: '🐾' };

  return (
    <Link to={`/rides/${ride.id}`} className="ride-card">
      <div className="ride-card-header">
        <div className="ride-route">
          <span className="city from-city">{ride.from_city}</span>
          <span className="route-arrow">→</span>
          <span className="city to-city">{ride.to_city}</span>
        </div>
        <div className="ride-price">
          <span className="price-amount">${Number(ride.price_per_seat).toFixed(2)}</span>
          <span className="price-label">per seat</span>
        </div>
      </div>

      <div className="ride-card-meta">
        <span className="meta-item">📅 {new Date(ride.departure_date + 'T00:00:00').toLocaleDateString('en-ZW', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        <span className="meta-item">🕐 {ride.departure_time}</span>
        <span className="meta-item">💺 {ride.available_seats - (ride.booked_seats || 0)} seat{ride.available_seats - (ride.booked_seats || 0) !== 1 ? 's' : ''} left</span>
      </div>

      <div className="ride-card-driver">
        <div className="driver-avatar">{ride.driver_name ? ride.driver_name[0].toUpperCase() : '?'}</div>
        <div className="driver-info">
          <span className="driver-name">{ride.driver_name}</span>
          <StarRating rating={ride.driver_rating || 0} total={ride.driver_total_ratings || 0} />
        </div>
        {amenitiesList.length > 0 && (
          <div className="ride-amenities">
            {amenitiesList.map(a => (
              <span key={a} className="amenity-badge" title={a}>{amenityIcons[a] || '✓'}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
