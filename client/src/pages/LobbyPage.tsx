import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameAction, GameState } from '../hooks/useGameState';
import type { Envelope } from '../types/game';

interface Props {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  send: (type: string, payload?: unknown) => void;
  on: (type: string, handler: (e: Envelope) => void) => () => void;
  playerId: string | null;
}

export default function LobbyPage({ state, dispatch, send, on }: Props) {
  const { t, i18n } = useTranslation();
  const [nickname, setNickname] = useState(state.nickname);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const nicknameConfirmed = !!state.nickname;

  useEffect(() => {
    if (!nicknameConfirmed) return;
    const unsub = on('room:created', (env: Envelope) => {
      const p = env.payload as { roomCode: string };
      dispatch({ type: 'SET_ROOM', roomCode: p.roomCode });
    });
    return unsub;
  }, [on, dispatch, nicknameConfirmed]);

  const handleNicknameSubmit = () => {
    if (!nickname) return;
    dispatch({ type: 'SET_NICKNAME', nickname });
    localStorage.setItem('yacht-nickname', nickname);
  };

  const handleCreate = () => {
    send('room:create', { password: createPassword || undefined });
  };

  const handleJoin = (roomCode: string, pw?: string) => {
    send('room:join', { roomCode, password: pw || undefined });
  };

  const langs = [
    { code: 'ko', label: '\uD55C\uAD6D\uC5B4' },
    { code: 'en', label: 'English' },
    { code: 'ja', label: '\u65E5\u672C\u8A9E' },
  ];

  // Step 1: Nickname input
  if (!nicknameConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">{t('app.title')}</h1>
            <div className="flex justify-center gap-2">
              {langs.map(l => (
                <button key={l.code} onClick={() => i18n.changeLanguage(l.code)}
                  className={`px-3 py-1 rounded text-sm focus-visible:ring-2 focus-visible:ring-white ${i18n.language === l.code ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <form onSubmit={e => { e.preventDefault(); handleNicknameSubmit(); }} className="bg-black/30 backdrop-blur rounded-xl p-6 space-y-4">
            <label htmlFor="nickname" className="block text-gray-300 text-sm font-medium">{t('lobby.nickname')}</label>
            <input id="nickname" name="nickname" autoComplete="username" spellCheck={false} autoFocus
              value={nickname} onChange={e => setNickname(e.target.value.trim())}
              placeholder={t('lobby.nicknamePlaceholder')} maxLength={20}
              className="w-full bg-white/10 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 text-lg" />
            <button type="submit" disabled={!nickname}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white text-white font-bold py-3 rounded-lg transition-colors text-lg">
              {t('lobby.join')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Step 2: Room list / create / join
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">{t('app.title')}</h1>
          <p className="text-gray-400 text-sm">{nickname}</p>
        </div>

        <div className="bg-black/30 backdrop-blur rounded-xl p-4 space-y-3">
          <label className="sr-only" htmlFor="create-password">{t('lobby.passwordPlaceholder')}</label>
          <input id="create-password" name="create-password" autoComplete="off"
            value={createPassword} onChange={e => setCreatePassword(e.target.value)}
            placeholder={t('lobby.passwordPlaceholder')} type="password"
            className="w-full bg-white/10 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
          <button onClick={handleCreate}
            className="w-full bg-purple-600 hover:bg-purple-700 focus-visible:ring-2 focus-visible:ring-white text-white font-bold py-3 rounded-lg transition-colors">
            {t('lobby.createRoom')}
          </button>
        </div>

        <div className="bg-black/30 backdrop-blur rounded-xl p-4 space-y-3">
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="room-code">{t('lobby.codePlaceholder')}</label>
            <input id="room-code" name="room-code" autoComplete="off" spellCheck={false}
              value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder={t('lobby.codePlaceholder')} maxLength={6}
              className="flex-1 bg-white/10 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500 uppercase tracking-widest" />
            <label className="sr-only" htmlFor="join-password">{t('lobby.password')}</label>
            <input id="join-password" name="join-password" autoComplete="off"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder={t('lobby.password')} type="password"
              className="flex-1 bg-white/10 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
          </div>
          <button onClick={() => handleJoin(code, password)} disabled={code.length < 6}
            className="w-full bg-green-600 hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40 text-white font-bold py-3 rounded-lg transition-colors">
            {t('lobby.join')}
          </button>
        </div>

      </div>
    </div>
  );
}
