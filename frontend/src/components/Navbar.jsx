import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">🚗</span>
          <span className="brand-name">ZimRide</span>
        </Link>

        <div className="navbar-links">
          <Link to="/rides" className="nav-link">Find a Ride</Link>
          {user ? (
            <>
              <Link to="/post-ride" className="nav-link nav-link-highlight">Offer a Ride</Link>
              <Link to="/my-rides" className="nav-link">My Trips</Link>
              <div className="nav-user">
                <Link to={`/profile/${user.id}`} className="nav-user-name">
                  👤 {user.name.split(' ')[0]}
                </Link>
                <button onClick={handleLogout} className="nav-logout">Logout</button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
