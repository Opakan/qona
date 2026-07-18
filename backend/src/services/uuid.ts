import { randomUUID } from 'crypto';

/**
 * Generate a cryptographically-random UUID v4.
 * Uses Node's built-in crypto.randomUUID() (Node ≥ 14.17).
 */
export function generateUUID(): string {
  return randomUUID();
}

/**
 * Returns true if the string looks like a valid UUID v4.
 */
export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
