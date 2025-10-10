"use client";
import { useState } from "react";
import { getFirebaseAuth, googleProvider } from "@/lib/firebase/client";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function signInGoogle() {
    try {
      const auth = getFirebaseAuth();
      const res = await signInWithPopup(auth, googleProvider);
      const token = await res.user.getIdToken();
      setMessage(`Signed in as ${res.user.email}`);
      localStorage.setItem("idToken", token);
      router.replace("/");
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  async function signInEmail() {
    try {
      const auth = getFirebaseAuth();
      const res = await signInWithEmailAndPassword(auth, email, password);
      const token = await res.user.getIdToken();
      setMessage(`Signed in as ${res.user.email}`);
      localStorage.setItem("idToken", token);
      router.replace("/");
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4 space-y-4">
      <h1 className="text-2xl font-semibold">Login</h1>
      <button className="px-4 py-2 bg-black text-white rounded" onClick={signInGoogle}>Continue with Google</button>
      <div className="border rounded p-3 space-y-2">
        <input className="border px-3 py-2 w-full" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="border px-3 py-2 w-full" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="px-3 py-2 border rounded w-full" onClick={signInEmail}>Sign in</button>
      </div>
      {message && <div className="text-sm text-gray-600">{message}</div>}
    </div>
  );
}


