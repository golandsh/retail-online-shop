import { useEmulator } from '../firebase';

export const DEFAULT_ALLOWED_ADMIN_EMAILS = [
  'golandsh@gmail.com',
  'itaycohen131@gmail.com',
];

/**
 * Checks whether an email address is authorized for admin portal access.
 * If running against the local Firebase emulator (useEmulator = true),
 * all emails are permitted to support local testing and development.
 */
export function isEmailWhitelisted(email: string | null | undefined): boolean {
  if (useEmulator) {
    return true;
  }

  if (!email) {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const envEmails = import.meta.env.VITE_ALLOWED_ADMIN_EMAILS
    ? (import.meta.env.VITE_ALLOWED_ADMIN_EMAILS as string)
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    : [];

  const allowedEmails = new Set([
    ...DEFAULT_ALLOWED_ADMIN_EMAILS.map((e) => e.toLowerCase()),
    ...envEmails,
  ]);

  return allowedEmails.has(normalizedEmail);
}
