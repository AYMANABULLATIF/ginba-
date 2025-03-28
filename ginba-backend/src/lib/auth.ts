// lib/auth.ts
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'secret_key'

export function signToken(payload: object) {
  return jwt.sign(payload, SECRET, { expiresIn: '1d' })
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}
