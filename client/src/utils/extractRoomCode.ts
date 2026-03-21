/** Extract a room code from either a plain code string or a full URL containing ?room=XXX */
export function extractRoomCode(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    const room = url.searchParams.get('room');
    return room ? room.toUpperCase() : '';
  } catch {
    // Not a URL — treat as plain room code
    return trimmed.toUpperCase();
  }
}
