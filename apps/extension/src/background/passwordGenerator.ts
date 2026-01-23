export function generateSecurePassword(length = 16): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyz" +
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
    "0123456789" +
    "!@#$%^&*()_+-=[]{}|;:,.<>?"

  const randomValues = new Uint32Array(length)
  crypto.getRandomValues(randomValues)

  let password = ""
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length]
  }

  return password
}
