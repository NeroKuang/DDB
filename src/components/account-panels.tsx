"use client";

import { useActionState } from "react";
import type { PublicUser } from "@/auth/accounts";
import {
  adminResetPasswordAction,
  changeOwnPasswordAction,
  createSupervisorAction,
  type AccountActionState,
} from "@/auth/account-actions";

const initial: AccountActionState = { ok: false, message: "" };

const inputClass =
  "rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-600";

function Status({ state }: { state: AccountActionState }) {
  if (!state.message) {
    return null;
  }
  return (
    <p
      role="status"
      className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}
    >
      {state.message}
    </p>
  );
}

export function AccountList({ users }: { users: PublicUser[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-200 dark:border-zinc-700">
          <th className="py-2 pr-3">登入名</th>
          <th className="py-2 pr-3">角色</th>
          <th className="py-2">店員</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr
            key={user.id}
            className="border-b border-zinc-100 dark:border-zinc-800"
          >
            <td className="py-2 pr-3">{user.username}</td>
            <td className="py-2 pr-3">{user.role}</td>
            <td className="py-2">{user.primaryNickname ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CreateSupervisorForm() {
  const [state, action, pending] = useActionState(
    createSupervisorAction,
    initial
  );
  return (
    <form action={action} className="space-y-2 rounded border p-4">
      <h2 className="font-medium">新增 Supervisor</h2>
      <label className="flex flex-col gap-1 text-sm">
        登入名
        <input name="username" required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        初始密碼
        <input
          name="password"
          type="password"
          required
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "建立中…" : "建立"}
      </button>
      <Status state={state} />
    </form>
  );
}

export function AdminResetPasswordForm() {
  const [state, action, pending] = useActionState(
    adminResetPasswordAction,
    initial
  );
  return (
    <form action={action} className="space-y-2 rounded border p-4">
      <h2 className="font-medium">重設 Supervisor／Personal 密碼</h2>
      <label className="flex flex-col gap-1 text-sm">
        登入名
        <input name="username" required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        新密碼
        <input
          name="newPassword"
          type="password"
          required
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "重設中…" : "重設密碼"}
      </button>
      <Status state={state} />
    </form>
  );
}

export function ChangeOwnPasswordForm() {
  const [state, action, pending] = useActionState(
    changeOwnPasswordAction,
    initial
  );
  return (
    <form action={action} className="space-y-2 rounded border p-4">
      <h2 className="font-medium">變更自己的密碼</h2>
      <label className="flex flex-col gap-1 text-sm">
        目前密碼
        <input
          name="currentPassword"
          type="password"
          required
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        新密碼
        <input
          name="newPassword"
          type="password"
          required
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "更新中…" : "更新密碼"}
      </button>
      <Status state={state} />
    </form>
  );
}
