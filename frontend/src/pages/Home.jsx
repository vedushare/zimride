import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ZIMBABWE_CITIES = [
  'Harare', 'Bulawayo', 'Mutare', 'Gweru', 'Kwekwe', 'Kadoma', 'Masvingo',
  'Chinhoyi', 'Bindura', 'Marondera', 'Chiredzi', 'Victoria Falls', 'Hwange',
  'Kariba', 'Beitbridge', 'Rusape', 'Zvishavane', 'Redcliff', 'Chegutu', 'Chipinge',
];

const POPULAR_ROUTES = [
  { from: 'Harare', to: 'Bulawayo', distance: '439 km', time: '~5 hrs' },
  { from: 'Harare', to: 'Mutare', distance: '263 km', time: '~3 hrs' },
  { from: 'Bulawayo', to: 'Victoria Falls', distance: '440 km', time: '~5 hrs' },
  { from: 'Harare', to: 'Masvingo', distance: '292 km', time: '~3.5 hrs' },
  { from: 'Harare', to: 'Gweru', distance: '275 km', time: '~3 hrs' },
  { from: 'Harare', to: 'Beitbridge', distance: '580 km', time: '~6.5 hrs' },
];

export default function Home() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ from: '', to: '', date: '', seats: 1 });

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (form.from) params.set('from', form.from);
    if (form.to) params.set('to', form.to);
    if (form.date) params.set('date', form.date);
    if (form.seats > 1) params.set('seats', form.seats);
    navigate(`/rides?${params.toString()}`);
  }

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">🇿🇼 Zimbabwe's Ride Sharing Platform</div>
          <h1 className="hero-title">Share the Journey Across Zimbabwe</h1>
          <p className="hero-subtitle">
            Connect with drivers and passengers travelling between Zimbabwe's cities.
            Save money, make friends, travel comfortably.
          </p>

          <div className="search-card">
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-row">
                <div className="search-field">
                  <label>From</label>
                  <select value={form.from} onChange={e => setForm({ ...form, from: e.target.value })}>
                    <option value="">Departure city</option>
                    {ZIMBABWE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="search-swap">⇄</div>
                <div className="search-field">
                  <label>To</label>
                  <select value={form.to} onChange={e => setForm({ ...form, to: e.target.value })}>
                    <option value="">Destination city</option>
                    {ZIMBABWE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="search-row">
                <div className="search-field">
                  <label>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="search-field">
                  <label>Passengers</label>
                  <select value={form.seats} onChange={e => setForm({ ...form, seats: e.target.value })}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} passenger{n > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary search-btn">
                  🔍 Search Rides
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon">🚗</span>
              <span className="stat-number">500+</span>
              <span className="stat-label">Rides offered monthly</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">👥</span>
              <span className="stat-number">2,000+</span>
              <span className="stat-label">Registered travellers</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🏙️</span>
              <span className="stat-number">20+</span>
              <span className="stat-label">Cities connected</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">💚</span>
              <span className="stat-number">4.8★</span>
              <span className="stat-label">Average driver rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Routes */}
      <section className="routes-section">
        <div className="container">
          <h2>Popular Routes</h2>
          <p className="section-subtitle">Most travelled inter-city routes in Zimbabwe</p>
          <div className="routes-grid">
            {POPULAR_ROUTES.map(route => (
              <button
                key={`${route.from}-${route.to}`}
                className="route-card"
                onClick={() => navigate(`/rides?from=${route.from}&to=${route.to}`)}
              >
                <div className="route-cities">
                  <strong>{route.from}</strong>
                  <span className="route-arrow">→</span>
                  <strong>{route.to}</strong>
                </div>
                <div className="route-meta">
                  <span>📍 {route.distance}</span>
                  <span>⏱ {route.time}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section">
        <div className="container">
          <h2>How ZimRide Works</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon">🔍</div>
              <h3>Search a Ride</h3>
              <p>Enter your departure and destination cities and find available rides in seconds.</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">💬</div>
              <h3>Book Your Seat</h3>
              <p>Choose a ride, book your seat, and pay via EcoCash, OneMoney or cash.</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">🚗</div>
              <h3>Travel Together</h3>
              <p>Meet your driver, enjoy the journey, and rate your experience afterwards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Payment */}
      <section className="payment-section">
        <div className="container">
          <h2>Convenient Payment Options</h2>
          <p className="section-subtitle">Pay the way that works for you</p>
          <div className="payment-grid">
            <div className="payment-card">
              <span className="payment-icon">💚</span>
              <h4>EcoCash</h4>
              <p>Pay instantly with Zimbabwe's most popular mobile money</p>
            </div>
            <div className="payment-card">
              <span className="payment-icon">🔵</span>
              <h4>OneMoney</h4>
              <p>NetOne's mobile money platform accepted across Zimbabwe</p>
            </div>
            <div className="payment-card">
              <span className="payment-icon">💵</span>
              <h4>USD Cash</h4>
              <p>Good old USD cash payment on arrival</p>
            </div>
            <div className="payment-card">
              <span className="payment-icon">🏦</span>
              <h4>Bank Transfer</h4>
              <p>ZimSwitch and local bank transfers supported</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
