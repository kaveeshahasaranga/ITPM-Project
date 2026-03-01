import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

export default function Home() {
  return (
    <div className="home-page">
      <Header />
      
      <main className="home-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-overlay"></div>
          <div className="hero-container">
            <div className="hero-content">
              <h1 className="hero-title">Welcome to HostelMate</h1>
              <p className="hero-subtitle">
                Smart Hostel Management Solution
              </p>
              <p className="hero-description">
                Streamline your campus living experience with our all-in-one platform for 
                room bookings, maintenance requests, grocery management, visitor passes, and more.
              </p>
              <div className="hero-buttons">
                <Link to="/login" className="btn btn-primary btn-lg">
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-secondary btn-lg">
                  Create Account
                </Link>
              </div>
            </div>
            <div className="hero-stats">
              <div className="stat-card">
                <h3>500+</h3>
                <p>Active Users</p>
              </div>
              <div className="stat-card">
                <h3>1000+</h3>
                <p>Transactions</p>
              </div>
              <div className="stat-card">
                <h3>99%</h3>
                <p>Uptime</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features-section">
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">Key Features</h2>
              <p className="section-subtitle">Everything you need for seamless hostel management</p>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <span className="feature-icon">🛏️</span>
                </div>
                <h3>Room Bookings</h3>
                <p>Easy online room reservation and management system for students and administrators.</p>
                <a href="#" className="feature-link">Learn More →</a>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <span className="feature-icon">🔧</span>
                </div>
                <h3>Maintenance Requests</h3>
                <p>Report and track maintenance issues with real-time status updates and notifications.</p>
                <a href="#" className="feature-link">Learn More →</a>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <span className="feature-icon">🛒</span>
                </div>
                <h3>Grocery Management</h3>
                <p>Request groceries and track inventory effortlessly with organized tracking system.</p>
                <a href="#" className="feature-link">Learn More →</a>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <span className="feature-icon">👥</span>
                </div>
                <h3>Visitor Passes</h3>
                <p>Generate and manage visitor passes with QR code verification for enhanced security.</p>
                <a href="#" className="feature-link">Learn More →</a>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <span className="feature-icon">📢</span>
                </div>
                <h3>Announcements</h3>
                <p>Stay updated with important hostel announcements and critical notices instantly.</p>
                <a href="#" className="feature-link">Learn More →</a>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <span className="feature-icon">📊</span>
                </div>
                <h3>Admin Dashboard</h3>
                <p>Comprehensive admin panel with analytics and reports for efficient hostel management.</p>
                <a href="#" className="feature-link">Learn More →</a>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="benefits-section">
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">Why Choose HostelMate?</h2>
              <p className="section-subtitle">Trusted by leading educational institutions</p>
            </div>
            <div className="benefits-grid">
              <div className="benefit-item">
                <div className="benefit-icon">⚡</div>
                <h3>Fast & Reliable</h3>
                <p>Lightning-fast performance with 99% uptime guarantee</p>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">🔒</div>
                <h3>Secure</h3>
                <p>Enterprise-grade security to protect student data</p>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">📱</div>
                <h3>Mobile Friendly</h3>
                <p>Responsive design works on all devices</p>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">🎯</div>
                <h3>Easy to Use</h3>
                <p>Intuitive interface requires minimal training</p>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="about-section">
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">About HostelMate</h2>
            </div>
            <div className="about-content">
              <div className="about-text">
                <h3>Transform Your Hostel Operations</h3>
                <p>
                  HostelMate is designed to revolutionize hostel management by providing 
                  a unified platform that connects students and administrators seamlessly. 
                  Our system simplifies daily operations, improves communication, and enhances 
                  the overall living experience for everyone.
                </p>
                <ul className="about-list">
                  <li>✓ Reduce administrative overhead</li>
                  <li>✓ Improve student satisfaction</li>
                  <li>✓ Streamline operations</li>
                  <li>✓ Enhance communication</li>
                </ul>
              </div>
              <div className="about-stats">
                <div className="stat-item-large">
                  <h4>500+</h4>
                  <p>Active Users</p>
                </div>
                <div className="stat-item-large">
                  <h4>50+</h4>
                  <p>Institutions</p>
                </div>
                <div className="stat-item-large">
                  <h4>95%</h4>
                  <p>Satisfaction</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="section-container">
            <div className="cta-content">
              <h2>Ready to Get Started?</h2>
              <p>Join thousands of students and administrators using HostelMate</p>
              <Link to="/register" className="btn btn-primary btn-lg">
                Create Your Account Today
              </Link>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="contact-section">
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">Get In Touch</h2>
              <p className="section-subtitle">We'd love to help you succeed</p>
            </div>
            <div className="contact-info">
              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <div className="contact-details">
                  <strong>Email</strong>
                  <p>support@hostelmate.local</p>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <div className="contact-details">
                  <strong>Phone</strong>
                  <p>+1 (555) 123-4567</p>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <div className="contact-details">
                  <strong>Location</strong>
                  <p>Campus Hostel Office, University Campus</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
