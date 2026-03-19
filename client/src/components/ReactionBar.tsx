import { useEffect, useRef, memo } from 'react';

const EMOJIS = ['\u{1F44D}', '\u{1F44F}', '\u{1F602}', '\u{1F631}', '\u{1F525}', '\u{1F480}', '\u{1F389}', '\u{1F62D}'];

const EMOJI_LABELS: Record<string, string> = {
  '\u{1F44D}': 'thumbs up', '\u{1F44F}': 'clap', '\u{1F602}': 'laugh', '\u{1F631}': 'scream',
  '\u{1F525}': 'fire', '\u{1F480}': 'skull', '\u{1F389}': 'party', '\u{1F62D}': 'cry',
};

interface Props {
  onSend: (emoji: string) => void;
  reactions: { playerId: string; emoji: string; id: string }[];
  onExpire: (id: string) => void;
  players: { id: string; nickname: string }[];
}

export default memo(function ReactionBar({ onSend, reactions, onExpire, players }: Props) {
  const activeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    // Set timers for new reactions
    for (const r of reactions) {
      if (activeTimers.current.has(r.id)) continue;
      const timer = setTimeout(() => {
        activeTimers.current.delete(r.id);
        onExpire(r.id);
      }, 3000);
      activeTimers.current.set(r.id, timer);
    }
    // Clean up timers for removed reactions
    for (const [id, timer] of activeTimers.current) {
      if (!reactions.some(r => r.id === id)) {
        clearTimeout(timer);
        activeTimers.current.delete(id);
      }
    }
  }, [reactions, onExpire]);

  // Clean up all timers on unmount
  useEffect(() => {
    const timers = activeTimers.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

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
          <div key={r.id} className="bg-black/60 text-white text-sm px-2 py-1 rounded-lg animate-bounce">
            {nick(r.playerId)} {r.emoji}
          </div>
        ))}
      </div>
    </div>
  );
});
