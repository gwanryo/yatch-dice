import { useTranslation } from 'react-i18next';
import { UPPER_CATEGORIES, LOWER_CATEGORIES, type Category, type PlayerInfo } from '../types/game';

interface Props {
  players: PlayerInfo[];
  scores: Record<string, Record<string, number>>;
  currentPlayer: string | null;
  myId: string | null;
  rollCount: number;
  onSelectCategory?: (category: Category) => void;
}

function upperSum(playerScores: Record<string, number>): number {
  return UPPER_CATEGORIES.reduce((sum, cat) => sum + (playerScores[cat] ?? 0), 0);
}

function total(playerScores: Record<string, number>): number {
  const sum = Object.values(playerScores).reduce((a, b) => a + b, 0);
  const bonus = upperSum(playerScores) >= 63 ? 35 : 0;
  return sum + bonus;
}

export default function ScoreBoard({ players, scores, currentPlayer, myId, rollCount, onSelectCategory }: Props) {
  const { t } = useTranslation();
  const isMyTurn = currentPlayer === myId;
  const myScores = myId ? (scores[myId] ?? {}) : {};

  const renderRow = (cat: Category) => {
    const canSelect = isMyTurn && rollCount > 0 && myScores[cat] === undefined;
    return (
      <tr key={cat} className={canSelect ? 'hover:bg-white/10' : ''}>
        <td className={`px-2 py-1 text-sm font-medium ${canSelect ? 'text-yellow-300' : 'text-gray-300'}`}>
          {canSelect ? (
            <button
              onClick={() => onSelectCategory?.(cat)}
              className="w-full text-left text-yellow-300 hover:text-yellow-200 focus-visible:ring-2 focus-visible:ring-yellow-400 rounded"
            >
              {t(`categories.${cat}`)}
            </button>
          ) : (
            t(`categories.${cat}`)
          )}
        </td>
        {players.map(p => (
          <td key={p.id} className={`px-2 py-1 text-center text-sm tabular-nums ${p.id === currentPlayer ? 'text-white font-bold' : 'text-gray-400'}`}>
            {scores[p.id]?.[cat] !== undefined ? scores[p.id][cat] : '-'}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className="bg-black/40 backdrop-blur rounded-xl p-3 overflow-auto max-h-[70vh]">
      <table className="w-full border-collapse" aria-label={t('game.score')}>
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-xs text-gray-500">{t('game.score')}</th>
            {players.map(p => (
              <th key={p.id} className={`px-2 py-1 text-center text-xs ${p.id === currentPlayer ? 'text-yellow-300' : 'text-gray-400'}`}>
                {p.nickname}{p.id === myId ? ' (me)' : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {UPPER_CATEGORIES.map(renderRow)}
          <tr className="border-t border-white/10">
            <td className="px-2 py-1 text-xs text-gray-500">{t('categories.upperBonus')}</td>
            {players.map(p => (
              <td key={p.id} className="px-2 py-1 text-center text-xs text-gray-500">
                {upperSum(scores[p.id] ?? {}) >= 63 ? '+35' : `${upperSum(scores[p.id] ?? {})}/63`}
              </td>
            ))}
          </tr>
          <tr className="h-2" />
          {LOWER_CATEGORIES.map(renderRow)}
          <tr className="border-t border-white/20">
            <td className="px-2 py-1 text-sm font-bold text-white">{t('categories.total')}</td>
            {players.map(p => (
              <td key={p.id} className="px-2 py-1 text-center text-sm font-bold text-white tabular-nums">
                {total(scores[p.id] ?? {})}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
