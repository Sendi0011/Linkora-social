"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  TransactionBuilder,
  BASE_FEE,
  Contract,
  Address,
  nativeToScVal,
  scValToNative,
  rpc as StellarRpc,
  Transaction,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

const MAX_CONTENT_LENGTH = 280;
const WARNING_THRESHOLD = 260;

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";
const CONTRACT_ID =
  process.env.NEXT_PUBLIC_CONTRACT_ID ?? "CDD6V66I7G2K2TCHWGLD4QIPZ4E47W4T3HLY3W7YJ4NGRRYUDRF6QYLR";

type SubmitStatus = "idle" | "awaiting_signature" | "submitting" | "success" | "error";

interface PostComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicKey: string | null;
}

interface PublishState {
  status: SubmitStatus;
  errorMsg: string;
  postId: string | null;
}

export function PostComposeModal({ isOpen, onClose, publicKey }: PostComposeModalProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState("");
  const [publishState, setPublishState] = useState<PublishState>({
    status: "idle",
    errorMsg: "",
    postId: null,
  });

  const charCount = content.length;
  const isNearLimit = charCount >= WARNING_THRESHOLD && charCount <= MAX_CONTENT_LENGTH;
  const isOverLimit = charCount > MAX_CONTENT_LENGTH;
  const isEmpty = content.trim().length === 0;
  const isDisabled = isEmpty || isOverLimit || publishState.status !== "idle";

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && publishState.status === "idle") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, publishState.status]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent.length <= MAX_CONTENT_LENGTH) {
      setContent(newContent);
    }
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isDisabled || !publicKey) return;

      setPublishState({ status: "awaiting_signature", errorMsg: "", postId: null });

      try {
        const server = new StellarRpc.Server(RPC_URL);
        const account = await server.getAccount(publicKey);

        const contract = new Contract(CONTRACT_ID);
        const op = contract.call(
          "create_post",
          Address.fromString(publicKey).toScVal(),
          nativeToScVal(content, { type: "string" })
        );

        const tx = new TransactionBuilder(account, {
          fee: BASE_FEE,
          networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(op)
          .setTimeout(30)
          .build();

        const simulated = await server.simulateTransaction(tx);
        if (StellarRpc.Api.isSimulationError(simulated)) {
          throw new Error(`Simulation failed: ${simulated.error}`);
        }

        const finalTx = StellarRpc.assembleTransaction(tx, simulated).build();
        const xdrString = finalTx.toXDR();

        const signedXdr = await signTransaction(xdrString, {
          networkPassphrase: NETWORK_PASSPHRASE,
        });

        setPublishState((prev) => ({ ...prev, status: "submitting" }));

        const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
        let sendResponse = await server.sendTransaction(signedTx);

        if (sendResponse.status === "ERROR") {
          throw new Error("Stellar Transaction failed to submit");
        }

        let status: string = sendResponse.status;
        let txResponse = null;
        const startTime = Date.now();

        while (status === "PENDING" && Date.now() - startTime < 30000) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          txResponse = await server.getTransaction(sendResponse.hash);
          status = txResponse.status as string;
        }

        if (status !== "SUCCESS" || !txResponse) {
          throw new Error("Transaction execution timed out or failed");
        }

        const val = (txResponse as any).returnValue;
        const newPostId = val
          ? scValToNative(val).toString()
          : Math.floor(Math.random() * 100000).toString();

        setPublishState({
          status: "success",
          errorMsg: "",
          postId: newPostId,
        });

        setTimeout(() => {
          onClose();
          router.push(`/posts/${newPostId}`);
        }, 1500);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to publish post";
        setPublishState({
          status: "error",
          errorMsg: message,
          postId: null,
        });
      }
    },
    [content, isDisabled, publicKey, onClose, router]
  );

  const handleTryAgain = () => {
    setPublishState({ status: "idle", errorMsg: "", postId: null });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--muted)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            disabled={
              publishState.status === "awaiting_signature" || publishState.status === "submitting"
            }
            className="text-[var(--text-muted)] hover:text-white transition-colors text-lg"
          >
            ✕
          </button>
          <h2 className="text-lg font-bold text-white">Compose Post</h2>
          <div className="w-6" />
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Author info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
              {publicKey ? publicKey.slice(0, 2).toUpperCase() : "??"}
            </div>
            <span className="text-sm font-semibold text-[var(--text-muted)]">
              {publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : "Not Connected"}
            </span>
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              placeholder="What's happening on-chain?"
              maxLength={MAX_CONTENT_LENGTH}
              disabled={publishState.status !== "idle" && publishState.status !== "error"}
              className="w-full min-h-[120px] bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
            />
            {/* Character counter */}
            <div className="absolute bottom-3 right-4 flex items-center gap-2">
              <span
                className={`text-xs font-mono ${isOverLimit ? "text-red-500" : isNearLimit ? "text-yellow-500" : "text-[var(--text-muted)]"}`}
              >
                {charCount} / {MAX_CONTENT_LENGTH}
              </span>
            </div>
          </div>

          {/* Live Preview */}
          {content && (
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-2">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Preview
              </span>
              <p className="text-white text-sm break-words whitespace-pre-wrap">{content}</p>
            </div>
          )}

          {/* Status Messages */}
          {publishState.status === "awaiting_signature" && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-xl p-3 text-sm flex items-center gap-2">
              <span className="animate-pulse">⏳</span>
              <span>Waiting for Freighter wallet signing...</span>
            </div>
          )}

          {publishState.status === "submitting" && (
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-xl p-3 text-sm flex items-center gap-2">
              <span className="animate-spin">🔄</span>
              <span>Submitting transaction to Stellar blockchain...</span>
            </div>
          )}

          {publishState.status === "success" && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl p-3 text-sm flex items-center gap-2">
              <span>✅</span>
              <span>Post published successfully! Redirecting...</span>
            </div>
          )}

          {publishState.status === "error" && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3 text-sm flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span className="break-all">{publishState.errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={handleTryAgain}
                className="self-end px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Submit Button */}
          {publishState.status !== "success" && (
            <button
              type="submit"
              disabled={isDisabled}
              className={`w-full py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                isDisabled
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white"
              }`}
            >
              Publish Post
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
