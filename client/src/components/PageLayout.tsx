import type { GamePhase } from '../types/game';

interface Props {
  children: React.ReactNode;
  className?: string;
  phase?: GamePhase;
}

const spotlightByPhase: Record<string, string> = {
  lobby: 'radial-gradient(ellipse at 50% 30%, rgba(5,150,105,0.08) 0%, transparent 60%)',
  room: 'radial-gradient(ellipse at 50% 40%, rgba(5,150,105,0.1) 0%, rgba(59,130,246,0.04) 40%, transparent 60%)',
  result: 'radial-gradient(ellipse at 50% 25%, rgba(245,158,11,0.1) 0%, rgba(5,150,105,0.05) 40%, transparent 60%)',
};

export default function PageLayout({ children, className, phase = 'lobby' }: Props) {
  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-gray-950 via-emerald-950 to-gray-950 flex items-center justify-center p-4 relative${className ? ` ${className}` : ''}`}
    >
      {/* Grain texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" aria-hidden="true"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
      />
      {/* Phase-specific radial spotlight */}
      <div className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-700" aria-hidden="true"
        style={{ background: spotlightByPhase[phase] ?? spotlightByPhase.lobby }}
      />
      <main id="main-content" className="relative z-10 flex items-center justify-center w-full">
        {children}
      </main>
    </div>
  );
}
