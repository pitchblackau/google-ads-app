"use client";

import { useRouter, usePathname } from "next/navigation";
import { Account } from "@/lib/types";
import { clsx } from "clsx";

interface SidebarProps {
  accounts: Account[];
  /** Manual active overrides — key = accountId, value = effective active state */
  activeOverrides?: Record<string, boolean>;
  /** Called when user wants to toggle an account's active state */
  onToggleActive?: (id: string, currentEffective: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  accounts,
  activeOverrides = {},
  onToggleActive,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentId = pathname.startsWith("/account/") ? pathname.split("/")[2] : null;

  /** Effective active: manual override wins; falls back to account.isActive */
  function effectivelyActive(a: Account) {
    return a.id in activeOverrides ? activeOverrides[a.id] : a.isActive;
  }

  const active   = accounts.filter(effectivelyActive);
  const inactive = accounts.filter((a) => !effectivelyActive(a));

  function handleClick(account: Account) {
    router.push(`/account/${account.id}`);
    onClose?.();
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={clsx(
          "fixed inset-0 z-30 bg-black/60 transition-opacity md:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-40 flex flex-col overflow-y-auto border-r border-[#1e1e2e] bg-[#0b0b14]",
        "w-64 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "md:relative md:sticky md:top-0 md:h-screen md:w-52 md:translate-x-0 md:z-auto"
      )}>
        {/* Logo / Home */}
        <div
          className="px-4 pt-5 pb-3 border-b border-[#1e1e2e] cursor-pointer hover:bg-[#ffffff05] shrink-0"
          onClick={() => { router.push("/"); onClose?.(); }}
        >
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-[#00fff9] flex items-center justify-center shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" fill="#08080f"/>
              </svg>
            </div>
            <p className="text-[11px] font-bold text-white">Ads Dashboard</p>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
          {active.length > 0 && (
            <>
              <p className="px-2 pt-1 pb-1.5 text-[9px] font-semibold uppercase tracking-widest text-[#3a3a50]">
                Active · {active.length}
              </p>
              {active.map((a) => (
                <AccountButton
                  key={a.id}
                  account={a}
                  selected={currentId === a.id}
                  isActive={true}
                  onClick={() => handleClick(a)}
                />
              ))}
            </>
          )}

          {inactive.length > 0 && (
            <>
              <p className="px-2 pt-3 pb-1.5 text-[9px] font-semibold uppercase tracking-widest text-[#3a3a50]">
                Inactive · {inactive.length}
              </p>
              {inactive.map((a) => (
                <AccountButton
                  key={a.id}
                  account={a}
                  selected={currentId === a.id}
                  isActive={false}
                  onClick={() => handleClick(a)}
                  onActivate={
                    onToggleActive
                      ? () => onToggleActive(a.id, false)
                      : undefined
                  }
                />
              ))}
            </>
          )}
        </nav>
      </aside>
    </>
  );
}

function AccountButton({
  account,
  selected,
  isActive,
  onClick,
  onActivate,
}: {
  account: Account;
  selected: boolean;
  isActive: boolean;
  onClick: () => void;
  onActivate?: () => void;
}) {
  return (
    <div className="flex items-center gap-1 group/row">
      <button
        onClick={onClick}
        className={clsx(
          "flex-1 flex items-center gap-2 rounded-md px-2 py-2.5 text-left transition-colors min-w-0",
          selected
            ? isActive
              ? "bg-[#00fff910] text-[#00fff9]"
              : "bg-[#ffffff08] text-[#6b6b7e]"
            : isActive
              ? "text-[#8b8b9a] hover:bg-[#ffffff08] hover:text-white"
              : "text-[#4e4e63] hover:bg-[#ffffff05] hover:text-[#6b6b7e]"
        )}
      >
        <span className={clsx(
          "mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full",
          isActive ? "bg-[#00fff9]" : "bg-[#3a3a50]"
        )} />
        <span className="truncate text-[12px] leading-tight">{account.name}</span>
      </button>

      {/* Activate button — only on inactive accounts, always visible */}
      {!isActive && onActivate && (
        <button
          onClick={(e) => { e.stopPropagation(); onActivate(); }}
          title="Restore to dashboard"
          className="shrink-0 rounded-md p-1.5 transition-all text-[#3a3a50] hover:text-[#00fff9] hover:bg-[#00fff910]"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
