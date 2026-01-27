export type VaultAccount = {
  id: string
  name: string
  url: string
  email: string
  username?: string
  password: string
  hasWarning: boolean
  isFavorite: boolean
}

export type VaultItemFromAPI = {
  id: string
  name: string
  url: string
  username?: string
  email: string
  encryptedPassword: string
  iv: string
  hasWarning: boolean
  isFavorite: boolean
  createdAt?: string
  updatedAt?: string
}
