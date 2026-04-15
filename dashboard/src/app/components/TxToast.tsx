import type { ReactNode } from "react";

type TxToastProps = {
  status: "idle" | "pending" | "confirmed" | "failed";
  message?: string;
  explorerUrl?: string;
  children?: ReactNode;
};

export function TxToast({ status, message, explorerUrl, children }: TxToastProps) {
  if (status === "idle" && !message) {
    return null;
  }

  return (
    <div className={`app-toast app-toast-${status}`}>
      <strong>{status.toUpperCase()}</strong>
      {message ? <span>{message}</span> : null}
      {children}
      {explorerUrl ? (
        <a href={explorerUrl} target="_blank" rel="noreferrer">
          View transaction
        </a>
      ) : null}
    </div>
  );
}
