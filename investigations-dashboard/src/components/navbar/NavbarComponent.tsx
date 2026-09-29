import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const NavbarComponent = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="custom-navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">AI Trends</Link>
        
        {/* Hamburger Menu Icon */}
        <button className="nav-toggle" onClick={() => setIsOpen(!isOpen)}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>

        {/* Navigation Links */}
        <div className={`nav-menu ${isOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-item">Home</Link>
          
          {/* AI Trends Investigation */}
          <div className="nav-dropdown">
            <span className='dropdown-trigger'>AI Trends</span>
            <div className="dropdown-content">
              <Link to="/ai-trends">Investigate</Link>
              <Link to="/trends">Trends</Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavbarComponent;