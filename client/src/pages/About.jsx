import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './About.css';

const useCases = [
  {
    title: 'Morning Routines',
    description: 'Set up daily chores like making beds, brushing teeth, and packing school bags. Kids check them off as they go — parents see progress in real time.',
    illustration: 'morning',
  },
  {
    title: 'Homework Tracking',
    description: 'Assign homework tasks with descriptions and deadlines. Children can request help when they\'re stuck, and parents get notified instantly.',
    illustration: 'homework',
  },
  {
    title: 'Household Chores',
    description: 'Distribute weekly chores fairly across the family. Everyone knows what they\'re responsible for — no more "I didn\'t know it was my turn!"',
    illustration: 'chores',
  },
  {
    title: 'Family Projects',
    description: 'Planning a garage sale, garden makeover, or holiday prep? Break big projects into tasks and assign them to family members.',
    illustration: 'project',
  },
];

function MorningIllustration() {
  return (
    <div className="illustration morning-scene">
      <div className="sun">
        <div className="sun-core" />
        <div className="sun-ray ray-1" />
        <div className="sun-ray ray-2" />
        <div className="sun-ray ray-3" />
        <div className="sun-ray ray-4" />
        <div className="sun-ray ray-5" />
        <div className="sun-ray ray-6" />
      </div>
      <div className="checklist">
        <div className="check-item done"><span className="checkmark">&#10003;</span> Make bed</div>
        <div className="check-item done delay-1"><span className="checkmark">&#10003;</span> Breakfast</div>
        <div className="check-item pending delay-2"><span className="checkbox" /> Pack bag</div>
      </div>
    </div>
  );
}

function HomeworkIllustration() {
  return (
    <div className="illustration homework-scene">
      <div className="book">
        <div className="book-cover" />
        <div className="book-pages">
          <div className="book-line" />
          <div className="book-line short" />
          <div className="book-line" />
          <div className="book-line short" />
        </div>
      </div>
      <div className="help-bubble">
        <span>?</span>
      </div>
      <div className="lightbulb">
        <div className="bulb" />
        <div className="bulb-glow" />
      </div>
    </div>
  );
}

function ChoresIllustration() {
  return (
    <div className="illustration chores-scene">
      <div className="wheel">
        <div className="wheel-ring" />
        <div className="wheel-section section-1"><span>Dishes</span></div>
        <div className="wheel-section section-2"><span>Vacuum</span></div>
        <div className="wheel-section section-3"><span>Trash</span></div>
        <div className="wheel-section section-4"><span>Laundry</span></div>
      </div>
    </div>
  );
}

function ProjectIllustration() {
  return (
    <div className="illustration project-scene">
      <div className="kanban">
        <div className="kanban-col">
          <div className="kanban-header">To Do</div>
          <div className="kanban-card float-1" />
          <div className="kanban-card float-2" />
        </div>
        <div className="kanban-col">
          <div className="kanban-header">Doing</div>
          <div className="kanban-card active float-3" />
        </div>
        <div className="kanban-col">
          <div className="kanban-header">Done</div>
          <div className="kanban-card completed float-1" />
          <div className="kanban-card completed float-2" />
        </div>
      </div>
    </div>
  );
}

const illustrations = {
  morning: MorningIllustration,
  homework: HomeworkIllustration,
  chores: ChoresIllustration,
  project: ProjectIllustration,
};

export default function About() {
  const { user } = useAuth();
  return (
    <div className="about-page">
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb orb-1" />
          <div className="hero-orb orb-2" />
          <div className="hero-orb orb-3" />
        </div>
        <div className="hero-content">
          <span className="hero-icon">&#x27D0;</span>
          <h1>Meet <span className="text-green">FamilySync</span></h1>
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
        </div>
      </section>

      <section className="how-it-works">
        <h2 className="section-title">Get Started in 4 Simple Steps</h2>
        <div className="steps-grid">
          <div className="step">
            <div className="step-icon-wrap">
              <div className="step-number">1</div>
              <svg className="step-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M24 8L30 4L36 8V16L30 20L24 16V8Z" className="step-icon-house" />
                <path d="M30 20V28" />
                <circle cx="20" cy="34" r="5" />
                <circle cx="30" cy="36" r="4" />
                <circle cx="40" cy="34" r="3" />
                <path d="M12 38C12 38 14 32 20 32" className="step-icon-ground" />
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
            <h3>Invite Your Family</h3>
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
            <h3>Create &amp; Assign Tasks</h3>
            <p>Add tasks and events, set deadlines, assign them to family members, and schedule recurring ones.</p>
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
            <h3>Track Progress</h3>
            <p>See what's done, what's overdue, and what's coming up. Keep everyone accountable and on track.</p>
          </div>
        </div>
      </section>

      <section className="use-cases">
        <h2 className="section-title">How Families Use FamilySync</h2>
        {useCases.map((uc, i) => {
          const Illustration = illustrations[uc.illustration];
          return (
            <div className={`use-case ${i % 2 === 1 ? 'reverse' : ''}`} key={uc.title}>
              <div className="use-case-text">
                <h3>{uc.title}</h3>
                <p>{uc.description}</p>
              </div>
              <div className="use-case-visual">
                <Illustration />
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
      </footer>
    </div>
  );
}
