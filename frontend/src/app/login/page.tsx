"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { ArrowRight, Lock, Mail, Shield, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Authenticate via Better Auth React client.
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message || "Invalid email or password.");
      } else {
        // Redirect to the protected dashboard.
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
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      {/* Top glow effect */}
      <div className="pointer-events-none absolute top-0 left-1/2 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px]" />

      {/* Glass card container */}
      <div className="glass-card w-full max-w-md rounded-2xl p-8 shadow-2xl">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Shield className="h-6 w-6 text-indigo-400" />
            <span className="text-2xl font-bold text-white">TxnForge</span>
          </div>
          <h1 className="text-xl font-semibold text-zinc-200">Welcome back</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Sign in to your workspace
          </p>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email field */}
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium text-zinc-400"
              htmlFor="login-email"
            >
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-600">
                <Mail className="h-4 w-4" />
              </span>
              <input
                id="login-email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field rounded-lg py-2.5 pl-10 pr-4 text-sm"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium text-zinc-400"
              htmlFor="login-password"
            >
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-600">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="login-password"
                type="password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field rounded-lg py-2.5 pl-10 pr-4 text-sm"
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary hover-lift flex w-full items-center justify-center rounded-lg py-2.5 text-sm"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-zinc-500">
          New here?{" "}
          <Link
            href="/register"
            className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
