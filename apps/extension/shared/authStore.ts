import { User } from "firebase/auth"

let currentUser: User | null = null

export function setUser(user: User | null) {
  currentUser = user
}

export function getUser() {
  return currentUser
}
