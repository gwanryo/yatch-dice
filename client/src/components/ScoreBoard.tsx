import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { UPPER_CATEGORIES, LOWER_CATEGORIES, type Category, type PlayerInfo } from '../types/game';

interface Props {
  players: PlayerInfo[];
  scores: Record<string, Record<string, number>>;
  currentPlayer: string | null;
  myId: string | null;
  rollCount: number;
  preview: Record<string, number>;
  hoveredCategory: { category: string | null; playerId: string } | null;
  minimized?: boolean;
  onSelectCategory?: (category: Category) => void;
  onHoverCategory?: (category: string | null) => void;
}

function upperSum(playerScores: Record<string, number>): number {
  return UPPER_CATEGORIES.reduce((sum, cat) => sum + (playerScores[cat] ?? 0), 0);
}

function total(playerScores: Record<string, number>): number {
  const sum = Object.values(playerScores).reduce((a, b) => a + b, 0);
  const bonus = upperSum(playerScores) >= 63 ? 35 : 0;
  return sum + bonus;
}

export default memo(function ScoreBoard({
  players, scores, currentPlayer, myId, rollCount,
  preview, hoveredCategory, minimized, onSelectCategory, onHoverCategory,
}: Props) {
  const { t } = useTranslation();
  const isMyTurn = currentPlayer === myId;
  const myScores = myId ? (scores[myId] ?? {}) : {};

  // Cache per-player computed values to avoid redundant calculation
  const playerStats = useMemo(() => {
    return players.map(p => {
      const ps = scores[p.id] ?? {};
      const uSum = upperSum(ps);
      return { id: p.id, upperSum: uSum, total: total(ps), bonusDisplay: uSum >= 63 ? '+35' : `${uSum}/63` };
    });
  }, [players, scores]);

  if (minimized) {
    return (
      <div className="bg-black/50 backdrop-blur-md rounded-xl px-4 py-3 border border-white/5 transition-all duration-300">
        <div className="flex gap-4 items-center justify-center">
          {players.map((p, idx) => (
            <div key={p.id} className="text-center">
              <div className={`text-[10px] truncate max-w-[5rem] ${p.id === currentPlayer ? 'text-yellow-300' : 'text-gray-500'}`}>
                {p.nickname}{p.id === myId ? ' (me)' : ''}
              </div>
              <div className="text-white font-bold text-lg tabular-nums">
                {playerStats[idx]?.total ?? 0}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderRow = (cat: Category) => {
    const canSelect = isMyTurn && rollCount > 0 && myScores[cat] === undefined;
    const previewScore = preview[cat];
    const isHovered = hoveredCategory?.category === cat;
    const isOtherHover = isHovered && hoveredCategory?.playerId !== myId;
    const isMyHover = isHovered && hoveredCategory?.playerId === myId;

    return (
      <tr
        key={cat}
        className={`transition-colors ${
          isMyHover ? 'bg-yellow-500/20' :
          isOtherHover ? 'bg-blue-500/10' :
          canSelect ? 'hover:bg-yellow-500/15 cursor-pointer' : ''
        }`}
        onMouseEnter={() => canSelect && onHoverCategory?.(cat)}
        onMouseLeave={() => canSelect && onHoverCategory?.(null)}
      >
        <td className={`px-2 py-1.5 text-sm font-medium ${
          canSelect ? 'text-yellow-300 font-semibold' : 'text-gray-400'
        }`}>
          {canSelect ? (
            <button
              type="button"
              onClick={() => onSelectCategory?.(cat)}
              onFocus={() => onHoverCategory?.(cat)}
              onBlur={() => onHoverCategory?.(null)}
              className="w-full text-left focus-visible:outline-2 focus-visible:outline-yellow-400 focus-visible:outline-offset-[-2px] rounded-sm"
            >
              {t(`categories.${cat}`)}
            </button>
          ) : (
            t(`categories.${cat}`)
          )}
        </td>
        {players.map(p => {
          const scored = scores[p.id]?.[cat];
          const isPreview = scored === undefined && p.id === currentPlayer && previewScore !== undefined;
          return (
            <td
              key={p.id}
              className={`px-2 py-1.5 text-center text-sm tabular-nums ${
                scored !== undefined
                  ? p.id === currentPlayer ? 'text-white font-bold' : 'text-gray-400'
                  : isPreview
                    ? previewScore === 0
                      ? 'text-yellow-500/15 italic'
                      : 'text-yellow-500/40 italic'
                    : 'text-gray-600'
              }`}
            >
              {scored !== undefined ? scored : isPreview ? previewScore : '-'}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="bg-black/50 backdrop-blur-md rounded-xl p-3 overflow-auto max-h-[80vh] border border-white/5">
      <table className="w-full border-collapse" aria-label={t('game.score')}>
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-xs text-gray-500">{t('game.score')}</th>
            {players.map(p => (
              <th key={p.id} className={`px-2 py-1 text-center text-xs transition-colors truncate max-w-[5rem] ${
                p.id === currentPlayer ? 'text-yellow-300 font-bold' : 'text-gray-500'
              }`}>
                {p.nickname}{p.id === myId ? ' (me)' : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {UPPER_CATEGORIES.map(renderRow)}
          <tr className="border-t border-white/10">
            <td className="px-2 py-1 text-xs text-gray-500">{t('categories.upperBonus')}</td>
            {playerStats.map(ps => (
              <td key={ps.id} className="px-2 py-1 text-center text-xs text-gray-500 tabular-nums">
                {ps.bonusDisplay}
              </td>
            ))}
          </tr>
          <tr aria-hidden="true"><td colSpan={players.length + 1} className="h-2" /></tr>
          {LOWER_CATEGORIES.map(renderRow)}
          <tr className="border-t border-white/20">
            <td className="px-2 py-1 text-sm font-bold text-white">{t('categories.total')}</td>
            {playerStats.map(ps => (
              <td key={ps.id} className="px-2 py-1 text-center text-sm font-bold text-white tabular-nums">
                {ps.total}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
});
