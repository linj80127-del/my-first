"use client";

import { useCallback, useEffect, useState } from "react";
import PromoCard from "@/components/PromoCard";
import { STORE_LIST, STORES } from "@/lib/stores";
import { PromosResponse, StoreId } from "@/lib/types";

type FilterId = "all" | StoreId;

export default function Home() {
  const [data, setData] = useState<(PromosResponse & { stale?: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>("all");

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/promos${force ? "?refresh=1" : ""}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount is intentional
    load();
    const interval = setInterval(() => load(), 10 * 60 * 1000); // auto-refresh every 10 min
    return () => clearInterval(interval);
  }, [load]);

  const promos = (data?.results ?? [])
    .filter((r) => filter === "all" || r.store === filter)
    .flatMap((r) => r.promos);

  const failedStores = (data?.results ?? []).filter((r) => !r.ok || r.promos.length === 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-4 py-5">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            コンビニ プライチ・お得情報
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            セブン-イレブン・ローソン・ファミリーマートの「1個買うと1個もらえる」等のキャンペーンをまとめて表示します。
          </p>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {loading ? "更新中…" : "今すぐ更新"}
            </button>
            {data && (
              <span className="text-zinc-400">
                最終更新: {new Date(data.fetchedAt).toLocaleString("ja-JP")}
                {data.stale && "（取得失敗のため前回データを表示中）"}
              </span>
            )}
          </div>
        </div>
      </header>

      <nav className="mx-auto max-w-4xl px-4 pt-4">
        <div className="flex flex-wrap gap-2">
          <FilterChip label="すべて" active={filter === "all"} onClick={() => setFilter("all")} />
          {STORE_LIST.map((s) => (
            <FilterChip
              key={s.id}
              label={s.name}
              active={filter === s.id}
              onClick={() => setFilter(s.id)}
            />
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {loading && !data && (
          <p className="text-zinc-500 dark:text-zinc-400">読み込み中…</p>
        )}

        {failedStores.length > 0 && (
          <div className="mb-4 space-y-2">
            {failedStores.map((r) => (
              <div
                key={r.store}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
              >
                {STORES[r.store].name}
                の最新情報を自動取得できませんでした。
                <a
                  href={STORES[r.store].sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 underline"
                >
                  公式サイトで確認する
                </a>
              </div>
            ))}
          </div>
        )}

        {promos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {promos.map((p) => (
              <PromoCard key={p.id} promo={p} />
            ))}
          </div>
        ) : (
          !loading && (
            <p className="text-zinc-500 dark:text-zinc-400">
              表示できるキャンペーン情報がありません。上のリンクから各社の公式サイトをご確認ください。
            </p>
          )
        )}
      </main>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
          : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}
