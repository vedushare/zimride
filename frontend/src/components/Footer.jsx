import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <span className="brand-icon">🚗</span>
          <span className="brand-name">ZimRide</span>
          <p className="footer-tagline">Share the journey across Zimbabwe</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>Popular Routes</h4>
            <Link to="/rides?from=Harare&to=Bulawayo">Harare → Bulawayo</Link>
            <Link to="/rides?from=Harare&to=Mutare">Harare → Mutare</Link>
            <Link to="/rides?from=Bulawayo&to=Victoria+Falls">Bulawayo → Victoria Falls</Link>
            <Link to="/rides?from=Harare&to=Masvingo">Harare → Masvingo</Link>
          </div>
          <div className="footer-col">
            <h4>Payments</h4>
            <span>💚 EcoCash</span>
            <span>🔵 OneMoney</span>
            <span>💵 USD Cash</span>
            <span>🏦 Bank Transfer</span>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <Link to="/">About ZimRide</Link>
            <Link to="/">Safety</Link>
            <Link to="/">Help Centre</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2024 ZimRide Zimbabwe. All rights reserved. 🇿🇼</p>
      </div>
    </footer>
  );
}
