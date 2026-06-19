"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { ArrowRight, Lock, Mail, User, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Call Better Auth to register the user.
      const { data, error } = await authClient.signUp.email({
        email,
        password,
        name: name,
        // Since Hono backend exposes signup, this maps to POST /api/auth/signup.
        // We can also let it sign up and automatically sign in.
      });

      if (error) {
        setErrorMessage(error.message || "Failed to register. Please check credentials.");
      } else {
        // Registration success. Redirect to dashboard.
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      {/* Sleek top glowing element */}
      <div className="absolute top-0 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-[100px]" />

      <div className="glass-panel w-full max-w-md rounded-2xl p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Create an <span className="premium-gradient-text">Account</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Start isolation testing on transaction parsing
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300" htmlFor="name">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                <User className="h-5 w-5" />
              </span>
              <input
                id="name"
                type="text"
                required
                placeholder="Krishna Singh"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                <Mail className="h-5 w-5" />
              </span>
              <input
                id="email"
                type="email"
                required
                placeholder="krishna@vessify.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                <Lock className="h-5 w-5" />
              </span>
              <input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="hover-lift flex w-full items-center justify-center rounded-lg bg-primary py-2.5 px-4 text-sm font-semibold text-white shadow-lg outline-none transition hover:bg-primary/95 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <>
                Register Workspace <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
