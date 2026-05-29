"use client";

import { Account } from "@/lib/types";
import { clsx } from "clsx";

interface SidebarProps {
  accounts: Account[];
  selectedId: string | null;
  onSelect: (account: Account) => void;
}

export default function Sidebar({ accounts, selectedId, onSelect }: SidebarProps) {
  const active = accounts.filter((a) => a.isActive);
  const inactive = accounts.filter((a) => !a.isActive);

  function scrollTo(id: string) {
    document.getElementById(`account-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <aside className="w-52 shrink-0 border-r border-[#1e1e2e] bg-[#0b0b14] flex flex-col sticky top-0 h-screen overflow-y-auto">
      <div className="px-4 pt-5 pb-3 border-b border-[#1e1e2e]">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#4e4e63]">Accounts</p>
      </div>

      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {active.length > 0 && (
          <>
            <p className="px-2 pt-1 pb-1.5 text-[9px] font-semibold uppercase tracking-widest text-[#3a3a50]">
              Active · {active.length}
            </p>
            {active.map((a) => (
              <AccountButton
                key={a.id}
                account={a}
                selected={selectedId === a.id}
                onScroll={scrollTo}
                onDetail={onSelect}
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
                selected={selectedId === a.id}
                onScroll={scrollTo}
                onDetail={onSelect}
              />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}

function AccountButton({
  account,
  selected,
  onScroll,
  onDetail,
}: {
  account: Account;
  selected: boolean;
  onScroll: (id: string) => void;
  onDetail: (a: Account) => void;
}) {
  return (
    <button
      onClick={() => onScroll(account.id)}
      className={clsx(
        "w-full flex items-center gap-2 rounded-md px-2 py-2 text-left transition-colors group",
        selected
          ? "bg-[#00fff910] text-[#00fff9]"
          : "text-[#8b8b9a] hover:bg-[#ffffff08] hover:text-white"
      )}
    >
      <span
        className={clsx(
          "mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full",
          account.isActive ? "bg-[#00fff9]" : "bg-[#3a3a50]"
        )}
      />
      <span className="truncate text-[12px] leading-tight">{account.name}</span>
    </button>
  );
}
