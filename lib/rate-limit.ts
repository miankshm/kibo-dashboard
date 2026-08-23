import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const RATE_LIMIT_WINDOW = '15 m'
const LOGIN_REQUEST_LIMIT = 30

const hasRedisConfiguration = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
)

const loginRateLimiter = hasRedisConfiguration
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(LOGIN_REQUEST_LIMIT, RATE_LIMIT_WINDOW),
      prefix: 'kibo:rate-limit',
    })
  : null

let hasLoggedMissingConfiguration = false
let hasLoggedRedisError = false

export type RateLimitResult = {
  success: boolean
  retryAfterSeconds: number | null
}

export async function checkLoginRateLimit(ipAddress: string): Promise<RateLimitResult> {
  if (!loginRateLimiter) {
    if (!hasLoggedMissingConfiguration) {
      console.warn('Login rate limiting is disabled: Upstash Redis environment variables are missing.')
      hasLoggedMissingConfiguration = true
    }

    return { success: true, retryAfterSeconds: null }
  }

  try {
    const result = await loginRateLimiter.limit(`login:ip:${ipAddress}`)

    return {
      success: result.success,
      retryAfterSeconds: result.success
        ? null
        : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    }
  } catch (error) {
    if (!hasLoggedRedisError) {
      console.error('Login rate limiting failed; allowing the request to continue:', error)
      hasLoggedRedisError = true
    }

    return { success: true, retryAfterSeconds: null }
  }
}
