import { useEffect } from 'react';

const EMOJIS = ['\u{1F44D}', '\u{1F44F}', '\u{1F602}', '\u{1F631}', '\u{1F525}', '\u{1F480}', '\u{1F389}', '\u{1F62D}'];

const EMOJI_LABELS: Record<string, string> = {
  '\u{1F44D}': 'thumbs up', '\u{1F44F}': 'clap', '\u{1F602}': 'laugh', '\u{1F631}': 'scream',
  '\u{1F525}': 'fire', '\u{1F480}': 'skull', '\u{1F389}': 'party', '\u{1F62D}': 'cry',
};

interface Props {
  onSend: (emoji: string) => void;
  reactions: { playerId: string; emoji: string; ts: number }[];
  onExpire: (ts: number) => void;
  players: { id: string; nickname: string }[];
}

export default function ReactionBar({ onSend, reactions, onExpire, players }: Props) {
  useEffect(() => {
    if (reactions.length === 0) return;
    const oldest = reactions[0];
    const timer = setTimeout(() => onExpire(oldest.ts), 3000);
    return () => clearTimeout(timer);
  }, [reactions, onExpire]);

  const nick = (id: string) => players.find(p => p.id === id)?.nickname ?? '?';

  return (
    <div className="relative">
      <div className="flex gap-1 flex-wrap">
        {EMOJIS.map(e => (
          <button key={e} onClick={() => onSend(e)}
            aria-label={`Send ${EMOJI_LABELS[e] ?? 'reaction'}`}
            className="w-10 h-10 text-xl rounded-lg bg-white/10 hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-white">
            {e}
          </button>
        ))}
      </div>
      <div className="absolute bottom-14 left-0 flex flex-col gap-1 pointer-events-none" aria-live="polite">
        {reactions.map(r => (
          <div key={r.ts} className="bg-black/60 text-white text-sm px-2 py-1 rounded-lg animate-bounce">
            {nick(r.playerId)} {r.emoji}
          </div>
        ))}
      </div>
    </div>
  );
}
