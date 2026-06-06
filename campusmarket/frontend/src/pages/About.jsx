import React from 'react';
import { Link } from 'react-router-dom';
import AuthNavbar from '../components/AuthNavbar';

const team = [
  {
    name: 'Praises Ncha',
    subtitle: 'Scrum Master',
    role: 'Software Engineering Student',
    company: 'Currently at RENEWBERRY',
    bio: "I'm a Software Engineering student, developer, and technology enthusiast. I enjoy creating software solutions and learning new technologies.",
    contributions: ['Design', 'Frontend', 'Testing', 'Jenkins', 'VPS', 'Grafana', 'Prometheus', 'SonarQube'],
    tags: ['Scrum Master', 'Frontend', 'DevOps', 'Testing', 'React'],
    socials: { github: 'Nkinyampraises' },
    initials: 'PN',
    gradient: 'from-[#ff6b1a] to-[#ff9a5c]',
    photo: '/praises.jpg',
    photoPosition: 'object-top',
  },
  {
    name: 'Kongyu Jesse Ntani',
    subtitle: 'Product Owner',
    studentId: 'ICTU20234195',
    role: 'Co-Developer & Entrepreneur',
    company: 'Founder of RFA & Uplift Social',
    bio: 'Visionary entrepreneur, aspiring politician, and engineer with a passion for building institutions that uplift communities. Founder of Realities Foundation Association (RFA) and Uplift Social — dedicated to driving positive change through technology and leadership.',
    contributions: ['Backend', 'Microservices', 'Event-Driven Architecture', 'Documentation', 'PowerPoint', 'Architecture'],
    tags: ['Product Owner', 'Backend', 'Microservices', 'Architecture', 'Documentation'],
    socials: {},
    initials: 'KN',
    gradient: 'from-[#1a56ff] to-[#5c9aff]',
    photo: '/jesse.jpg',
    photoPosition: 'object-center',
  },
];

