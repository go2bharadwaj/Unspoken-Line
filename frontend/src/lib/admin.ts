import type { User } from 'firebase/auth';

// SHA-256 of each admin's lowercased email, so the addresses aren't published in the app bundle
const ADMIN_EMAIL_SHA256 = [
  '7d93fdded85b9b6c2ffa627a8bdf6483e1b0f0470c8accad56dde3eb65bb5103',
];

/**
 * Admins evaluate readings: every reading is made as if from a first-time user (no baseline,
 * no progression notes) and their ratings are the human eval. Not a security check; it only
 * changes what this account's own client sends.
 */
export async function isAdmin(user: User | null): Promise<boolean> {
  if (!user?.email || !user.emailVerified) return false;
  const bytes = new TextEncoder().encode(user.email.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return ADMIN_EMAIL_SHA256.includes(hex);
}
