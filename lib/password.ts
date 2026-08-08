import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const SCRYPT_PREFIX = 'scrypt'

export function hashPassword(plainPassword: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(plainPassword, salt, 64).toString('hex')
  return `${SCRYPT_PREFIX}$${salt}$${hash}`
}

export function verifyPassword(plainPassword: string, encoded: string): boolean {
  const [prefix, salt, storedHash] = encoded.split('$')

  if (prefix !== SCRYPT_PREFIX || !salt || !storedHash) {
    return false
  }

  const computed = scryptSync(plainPassword, salt, 64)
  const stored = Buffer.from(storedHash, 'hex')

  if (computed.length !== stored.length) {
    return false
  }

  return timingSafeEqual(computed, stored)
}
