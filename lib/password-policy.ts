export type PasswordPolicyError =
  | 'tooShort'
  | 'missingUppercase'
  | 'missingLowercase'
  | 'missingNumber'
  | 'missingSpecial'

export function getPasswordPolicyError(password: string): PasswordPolicyError | null {
  if (password.length < 12) {
    return 'tooShort'
  }

  if (!/[A-Z]/.test(password)) {
    return 'missingUppercase'
  }

  if (!/[a-z]/.test(password)) {
    return 'missingLowercase'
  }

  if (!/[0-9]/.test(password)) {
    return 'missingNumber'
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return 'missingSpecial'
  }

  return null
}
