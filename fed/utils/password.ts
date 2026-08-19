const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*_-+=';

function pick(source: string, n: number, rand: () => number): string {
  let out = '';
  for (let i = 0; i < n; i++) out += source[Math.floor(rand() * source.length)];
  return out;
}

export function generatePassword(length = 16): string {
  const bytes = new Uint32Array(length + 8);
  crypto.getRandomValues(bytes);
  let i = 0;
  const rand = () => {
    const v = bytes[i++ % bytes.length];
    return v / 2 ** 32;
  };
  const base = pick(LOWER, 5, rand) + pick(UPPER, 4, rand) + pick(DIGITS, 4, rand) + pick(SYMBOLS, 3, rand);
  const chars = base.split('');
  for (let j = chars.length - 1; j > 0; j--) {
    const k = Math.floor(rand() * (j + 1));
    [chars[j], chars[k]] = [chars[k], chars[j]];
  }
  return chars.slice(0, length).join('');
}

export function passwordIssues(password?: string): string[] {
  const issues: string[] = [];
  if (!password) {
    issues.push('空密码');
    return issues;
  }
  if (password.length < 10) issues.push('过短');
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) issues.push('复杂度不足');
  const common = ['123456', 'password', 'qwerty', '111111', 'abc123'];
  if (common.includes(password.toLowerCase())) issues.push('常见密码');
  return issues;
}
