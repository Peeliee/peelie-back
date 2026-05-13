import { randomBytes } from 'crypto';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** 사용자 입력 친화적인 8자 friend code (lowercase + 숫자). nanoid 의존성 회피용 자체 구현. */
export function generateFriendCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
