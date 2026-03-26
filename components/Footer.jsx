import React from "react";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="public-footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>🏢 HostelMate</h3>
          <p>Simplifying hostel management for students and administrators.</p>
        </div>
        
        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="#features">Features</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Services</h4>
          <ul>
            <li>Room Bookings</li>
            <li>Maintenance Requests</li>
            <li>Grocery Management</li>
            <li>Visitor Passes</li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Contact</h4>
          <p>📧 support@hostelmate.local</p>
          <p>📞 0112530398
          </p>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {currentYear} HostelMate. All rights reserved.</p>
      </div>
    </footer>
  );
}
