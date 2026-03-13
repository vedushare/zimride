import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import SearchRides from './pages/SearchRides.jsx';
import PostRide from './pages/PostRide.jsx';
import RideDetails from './pages/RideDetails.jsx';
import Profile from './pages/Profile.jsx';
import MyRides from './pages/MyRides.jsx';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/rides" element={<SearchRides />} />
          <Route path="/rides/:id" element={<RideDetails />} />
          <Route path="/post-ride" element={<ProtectedRoute><PostRide /></ProtectedRoute>} />
          <Route path="/my-rides" element={<ProtectedRoute><MyRides /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
