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
  storageBucket: "qrealm-16732.firebasestorage.app",
  messagingSenderId: "646176703330",
  appId: "1:646176703330:web:36bb5689dd111e56a6a23b"
}

function getFirebaseApp() {
  if (typeof window === "undefined") {
    return null
  }
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig)
  }
  return getApp()
}

const app = getFirebaseApp()
const auth = app ? getAuth(app) : null

export { auth }

export async function signIn(email: string, password: string) {
  if (!auth) throw new Error("Firebase not initialized")
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function signUp(email: string, password: string) {
  if (!auth) throw new Error("Firebase not initialized")
  const result = await createUserWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function signOut() {
  if (!auth) return
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
  if (!auth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}

export function getCurrentUser(): FirebaseUser | null {
  return auth?.currentUser ?? null
}

export type { FirebaseUser }
