import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import './About.css';

const useCases = [
  {
    title: 'Morning Routines',
    description: 'Set up daily chores like making beds, brushing teeth, and packing school bags. Kids check them off as they go — parents see progress in real time.',
    imageKey: 'usecase-morning',
  },
  {
    title: 'Homework Tracking',
    description: 'Assign homework tasks with descriptions and deadlines. Children can request help when they\'re stuck, and parents get notified instantly.',
    imageKey: 'usecase-homework',
  },
  {
    title: 'Household Chores',
    description: 'Distribute weekly chores fairly across the family. Everyone knows what they\'re responsible for — no more "I didn\'t know it was my turn!"',
    imageKey: 'usecase-chores',
  },
  {
    title: 'Family Events',
    description: 'Birthday parties, sports practice, playdates — kids can request lifts and parents can accept or coordinate. No more last-minute "Can you take me?" surprises.',
    imageKey: 'usecase-project',
  },
];

export default function About() {
  const { user } = useAuth();
  const [siteImages, setSiteImages] = useState({});

  useEffect(() => {
    api.getSiteImages().then(res => setSiteImages(res.images || {})).catch(() => {});
  }, []);

  return (
    <div className="about-page">
      <section className="hero">
        <div className="hero-content">
          <svg className="hero-logo" width="56" height="56" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="var(--accent-green)" />
            <text x="14" y="20.5" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="700" fill="#ffffff">F</text>
          </svg>
          <h1>Meet <span className="text-accent">FamilySync</span></h1>
          <p className="hero-subtitle">
            The family task manager that brings everyone together.
            Assign chores, track progress, and keep your household running smoothly — all in one place.
          </p>
          <div className="hero-actions">
            {!user && <Link to="/register" className="btn btn-primary btn-large">Get Started Free</Link>}
            <Link to="/contact" className="btn btn-secondary btn-large">Get in Touch</Link>
          </div>
          <div className="features-strip">
            <div className="feature-pill"><span className="pill-icon">&#9889;</span> Real-time updates</div>
            <div className="feature-pill"><span className="pill-icon">&#128106;</span> Built for families</div>
            <div className="feature-pill"><span className="pill-icon">&#128274;</span> Private &amp; secure</div>
            <div className="feature-pill"><span className="pill-icon">&#127775;</span> Kid-friendly</div>
          </div>
          <h2 className="how-it-works-heading">How It Works in 4 Simple Steps</h2>
        </div>
      </section>

      <section className="how-it-works">
        <div className="steps-grid">
          <div className="step">
            <div className="step-icon-wrap">
              <div className="step-number">1</div>
              <svg className="step-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13" cy="10" r="4" className="step-icon-family" />
                <path d="M13 14C9 14 6 17 6 21V30" className="step-icon-family" />
                <path d="M13 14C17 14 20 17 20 21V24" className="step-icon-family" />
                <circle cx="35" cy="10" r="4" className="step-icon-family" />
                <path d="M35 14C39 14 42 17 42 21V30" className="step-icon-family" />
                <path d="M35 14C31 14 28 17 28 21V24" className="step-icon-family" />
                <path d="M6 30C6 30 10 32 17 32" className="step-icon-arm" />
                <path d="M42 30C42 30 38 32 31 32" className="step-icon-arm" />
                <circle cx="17" cy="24" r="3.5" className="step-icon-child" />
                <path d="M17 27.5C13.5 27.5 11 30 11 33V38H23V33C23 30 20.5 27.5 17 27.5Z" className="step-icon-child" />
                <circle cx="31" cy="24" r="3.5" className="step-icon-child" />
                <path d="M31 27.5C27.5 27.5 25 30 25 33V38H37V33C37 30 34.5 27.5 31 27.5Z" className="step-icon-child" />
              </svg>
            </div>
            <h3>Create Your Family</h3>
            <p>Sign up and set up your family group in seconds. You'll be the family admin with full control.</p>
          </div>
          <div className="step-connector"><div className="connector-line" /><div className="connector-arrow" /></div>
          <div className="step">
            <div className="step-icon-wrap">
              <div className="step-number">2</div>
              <svg className="step-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="14" width="36" height="24" rx="3" />
                <path d="M6 18L24 30L42 18" className="step-icon-flap" />
                <circle cx="36" cy="10" r="6" className="step-icon-badge" />
                <path d="M33 10L35 12L39 8" className="step-icon-badge-check" />
              </svg>
            </div>
            <h3>Invite Family Members</h3>
            <p>Send email invites to family members. Everyone gets their own account to manage their tasks.</p>
          </div>
          <div className="step-connector"><div className="connector-line" /><div className="connector-arrow" /></div>
          <div className="step">
            <div className="step-icon-wrap">
              <div className="step-number">3</div>
              <svg className="step-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="10" y="6" width="28" height="36" rx="3" />
                <path d="M17 16H31" />
                <path d="M17 22H31" />
                <path d="M17 28H26" />
                <circle cx="34" cy="34" r="8" className="step-icon-recurring" />
                <path d="M34 30V34L37 36" />
                <path d="M30 27C31 25.5 32.5 25 34 25" className="step-icon-recurring-arrow" />
              </svg>
            </div>
            <h3>Send Requests</h3>
            <p>Need something done? Send a request to a family member or everyone at once. Add deadlines and set up recurring schedules.</p>
          </div>
          <div className="step-connector"><div className="connector-line" /><div className="connector-arrow" /></div>
          <div className="step">
            <div className="step-icon-wrap">
              <div className="step-number">4</div>
              <svg className="step-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 40L6 12" />
                <path d="M6 40L42 40" />
                <rect x="10" y="28" width="6" height="12" rx="1" className="step-icon-bar bar-1" />
                <rect x="19" y="22" width="6" height="18" rx="1" className="step-icon-bar bar-2" />
                <rect x="28" y="16" width="6" height="24" rx="1" className="step-icon-bar bar-3" />
                <rect x="37" y="10" width="6" height="30" rx="1" className="step-icon-bar bar-4" />
                <path d="M13 24L22 18L31 12L40 6" className="step-icon-trend" />
              </svg>
            </div>
            <h3>Requests Become Tasks</h3>
            <p>When someone accepts a request, it becomes their task to complete. Track progress, mark things done, and keep everyone accountable.</p>
          </div>
        </div>
      </section>

      <section className="use-cases">
        <h2 className="section-title">How Families Use FamilySync</h2>
        {useCases.map((uc, i) => {
          const img = siteImages[uc.imageKey];
          return (
            <div className={`use-case ${i % 2 === 1 ? 'reverse' : ''}`} key={uc.title}>
              <div className="use-case-text">
                <h3>{uc.title}</h3>
                <p>{uc.description}</p>
              </div>
              <div className="use-case-photo">
                {img && img.url ? (
                  <img src={img.url} alt={img.alt || uc.title} loading="lazy" />
                ) : (
                  <div className="use-case-placeholder">{uc.title}</div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {!user && (
        <section className="cta">
          <h2>Ready to get your family in sync?</h2>
          <p>It's free and takes less than a minute to set up.</p>
          <Link to="/register" className="btn btn-primary btn-large">Create Your Family</Link>
        </section>
      )}

      <footer className="about-footer">
        <Link to="/privacy">Privacy</Link>
        <span className="dot" />
        <Link to="/terms">Terms</Link>
        <span className="dot" />
        <Link to="/contact">Contact</Link>
        <span className="dot" />
        <Link to="/install">Install App</Link>
      </footer>
    </div>
  );
}
