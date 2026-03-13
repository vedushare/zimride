import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import RideCard from '../components/RideCard.jsx';
import * as api from '../api/api.js';

const ZIMBABWE_CITIES = [
  'Harare', 'Bulawayo', 'Mutare', 'Gweru', 'Kwekwe', 'Kadoma', 'Masvingo',
  'Chinhoyi', 'Bindura', 'Marondera', 'Chiredzi', 'Victoria Falls', 'Hwange',
  'Kariba', 'Beitbridge', 'Rusape', 'Zvishavane', 'Redcliff', 'Chegutu', 'Chipinge',
];

export default function SearchRides() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    date: searchParams.get('date') || '',
    seats: searchParams.get('seats') || '',
  });

  useEffect(() => {
    fetchRides();
  }, [searchParams]);

  async function fetchRides() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (searchParams.get('from')) params.from = searchParams.get('from');
      if (searchParams.get('to')) params.to = searchParams.get('to');
      if (searchParams.get('date')) params.date = searchParams.get('date');
      if (searchParams.get('seats')) params.seats = searchParams.get('seats');
      const res = await api.getRides(params);
      setRides(res.data);
    } catch {
      setError('Failed to load rides. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    const params = {};
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.date) params.date = filters.date;
    if (filters.seats) params.seats = filters.seats;
    setSearchParams(params);
  }

  return (
    <div className="search-page">
      <div className="container">
        <div className="search-header">
          <h1>Find a Ride</h1>
          <p>Search for available rides across Zimbabwe</p>
        </div>

        <form onSubmit={handleSearch} className="filter-form">
          <select value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })}>
            <option value="">From (any city)</option>
            {ZIMBABWE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })}>
            <option value="">To (any city)</option>
            {ZIMBABWE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="date"
            value={filters.date}
            onChange={e => setFilters({ ...filters, date: e.target.value })}
          />
          <select value={filters.seats} onChange={e => setFilters({ ...filters, seats: e.target.value })}>
            <option value="">Any seats</option>
            {[1,2,3,4].map(n => <option key={n} value={n}>{n}+ seat{n > 1 ? 's' : ''}</option>)}
          </select>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>

        {loading && <div className="loading-spinner">Loading rides...</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && (
          <>
            <div className="results-count">
              {rides.length === 0 ? 'No rides found' : `${rides.length} ride${rides.length !== 1 ? 's' : ''} found`}
            </div>
            <div className="rides-list">
              {rides.map(ride => <RideCard key={ride.id} ride={ride} />)}
            </div>
            {rides.length === 0 && (
              <div className="empty-state">
                <span className="empty-icon">🚗</span>
                <h3>No rides available</h3>
                <p>Try different dates or cities, or offer a ride yourself!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
