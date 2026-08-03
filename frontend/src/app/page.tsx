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
  X,
  Users,
} from "lucide-react";

interface TransactionSplit {
  id: string;
  transactionId: string;
  userId: string;
  percentage: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: string | number;
  balance: string | number | null;
  category: string | null;
  confidence: number;
  createdAt: string;
  splits?: TransactionSplit[];
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

  // Splits states
  const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [splitsData, setSplitsData] = useState<Record<string, number>>({});
  const [isSubmittingSplit, setIsSubmittingSplit] = useState(false);

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
      fetchMembers();
    }
  }, [sessionData]);

  // Fetch workspace members.
  const fetchMembers = async () => {
    if (!sessionData?.session?.token) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/transactions/members`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionData.session.token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (res.ok) {
        const payload = await res.json();
        setWorkspaceMembers(payload.data || []);
      }
    } catch (err) {
      console.error("Failed to load workspace members", err);
    }
  };

  // Open split modal helper.
  const handleOpenSplitModal = (txn: Transaction) => {
    setSelectedTxn(txn);
    const initialSplits: Record<string, number> = {};
    if (txn.splits && txn.splits.length > 0) {
      txn.splits.forEach((s) => {
        initialSplits[s.userId] = s.percentage;
      });
    } else if (sessionData?.user?.id) {
      initialSplits[sessionData.user.id] = 100;
    }
    setSplitsData(initialSplits);
    setIsSplitModalOpen(true);
  };

  // Split equally helper.
  const handleSplitEqually = () => {
    // Get checked users from split list
    const checkedUserIds = Object.keys(splitsData).filter(
      (id) => splitsData[id] > 0 || splitsData[id] === 0
    );
    if (checkedUserIds.length === 0) return;

    const share = parseFloat((100 / checkedUserIds.length).toFixed(2));
    const newSplits: Record<string, number> = {};
    checkedUserIds.forEach((id) => {
      newSplits[id] = share;
    });

    const totalAllocated = share * checkedUserIds.length;
    const diff = parseFloat((100 - totalAllocated).toFixed(2));
    if (diff !== 0 && checkedUserIds.length > 0) {
      newSplits[checkedUserIds[0]] = parseFloat(
        (newSplits[checkedUserIds[0]] + diff).toFixed(2)
      );
    }
    setSplitsData(newSplits);
  };

  // Submit splits helper.
  const handleSaveSplits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxn || !sessionData?.session?.token) return;

    const payloadSplits = Object.entries(splitsData)
      .map(([userId, percentage]) => ({ userId, percentage }))
      .filter((item) => item.percentage > 0);

    if (payloadSplits.length === 0) {
      showFeedback("error", "At least one member must be allocated a share.");
      return;
    }

    const sum = payloadSplits.reduce((acc, curr) => acc + curr.percentage, 0);
    if (Math.abs(sum - 100) > 0.001) {
      showFeedback("error", `Total split must equal exactly 100%. Current sum: ${sum}%`);
      return;
    }

    setIsSubmittingSplit(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/transactions/${selectedTxn.id}/split`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.token}`,
          },
          body: JSON.stringify({ splits: payloadSplits }),
        }
      );

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to save splits");
      }

      showFeedback("success", "Transaction splits updated successfully.");
      setIsSplitModalOpen(false);
      fetchTransactions(null);
    } catch (err: any) {
      console.error(err);
      showFeedback("error", err.message || "Failed to update splits.");
    } finally {
      setIsSubmittingSplit(false);
    }
  };

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
                      <th className="px-3 py-2.5 text-center font-semibold">
                        Splits
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
                            className="max-w-[160px] px-3 py-2.5 font-medium text-zinc-200"
                            title={txn.description}
                          >
                            <div className="truncate">{txn.description}</div>
                            {txn.splits && txn.splits.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1 text-[9px] text-zinc-500 font-normal">
                                {txn.splits.map((s) => {
                                  const isSelf = s.userId === sessionData?.user?.id;
                                  const displayName = isSelf ? "You" : (s.user?.name || s.user?.email.split("@")[0]);
                                  return (
                                    <span
                                      key={s.id}
                                      className="rounded bg-zinc-900 px-1 py-0.5 border border-zinc-800"
                                    >
                                      {displayName}: {s.percentage}%
                                    </span>
                                  );
                                })}
                              </div>
                            )}
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
                            {txn.splits && txn.splits.length > 0 && (
                              (() => {
                                const mySplit = txn.splits.find(
                                  (s) => s.userId === sessionData?.user?.id
                                );
                                if (mySplit) {
                                  const personalShare =
                                    (mySplit.percentage / 100) * amountVal;
                                  return (
                                    <div className="text-[10px] font-normal text-zinc-400 mt-0.5">
                                      Your share: {formatCurrency(personalShare)}
                                    </div>
                                  );
                                }
                                return null;
                              })()
                            )}
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
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            {txn.splits && txn.splits.length > 0 ? (
                              <button
                                onClick={() => handleOpenSplitModal(txn)}
                                className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition"
                              >
                                <Users className="h-2.5 w-2.5" />
                                {txn.splits.length} Shared
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenSplitModal(txn)}
                                className="inline-flex items-center gap-1 rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                              >
                                <Plus className="h-2.5 w-2.5" />
                                Split
                              </button>
                            )}
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

      {/* Transaction Split Modal */}
      {isSplitModalOpen && selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-opacity">
          <div className="glass-card w-full max-w-lg overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950 p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Split Transaction</h3>
              </div>
              <button
                onClick={() => setIsSplitModalOpen(false)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Txn Details Banner */}
            <div className="mb-5 rounded-lg bg-zinc-900/60 p-3.5 border border-zinc-800/50">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Transaction</h4>
                  <p className="text-sm font-bold text-white mt-0.5 truncate max-w-[220px]" title={selectedTxn.description}>
                    {selectedTxn.description}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{formatDate(selectedTxn.date)}</p>
                </div>
                <div className="text-right">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Amount</h4>
                  <p className={`text-sm font-bold mt-0.5 ${parseFloat(selectedTxn.amount.toString()) < 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {formatCurrency(selectedTxn.amount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Split Equal Button */}
            <div className="mb-5 flex justify-end">
              <button
                type="button"
                onClick={handleSplitEqually}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition"
              >
                <Users className="h-3.5 w-3.5" />
                Split Equally Between Checked Members
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSplits} className="space-y-4">
              <div className="max-h-[220px] overflow-y-auto space-y-3 pr-1">
                {workspaceMembers.map((member) => {
                  const isChecked = splitsData[member.id] !== undefined;
                  const currentPercentage = splitsData[member.id] || 0;
                  const totalTxnAmt = Math.abs(parseFloat(selectedTxn.amount.toString()));
                  const calculatedShare = (currentPercentage / 100) * totalTxnAmt;
                  const isDebit = parseFloat(selectedTxn.amount.toString()) < 0;

                  return (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between rounded-lg border p-3 transition ${
                        isChecked
                          ? "bg-zinc-900/40 border-zinc-800"
                          : "bg-zinc-950/20 border-zinc-905/60 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newSplits = { ...splitsData };
                            if (e.target.checked) {
                              newSplits[member.id] = 0; // Initialize at 0%
                            } else {
                              delete newSplits[member.id]; // Exclude
                            }
                            setSplitsData(newSplits);
                          }}
                          className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-950"
                        />
                        <div>
                          <p className="text-xs font-bold text-white">
                            {member.name || member.email.split("@")[0]}
                            {member.id === sessionData?.user?.id && (
                              <span className="ml-1 text-[10px] text-indigo-400 font-semibold">(You)</span>
                            )}
                          </p>
                          <p className="text-[10px] text-zinc-500">{member.email}</p>
                        </div>
                      </div>

                      {/* Split Percentage / Share calculator */}
                      <div className="flex items-center gap-3.5">
                        {isChecked ? (
                          <>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                value={currentPercentage}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setSplitsData({
                                    ...splitsData,
                                    [member.id]: val,
                                  });
                                }}
                                className="w-14 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-right text-xs text-white focus:border-indigo-500 focus:outline-none"
                              />
                              <span className="text-xs text-zinc-500">%</span>
                            </div>
                            <div className="text-right w-24">
                              <span className={`text-xs font-semibold ${isDebit ? "text-red-400" : "text-emerald-400"}`}>
                                {isDebit ? "- " : "+ "}
                                {calculatedShare.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-650">Excluded</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Real-time Validation / Total display */}
              {(() => {
                const totalSum = Object.values(splitsData).reduce((a, b) => a + b, 0);
                const isValid = Math.abs(totalSum - 100) < 0.001;

                return (
                  <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-zinc-500">Allocated Sum</p>
                      <p className={`text-sm font-bold mt-0.5 ${isValid ? "text-emerald-400" : "text-yellow-450"}`}>
                        {totalSum}% / 100%
                      </p>
                    </div>
                    {!isValid && (
                      <p className="text-[10px] text-yellow-500/80 max-w-[200px] text-right font-medium">
                        Percentages must sum to exactly 100%
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSplitModalOpen(false)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-xs font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingSplit ||
                    Math.abs(Object.values(splitsData).reduce((a, b) => a + b, 0) - 100) > 0.001
                  }
                  className="btn-primary hover-lift flex items-center justify-center rounded-lg px-4 py-2 text-xs"
                >
                  {isSubmittingSplit ? (
                    <>
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving Splits...
                    </>
                  ) : (
                    "Save Split Details"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