const MemberCard = ({ member }) => {
  const [imgError, setImgError] = React.useState(false);

  return (
    <div className="bg-white rounded-3xl shadow-[0px_4px_40px_rgba(0,0,0,0.08)] overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Photo / Avatar */}
      <div className="relative h-72 overflow-hidden bg-gray-900">
        {!imgError ? (
          <img
            src={member.photo}
            alt={member.name}
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover ${member.photoPosition}`}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${member.gradient} flex items-center justify-center`}>
            <span className="text-white text-7xl font-black tracking-tighter opacity-80">
              {member.initials}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {member.studentId && (
          <span className="absolute top-4 right-4 bg-white/90 text-[11px] font-black tracking-wider text-gray-600 px-3 py-1 rounded-full">
            {member.studentId}
          </span>
        )}
        {/* Name overlay on photo */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="font-[Epilogue] text-[22px] font-black text-white mb-0.5">{member.name}</h3>
          <span className="inline-block bg-[#ff6b1a] text-white text-[11px] font-black px-3 py-1 rounded-full">
            {member.subtitle}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-6">
        <p className="text-gray-400 text-[12px] font-semibold mb-1">{member.role}</p>
        <p className="text-gray-400 text-[12px] font-semibold mb-4 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">work</span>
          {member.company}
        </p>

        <p className="text-[14px] text-[#5c5f60] leading-relaxed mb-5">{member.bio}</p>

        {/* Contributions */}
        <div className="mb-5">
          <p className="text-[11px] font-black text-[#1b1c1c] uppercase tracking-widest mb-2">Worked On</p>
          <div className="flex flex-wrap gap-2">
            {member.contributions.map((item) => (
              <span
                key={item}
                className="bg-[#fff4ee] text-[#ff6b1a] text-[11px] font-bold px-3 py-1 rounded-full border border-[#ffd9c4]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* GitHub */}
        {member.socials.github && (
          <a
            href={`https://github.com/${member.socials.github}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[13px] font-bold text-gray-500 hover:text-[#1b1c1c] transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            github.com/{member.socials.github}
          </a>
        )}
      </div>
    </div>
  );
};

const About = () => {
  return (
    <div className="min-h-screen bg-[#fcf9f8] font-[Manrope]">
      <AuthNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#1b1c1c] py-24 px-6">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#ff6b1a] rounded-full -ml-48 -mt-48" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#ff6b1a] rounded-full -mr-48 -mb-48" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <span className="inline-block bg-[#ff6b1a]/20 text-[#ff9a5c] text-[12px] font-black tracking-widest uppercase px-4 py-2 rounded-full mb-6">
            Meet the Team
          </span>
          <h1 className="font-[Epilogue] text-[48px] md:text-[56px] font-black text-white leading-tight mb-6">
            Built by students,<br />
            <span className="text-[#ff6b1a]">for students.</span>
          </h1>
          <p className="text-gray-400 text-[17px] leading-relaxed max-w-xl mx-auto">
            CampusTrade was built as part of the SEN3244 Software Architecture course at ICT University —
            a real microservices marketplace deployed on production infrastructure.
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '9', label: 'Microservices' },
            { value: '95%+', label: 'Test Coverage' },
            { value: '232', label: 'Tests Passing' },
            { value: '2', label: 'Team Members' },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-[Epilogue] text-[28px] font-black text-[#ff6b1a]">{s.value}</p>
              <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Team cards */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="font-[Epilogue] text-[36px] font-black text-[#1b1c1c] mb-3">The Developers</h2>
          <p className="text-gray-500 text-[15px]">ICT University — SEN3244 Software Architecture, 2026</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {team.map((member) => (
            <MemberCard key={member.name} member={member} />
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section className="bg-white border-t border-b border-gray-100 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-[Epilogue] text-[28px] font-black text-[#1b1c1c] mb-2 text-center">Tech Stack</h2>
          <p className="text-gray-400 text-[14px] text-center mb-10">What powers CampusTrade</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'React 18', icon: 'web', color: '#61dafb' },
              { name: 'Node.js', icon: 'terminal', color: '#68a063' },
              { name: 'PostgreSQL', icon: 'database', color: '#336791' },
              { name: 'Docker', icon: 'inventory_2', color: '#2496ed' },
              { name: 'Kubernetes', icon: 'hub', color: '#326ce5' },
              { name: 'Redis', icon: 'bolt', color: '#dc382d' },
              { name: 'Jenkins CI', icon: 'construction', color: '#d33832' },
              { name: 'SonarQube', icon: 'verified_user', color: '#4e9bcd' },
            ].map((tech) => (
              <div key={tech.name} className="bg-[#f8f5f3] rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-all">
                <span className="material-symbols-outlined text-[22px]" style={{ color: tech.color }}>
                  {tech.icon}
                </span>
                <span className="text-[13px] font-bold text-[#1b1c1c]">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 text-center">
        <h2 className="font-[Epilogue] text-[28px] font-black text-[#1b1c1c] mb-4">
          Ready to buy or sell on campus?
        </h2>
        <p className="text-gray-500 text-[15px] mb-8">Join ICT University students already trading.</p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/register"
            className="bg-[#ff6b1a] text-white px-8 py-3.5 rounded-xl font-bold text-[15px] hover:shadow-lg hover:shadow-orange-200 transition-all"
          >
            Get Started
          </Link>
          <Link
            to="/browse"
            className="border-2 border-gray-200 text-[#1b1c1c] px-8 py-3.5 rounded-xl font-bold text-[15px] hover:bg-gray-50 transition-all"
          >
            Browse Listings
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-[13px] text-gray-400">
        <p>© 2026 CampusTrade · ICT University · SEN3244 Software Architecture</p>
        <p className="mt-1">Built with dedication by Praises Ncha & Kongyu Jesse Ntani</p>
      </footer>
    </div>
  );
};

export default About;
