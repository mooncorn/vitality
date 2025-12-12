// 6-digit alphanumeric lobby code generator
// Uses uppercase letters and numbers, avoiding ambiguous characters (0, O, I, L, 1)

const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateLobbyCode(): string {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);

  return Array.from(array)
    .map(byte => CHARSET[byte % CHARSET.length])
    .join('');
}

export function isValidLobbyCode(code: string): boolean {
  if (code.length !== 6) return false;
  const upperCode = code.toUpperCase();
  return [...upperCode].every(char => CHARSET.includes(char));
}

export function normalizeLobbyCode(code: string): string {
  return code.toUpperCase().trim();
}
