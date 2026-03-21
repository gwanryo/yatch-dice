import { useEffect, useRef, useState, memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const EMOJIS = ['\u{1F44D}', '\u{1F44F}', '\u{1F602}', '\u{1F631}', '\u{1F525}', '\u{1F480}', '\u{1F389}', '\u{1F62D}'];

const EMOJI_KEYS: Record<string, string> = {
  '\u{1F44D}': 'thumbsUp', '\u{1F44F}': 'clap', '\u{1F602}': 'laugh', '\u{1F631}': 'scream',
  '\u{1F525}': 'fire', '\u{1F480}': 'skull', '\u{1F389}': 'party', '\u{1F62D}': 'cry',
};

const MAX_FLOATS = 8;
const FLOAT_DURATION = 2500;
const BADGE_DURATION = 5000;
const MAX_PROCESSED_IDS = 200;

interface Props {
  onSend: (emoji: string) => void;
  reactions: { playerId: string; emoji: string; id: string }[];
  onExpire: (id: string) => void;
  players: { id: string; nickname: string }[];
}

interface FloatingEmoji {
  id: string;
  emoji: string;
  nickname: string;
  x: number;
}

export default memo(function ReactionBar({ onSend, reactions, onExpire, players }: Props) {
  const { t } = useTranslation();
  const activeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const floatTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [floats, setFloats] = useState<FloatingEmoji[]>([]);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const badgeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const processedIds = useRef<Set<string>>(new Set());

  const nick = useCallback((id: string) => players.find(p => p.id === id)?.nickname ?? '?', [players]);

  // Process new reactions → floating emojis + badges
  useEffect(() => {
    for (const r of reactions) {
      if (processedIds.current.has(r.id)) continue;
      processedIds.current.add(r.id);

      // Trim processedIds to prevent unbounded growth
      if (processedIds.current.size > MAX_PROCESSED_IDS) {
        const entries = [...processedIds.current];
        processedIds.current = new Set(entries.slice(-MAX_PROCESSED_IDS / 2));
      }

      // Add floating emoji
      const fe: FloatingEmoji = {
        id: r.id,
        emoji: r.emoji,
        nickname: nick(r.playerId),
        x: 10 + Math.random() * 70,
      };
      setFloats(prev => {
        const next = [...prev, fe];
        return next.length > MAX_FLOATS ? next.slice(-MAX_FLOATS) : next;
      });

      // Remove float after animation
      const floatTimer = setTimeout(() => {
        setFloats(prev => prev.filter(f => f.id !== r.id));
        floatTimers.current.delete(r.id);
      }, FLOAT_DURATION);
      floatTimers.current.set(r.id, floatTimer);

      // Update badge count
      setBadges(prev => ({ ...prev, [r.emoji]: (prev[r.emoji] ?? 0) + 1 }));

      // Reset badge after timeout
      const existing = badgeTimers.current.get(r.emoji);
      if (existing) clearTimeout(existing);
      badgeTimers.current.set(r.emoji, setTimeout(() => {
        setBadges(prev => {
          const next = { ...prev };
          delete next[r.emoji];
          return next;
        });
        badgeTimers.current.delete(r.emoji);
      }, BADGE_DURATION));

      // Set expiry timer for the reaction
      if (!activeTimers.current.has(r.id)) {
        const timer = setTimeout(() => {
          activeTimers.current.delete(r.id);
          onExpire(r.id);
        }, 3000);
        activeTimers.current.set(r.id, timer);
      }
    }

    // Clean up timers for removed reactions (Set for O(1) lookup)
    const currentIds = new Set(reactions.map(r => r.id));
    for (const [id, timer] of activeTimers.current) {
      if (!currentIds.has(id)) {
        clearTimeout(timer);
        activeTimers.current.delete(id);
      }
    }
  }, [reactions, onExpire, nick]);

  // Clean up all timers on unmount
  useEffect(() => {
    const timers = activeTimers.current;
    const fTimers = floatTimers.current;
    const bTimers = badgeTimers.current;
    const pIds = processedIds.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      for (const timer of fTimers.values()) clearTimeout(timer);
      for (const timer of bTimers.values()) clearTimeout(timer);
      timers.clear();
      fTimers.clear();
      bTimers.clear();
      pIds.clear();
    };
  }, []);

  return (
    <div className="relative">
      {/* Floating emojis zone */}
      <div className="absolute bottom-14 left-0 right-0 h-48 pointer-events-none overflow-hidden" aria-hidden="true">
        {floats.map(f => (
          <div
            key={f.id}
            className="absolute animate-reaction-float"
            style={{ left: `${f.x}%`, bottom: 0 }}
          >
            <span className="text-4xl drop-shadow-lg">{f.emoji}</span>
            <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[9px] text-white/60 bg-black/50 px-1.5 py-px rounded whitespace-nowrap max-w-[6rem] truncate">
              {f.nickname}
            </span>
          </div>
        ))}
      </div>

      {/* Emoji buttons */}
      <div className="flex gap-1 flex-wrap">
        {EMOJIS.map(e => (
          <button
            key={e}
            onClick={() => onSend(e)}
            aria-label={t('aria.sendReaction', { name: t(`aria.emoji.${EMOJI_KEYS[e]}`) })}
            className="relative w-10 h-10 text-xl rounded-full bg-white/8 border-2 border-transparent
              hover:bg-white/15 hover:border-white/20 hover:scale-115
              active:scale-90 transition-[transform,background-color,border-color] duration-150
              focus-visible:ring-2 focus-visible:ring-white"
          >
            {e}
            {badges[e] ? (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 animate-badge-pop pointer-events-none">
                {badges[e]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

    </div>
  );
});
