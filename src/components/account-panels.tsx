"use client";

import { useActionState } from "react";
import { ListToolbar } from "@/components/list-toolbar";
import { useClientList } from "@/components/use-client-list";
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

function accountSearchHaystack(user: PublicUser): string {
  return [user.username, user.role, user.primaryNickname ?? ""].join(" ");
}

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
  const list = useClientList({
    items: users,
    getSearchHaystack: accountSearchHaystack,
  });

  if (users.length === 0) {
    return <p className="text-sm text-zinc-500">尚無帳號。</p>;
  }

  return (
    <div className="space-y-3">
      <ListToolbar
        query={list.query}
        onQueryChange={list.setQuery}
        searchLabel="搜尋帳號"
        searchPlaceholder="登入名、角色、店員暱稱"
        pageSize={list.pageSize}
        onPageSizeChange={list.setPageSize}
        page={list.page}
        onPageChange={list.setPage}
        pages={list.pages}
        filteredCount={list.filteredCount}
        totalCount={list.totalCount}
      />
      {list.filteredCount === 0 ? (
        <p className="text-sm text-zinc-500">沒有符合的帳號。</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="py-2 pr-3">登入名</th>
              <th className="py-2 pr-3">角色</th>
              <th className="py-2">店員</th>
            </tr>
          </thead>
          <tbody>
            {list.pageItems.map((user) => (
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
      )}
    </div>
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
