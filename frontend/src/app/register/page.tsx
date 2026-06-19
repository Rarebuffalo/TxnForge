"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { ArrowRight, Lock, Mail, User, Shield, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Register user via Better Auth React client.
      const { data, error } = await authClient.signUp.email({
        email,
        password,
        name: name,
      });

      if (error) {
        setErrorMessage(
          error.message || "Failed to register. Please check credentials."
        );
      } else {
        // Registration success, redirect to dashboard.
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
          <h1 className="text-xl font-semibold text-zinc-200">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Set up your secure transaction workspace
          </p>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        {/* Registration form */}
        <form onSubmit={handleRegister} className="space-y-5">
          {/* Full Name field */}
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium text-zinc-400"
              htmlFor="register-name"
            >
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-600">
                <User className="h-4 w-4" />
              </span>
              <input
                id="register-name"
                type="text"
                required
                placeholder="Krishna Singh"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field rounded-lg py-2.5 pl-10 pr-4 text-sm"
              />
            </div>
          </div>

          {/* Email field */}
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium text-zinc-400"
              htmlFor="register-email"
            >
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-600">
                <Mail className="h-4 w-4" />
              </span>
              <input
                id="register-email"
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
              htmlFor="register-password"
            >
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-600">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="register-password"
                type="password"
                required
                minLength={8}
                placeholder="Minimum 8 characters"
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
                Create Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
