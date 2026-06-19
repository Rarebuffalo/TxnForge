"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { LogOut, Plus, Send, RefreshCw, Layers, LayoutGrid, Calendar, Wallet, FileText, CheckCircle2, AlertTriangle, User as UserIcon } from "lucide-react";

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
  const { data: sessionData, isPending: sessionPending } = authClient.useSession();
  
  // State variables.
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rawText, setRawText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isLoadingTxns, setIsLoadingTxns] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [activeOrg, setActiveOrg] = useState<{ id: string; name: string } | null>(null);

  // Assert user is logged in. Redirect to login if session resolves null.
  useEffect(() => {
    if (!sessionPending && !sessionData) {
      router.push("/login");
    }
  }, [sessionData, sessionPending, router]);

  // Load user's organization context.
  useEffect(() => {
    if (sessionData?.user) {
      // Fetch active organization from Better Auth Client if any is selected.
      // Default fallback to user name's workspace.
      const orgName = sessionData.user.name 
        ? `${sessionData.user.name}'s Workspace` 
        : `${sessionData.user.email.split("@")[0]}'s Workspace`;
      
      setActiveOrg({
        id: "default-org", // Handled dynamically in backend middleware if not specified
        name: orgName,
      });
      
      fetchTransactions(null);
    }
  }, [sessionData]);

  // Fetch transactions from the Hono API backend using cursor-based offset.
  const fetchTransactions = async (cursorId: string | null = null, append = false) => {
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
          "Authorization": `Bearer ${sessionData.session.token}`,
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

  // Triggers bank statement parsing and inserts into active workspace.
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
            "Authorization": `Bearer ${sessionData.session.token}`,
          },
          body: JSON.stringify({ text: rawText }),
        }
      );

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error || "Failed to extract transaction");
      }

      showFeedback("success", "Transaction parsed and saved to database successfully.");
      setRawText("");
      
      // Refresh the table history.
      fetchTransactions(null);
    } catch (err: any) {
      console.error(err);
      showFeedback("error", err.message || "Failed to parse text. Check format details.");
    } finally {
      setIsExtracting(false);
    }
  };

  // Sign out user via Better Auth.
  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "₹0.00";
    
    const formatted = Math.abs(num).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return num < 0 ? `- ₹${formatted}` : `+ ₹${formatted}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Render loader spinner if session is checking.
  if (sessionPending || !sessionData) {
    return (
      <div className="flex h-screen flex-1 flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-zinc-400 font-medium">Authorizing secure session...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-6 lg:p-8">
      {/* Top dashboard header bar */}
      <header className="glass-panel mb-8 flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Vessify Transaction Extractor</h1>
            <p className="text-xs text-zinc-500 font-medium">Multi-Tenant Isolation Layer</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-zinc-950/50 py-1.5 px-3 border border-zinc-800 text-xs">
            <LayoutGrid className="h-4 w-4 text-zinc-500" />
            <span className="text-zinc-400 font-semibold">Active Org:</span>
            <span className="text-white font-medium">{activeOrg?.name}</span>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-zinc-950/50 py-1.5 px-3 border border-zinc-800 text-xs">
            <UserIcon className="h-4 w-4 text-zinc-500" />
            <span className="text-zinc-400 font-semibold">User:</span>
            <span className="text-white font-medium">{sessionData.user.email}</span>
          </div>

          <button
            onClick={handleLogout}
            className="hover-lift flex items-center justify-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 py-1.5 px-3 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </header>

      {/* Main dashboard body */}
      <div className="grid flex-1 gap-8 lg:grid-cols-12 items-start">
        
        {/* Left Side: Statement Extractor Form */}
        <section className="glass-panel lg:col-span-5 rounded-xl p-6 shadow-xl border border-zinc-800/80">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Paste Raw Statement
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Supports Starbucks lines, Uber Ride details, or messy banking strings.
            </p>
          </div>

          {feedback && (
            <div
              className={`mb-6 flex items-start gap-2.5 rounded-lg border p-3.5 text-xs transition duration-300 ${
                feedback.type === "success"
                  ? "border-green-500/20 bg-green-500/10 text-green-400"
                  : "border-red-500/20 bg-red-500/10 text-red-400"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleExtract} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="statement" className="sr-only">Raw Statement Text</label>
              <textarea
                id="statement"
                rows={7}
                required
                placeholder="Paste transaction text here...&#10;Example:&#10;Uber Ride * Airport Drop&#10;12/11/2025 → ₹1,250.00 debited&#10;Available Balance → ₹17,170.50"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-white placeholder-zinc-700 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary resize-y"
              />
            </div>

            <button
              type="submit"
              disabled={isExtracting || !rawText.trim()}
              className="hover-lift flex w-full items-center justify-center rounded-lg bg-primary py-2.5 px-4 text-sm font-semibold text-white shadow-lg outline-none transition hover:bg-primary/95 focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Parsing & Saving...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Parse & Save Transaction
                </>
              )}
            </button>
          </form>

          {/* Form helper note card */}
          <div className="mt-8 rounded-lg bg-zinc-950/40 p-4 border border-zinc-800/60">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Supported Samples</h3>
            <ul className="space-y-2 text-xs text-zinc-500 font-medium">
              <li>• Starbucks (Multiline format with label matching)</li>
              <li>• Uber (Multi-line arrow indicators matching debited/credited)</li>
              <li>• Messy Single-lines (Dates, symbols, balances, categories inline)</li>
            </ul>
          </div>
        </section>

        {/* Right Side: Paginated Transactions List Table */}
        <section className="glass-panel lg:col-span-7 rounded-xl p-6 shadow-xl border border-zinc-800/80">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" /> Ledger History
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Scoped to active organization workspace</p>
            </div>
            <button
              onClick={() => fetchTransactions(null)}
              className="rounded-lg p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
              title="Refresh ledger"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {isLoadingTxns ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-zinc-900" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-zinc-800 rounded-lg bg-zinc-950/20">
              <Wallet className="h-12 w-12 text-zinc-700 mb-3" />
              <h3 className="text-sm font-semibold text-zinc-400">No transactions recorded</h3>
              <p className="text-xs text-zinc-600 mt-1">Paste statement text on the left to extract details.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-lg border border-zinc-800/60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-950/80 text-zinc-400 font-semibold border-b border-zinc-800">
                      <th className="p-3">Date</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-right">Balance</th>
                      <th className="p-3 text-center">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn) => {
                      const amountVal = typeof txn.amount === "string" ? parseFloat(txn.amount) : txn.amount;
                      return (
                        <tr
                          key={txn.id}
                          className="border-b border-zinc-900 hover:bg-zinc-950/40 transition"
                        >
                          <td className="p-3 whitespace-nowrap text-zinc-400 font-medium flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-zinc-600" />
                            {formatDate(txn.date)}
                          </td>
                          <td className="p-3 max-w-[150px] truncate text-white font-semibold" title={txn.description}>
                            {txn.description}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                              {txn.category || "General"}
                            </span>
                          </td>
                          <td
                            className={`p-3 text-right whitespace-nowrap font-bold ${
                              amountVal < 0 ? "text-red-400" : "text-green-400"
                            }`}
                          >
                            {formatCurrency(txn.amount)}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap text-zinc-400 font-semibold">
                            {txn.balance !== null ? formatCurrency(txn.balance) : "--"}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold ${
                                txn.confidence >= 0.8
                                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                  : txn.confidence >= 0.5
                                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                  : "bg-red-500/10 text-red-400 border border-red-500/20"
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

              {/* Cursor pagination Load More trigger */}
              {nextCursor && (
                <button
                  onClick={() => fetchTransactions(nextCursor, true)}
                  className="hover-lift flex w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/40 py-2.5 text-xs font-semibold text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                >
                  <Plus className="mr-2 h-4 w-4" /> Load More Transactions
                </button>
              )}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
