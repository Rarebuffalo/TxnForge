"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  LogOut,
  Plus,
  Send,
  RefreshCw,
  Shield,
  Calendar,
  Wallet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  User as UserIcon,
  Loader2,
} from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: string | number;
  balance: string | number | null;
  category: string | null;
  confidence: number;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();

  // Auth state from Better Auth.
  const { data: sessionData, isPending: sessionPending } =
    authClient.useSession();

  // State variables.
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rawText, setRawText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isLoadingTxns, setIsLoadingTxns] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [activeOrg, setActiveOrg] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Redirect to login if session resolves null.
  useEffect(() => {
    if (!sessionPending && !sessionData) {
      router.push("/login");
    }
  }, [sessionData, sessionPending, router]);

  // Load organization context once session is available.
  useEffect(() => {
    if (sessionData?.user) {
      const orgName = sessionData.user.name
        ? `${sessionData.user.name}'s Workspace`
        : `${sessionData.user.email.split("@")[0]}'s Workspace`;

      setActiveOrg({
        id: "default-org",
        name: orgName,
      });

      fetchTransactions(null);
    }
  }, [sessionData]);

  // Fetch transactions from the Hono API using cursor-based pagination.
  const fetchTransactions = async (
    cursorId: string | null = null,
    append = false
  ) => {
    if (!sessionData?.session?.token) return;

    try {
      if (!append) setIsLoadingTxns(true);

      let url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/transactions?limit=10`;
      if (cursorId) {
        url += `&cursor=${cursorId}`;
      }

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessionData.session.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load transactions");
      }

      const payload = await res.json();

      if (append) {
        setTransactions((prev) => [...prev, ...payload.data]);
      } else {
        setTransactions(payload.data);
      }
      setNextCursor(payload.nextCursor);
    } catch (err: any) {
      console.error(err);
      showFeedback("error", "Error loading transaction records");
    } finally {
      setIsLoadingTxns(false);
    }
  };

  // Parse raw statement text and save to database.
  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim() || !sessionData?.session?.token) return;

    setIsExtracting(true);
    setFeedback(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/transactions/extract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.token}`,
          },
          body: JSON.stringify({ text: rawText }),
        }
      );

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error || "Failed to extract transaction");
      }

      showFeedback("success", "Transaction parsed and saved successfully.");
      setRawText("");
      fetchTransactions(null);
    } catch (err: any) {
      console.error(err);
      showFeedback("error", err.message || "Failed to parse text.");
    } finally {
      setIsExtracting(false);
    }
  };

  // Sign out via Better Auth.
  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "0.00";
    const formatted = Math.abs(num).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return num < 0 ? `- ${formatted}` : `+ ${formatted}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Loading state while session is being resolved.
  if (sessionPending || !sessionData) {
    return (
      <div className="flex h-screen flex-1 flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        <p className="mt-4 text-sm text-zinc-500">
          Authorizing secure session...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-4 lg:p-6">
      {/* Top Navbar */}
      <header className="glass-card mb-6 flex flex-col gap-4 rounded-xl px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-indigo-400" />
          <span className="text-lg font-bold text-white">TxnForge</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Workspace pill */}
          <div className="flex items-center gap-1.5 rounded-md bg-zinc-900/70 px-3 py-1.5 text-xs border border-zinc-800">
            <Wallet className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-zinc-400">{activeOrg?.name}</span>
          </div>

          {/* User pill */}
          <div className="flex items-center gap-1.5 rounded-md bg-zinc-900/70 px-3 py-1.5 text-xs border border-zinc-800">
            <UserIcon className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-zinc-400">{sessionData.user.email}</span>
          </div>

          {/* Sign out button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md bg-zinc-900/70 px-3 py-1.5 text-xs font-medium text-zinc-400 border border-zinc-800 transition hover:bg-zinc-800 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main two-column layout */}
      <div className="grid flex-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Statement Extractor */}
        <section className="glass-card lg:col-span-5 rounded-xl p-5 border border-zinc-800/50">
          <div className="mb-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <FileText className="h-4 w-4 text-indigo-400" />
              Paste Raw Statement
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Supports Starbucks, Uber, Amazon and other bank statement formats.
            </p>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`mb-5 flex items-start gap-2 rounded-lg border px-3.5 py-3 text-xs ${
                feedback.type === "success"
                  ? "border-green-500/20 bg-green-500/10 text-green-400"
                  : "border-red-500/20 bg-red-500/10 text-red-400"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleExtract} className="space-y-4">
            <textarea
              id="statement-input"
              rows={7}
              required
              placeholder={`Paste transaction text here...\nExample:\nUber Ride * Airport Drop\n12/11/2025 - 1,250.00 debited\nAvailable Balance - 17,170.50`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="input-field rounded-lg p-4 text-sm resize-y"
            />

            <button
              type="submit"
              disabled={isExtracting || !rawText.trim()}
              className="btn-primary hover-lift flex w-full items-center justify-center rounded-lg py-2.5 text-sm"
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Parse and Save
                </>
              )}
            </button>
          </form>

          {/* Supported formats helper */}
          <div className="mt-6 rounded-lg bg-zinc-900/50 p-4 border border-zinc-800/50">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Supported Formats
            </h3>
            <ul className="space-y-1.5 text-xs text-zinc-500">
              <li>Starbucks (multiline label matching)</li>
              <li>Uber (arrow indicators, debited/credited)</li>
              <li>Single-line messy strings (dates, amounts inline)</li>
            </ul>
          </div>
        </section>

        {/* Right Column: Transaction History */}
        <section className="glass-card lg:col-span-7 rounded-xl p-5 border border-zinc-800/50">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-white">
                <Wallet className="h-4 w-4 text-indigo-400" />
                Transaction History
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Scoped to active workspace
              </p>
            </div>
            <button
              onClick={() => fetchTransactions(null)}
              className="rounded-md p-1.5 text-zinc-500 border border-zinc-800 bg-zinc-900/50 transition hover:text-white hover:bg-zinc-800"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Loading skeleton */}
          {isLoadingTxns ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-14 w-full animate-pulse rounded-lg bg-zinc-900/60"
                />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-950/30 py-14 text-center">
              <Wallet className="mb-3 h-10 w-10 text-zinc-700" />
              <h3 className="text-sm font-semibold text-zinc-400">
                No transactions recorded
              </h3>
              <p className="mt-1 text-xs text-zinc-600">
                Paste statement text on the left to extract details.
              </p>
            </div>
          ) : (
            /* Transaction table */
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-lg border border-zinc-800/50">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400">
                      <th className="px-3 py-2.5 font-semibold">Date</th>
                      <th className="px-3 py-2.5 font-semibold">
                        Description
                      </th>
                      <th className="px-3 py-2.5 font-semibold">Category</th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        Amount
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        Balance
                      </th>
                      <th className="px-3 py-2.5 text-center font-semibold">
                        Confidence
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn) => {
                      const amountVal =
                        typeof txn.amount === "string"
                          ? parseFloat(txn.amount)
                          : txn.amount;
                      return (
                        <tr
                          key={txn.id}
                          className="border-b border-zinc-900/80 transition hover:bg-zinc-900/30"
                        >
                          <td className="whitespace-nowrap px-3 py-2.5 text-zinc-400">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 text-zinc-600" />
                              {formatDate(txn.date)}
                            </span>
                          </td>
                          <td
                            className="max-w-[140px] truncate px-3 py-2.5 font-medium text-zinc-200"
                            title={txn.description}
                          >
                            {txn.description}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <span className="inline-block rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                              {txn.category || "General"}
                            </span>
                          </td>
                          <td
                            className={`whitespace-nowrap px-3 py-2.5 text-right font-semibold ${
                              amountVal < 0 ? "text-red-400" : "text-emerald-400"
                            }`}
                          >
                            {formatCurrency(txn.amount)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right text-zinc-400">
                            {txn.balance !== null
                              ? formatCurrency(txn.balance)
                              : "--"}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                txn.confidence >= 0.8
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : txn.confidence >= 0.5
                                    ? "bg-yellow-500/10 text-yellow-400"
                                    : "bg-red-500/10 text-red-400"
                              }`}
                            >
                              {Math.round(txn.confidence * 100)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Load More button */}
              {nextCursor && (
                <button
                  onClick={() => fetchTransactions(nextCursor, true)}
                  className="hover-lift flex w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/40 py-2.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Load More
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
