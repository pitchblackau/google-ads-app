"use client";

import { useRouter, usePathname } from "next/navigation";
import { Account } from "@/lib/types";
import { clsx } from "clsx";

interface SidebarProps {
  accounts: Account[];
}

export default function Sidebar({ accounts }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const active = accounts.filter((a) => a.isActive);
  const inactive = accounts.filter((a) => !a.isActive);

  const currentId = pathname.startsWith("/account/") ? pathname.split("/")[2] : null;

  function handleClick(account: Account) {
    router.push(`/account/${account.id}`);
  }

  return (
    <aside className="w-52 shrink-0 border-r border-[#1e1e2e] bg-[#0b0b14] flex flex-col sticky top-0 h-screen overflow-y-auto">
      <div
        className="px-4 pt-5 pb-3 border-b border-[#1e1e2e] cursor-pointer hover:bg-[#ffffff05]"
        onClick={() => router.push("/")}
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
                onClick={() => handleClick(a)}
              />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}

function AccountButton({
  account, selected, onClick,
}: {
  account: Account;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-2 rounded-md px-2 py-2 text-left transition-colors",
        selected ? "bg-[#00fff910] text-[#00fff9]" : "text-[#8b8b9a] hover:bg-[#ffffff08] hover:text-white"
      )}
    >
      <span className={clsx(
        "mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full",
        account.isActive ? "bg-[#00fff9]" : "bg-[#3a3a50]"
      )} />
      <span className="truncate text-[12px] leading-tight">{account.name}</span>
    </button>
  );
}
