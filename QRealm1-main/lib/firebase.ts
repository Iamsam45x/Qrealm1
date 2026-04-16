import { initializeApp, getApps, getApp } from "firebase/app"
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  IdTokenResult,
} from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyDHUpMNtgVn62fbg_4De8eGeDVTp22T7gQ",
  authDomain: "qrealm-16732.firebaseapp.com",
  projectId: "qrealm-16732",
  storageBucket: "qrealm-16732.appspot.com",
  messagingSenderId: "<YOUR_MESSAGING_SENDER_ID>",
  appId: "<YOUR_APP_ID>",
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
const auth = getAuth(app)

export { auth }

export async function signIn(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function signUp(email: string, password: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function signOut() {
  await firebaseSignOut(auth)
}

export async function getIdToken(user: FirebaseUser): Promise<string | null> {
  return user.getIdToken()
}

export async function getIdTokenResult(
  user: FirebaseUser
): Promise<IdTokenResult | null> {
  try {
    return await user.getIdTokenResult()
  } catch {
    return null
  }
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback)
}

export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser
}

export type { FirebaseUser }
