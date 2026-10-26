"use client";

import { api } from "./api";

export function LogoutButton({ className = "btn-ghost text-sm" }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await api("/api/auth/logout", "POST").catch(() => null);
        window.location.assign("/");
      }}
    >
      Cerrar sesión
    </button>
  );
}
