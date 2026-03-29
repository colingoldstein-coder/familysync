import { Link } from 'react-router-dom';
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
            <Link to="/register" className="btn btn-primary btn-large">Get Started Free</Link>
            <Link to="/contact" className="btn btn-secondary btn-large">Get in Touch</Link>
          </div>
        </div>
      </section>

      <section className="features-strip">
        <div className="feature-pill"><span className="pill-icon">&#9889;</span> Real-time updates</div>
        <div className="feature-pill"><span className="pill-icon">&#128106;</span> Built for families</div>
        <div className="feature-pill"><span className="pill-icon">&#128274;</span> Private &amp; secure</div>
        <div className="feature-pill"><span className="pill-icon">&#127775;</span> Kid-friendly</div>
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

      <section className="cta">
        <h2>Ready to get your family in sync?</h2>
        <p>It's free and takes less than a minute to set up.</p>
        <Link to="/register" className="btn btn-primary btn-large">Create Your Family</Link>
      </section>

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
