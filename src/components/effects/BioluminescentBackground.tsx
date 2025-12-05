import ParticleCanvas from './ParticleCanvas';

const BioluminescentBackground = () => {
  return (
    <div className="absolute inset-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
      {/* SVG Definitions for Noodle gradients */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <linearGradient id="noodleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="30%" stopColor="#10B981" />
            <stop offset="70%" stopColor="#34D399" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>

      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(210,50%,5%)] via-[hsl(217,35%,12%)] to-[hsl(210,50%,5%)]" />
      
      {/* Particle canvas background */}
      <ParticleCanvas />
      
      {/* Emerald radial glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[120px]" />
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-teal-500/8 rounded-full blur-[100px]" />
      
      {/* Beam animations */}
      <div className="beam beam-1" />
      <div className="beam beam-2" />
      <div className="beam beam-3" />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:64px_64px] opacity-50" />
      
      {/* Noodle SVG lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <path 
          className="noodle-line" 
          d="M 200 0 Q 180 200 220 400 T 200 900" 
          style={{ animationDelay: '0.5s' }} 
        />
        <path 
          className="noodle-line" 
          d="M 1240 0 Q 1260 250 1220 500 T 1240 900" 
          style={{ animationDelay: '1s' }} 
        />
      </svg>
    </div>
  );
};

export default BioluminescentBackground;
