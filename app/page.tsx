"use client";

import { useCallback, useEffect, useState } from "react";
import PromoCard from "@/components/PromoCard";
import { STORE_LIST, STORES } from "@/lib/stores";
import { PromosResponse, StoreId } from "@/lib/types";
import { detectHighlight } from "@/lib/highlight";

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

  const highlightedPromos = promos.filter((p) => detectHighlight(p) !== null);
  const normalPromos = promos.filter((p) => detectHighlight(p) === null);

  const failedStores = (data?.results ?? []).filter((r) => !r.ok);
  const emptyStores = (data?.results ?? []).filter((r) => r.ok && r.promos.length === 0);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <header className="mx-auto max-w-4xl px-5 pb-6 pt-10 sm:px-6">
        <p className="text-xs tracking-[0.2em] text-stone-400 dark:text-stone-500">
          SEVEN-ELEVEN / LAWSON / FAMILYMART
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-stone-900 dark:text-stone-50">
          コンビニ プライチ・お得情報
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="border border-stone-300 px-4 py-1.5 text-stone-700 transition-colors hover:border-stone-900 hover:text-stone-900 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-100 dark:hover:text-stone-100"
          >
            {loading ? "更新中…" : "今すぐ更新"}
          </button>
          {data && (
            <span className="text-stone-400 dark:text-stone-500">
              最終更新: {new Date(data.fetchedAt).toLocaleString("ja-JP")}
              {data.stale && "（取得失敗のため前回データを表示中）"}
            </span>
          )}
        </div>
      </header>

      <nav className="mx-auto max-w-4xl overflow-x-auto border-b border-stone-200 px-4 sm:px-6 dark:border-stone-800">
        <div className="flex flex-nowrap gap-3 whitespace-nowrap">
          <FilterTab label="すべて" active={filter === "all"} onClick={() => setFilter("all")} />
          {STORE_LIST.map((s) => (
            <FilterTab
              key={s.id}
              label={s.name}
              active={filter === s.id}
              onClick={() => setFilter(s.id)}
            />
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6">
        {loading && !data && <p className="text-stone-500 dark:text-stone-400">読み込み中…</p>}

        {(failedStores.length > 0 || emptyStores.length > 0) && (
          <div className="mb-6 space-y-2">
            {failedStores.map((r) => (
              <div
                key={r.store}
                className="border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              >
                {STORES[r.store].name}
                の最新情報を自動取得できませんでした。
                <a
                  href={STORES[r.store].sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 underline underline-offset-2"
                >
                  公式サイトで確認する
                </a>
              </div>
            ))}
            {emptyStores.map((r) => (
              <div
                key={r.store}
                className="border border-stone-200 bg-stone-100 px-4 py-2.5 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
              >
                {STORES[r.store].name}
                は現在、発券期間中の対象商品がありません（切り替わり中の可能性があります）。
                <a
                  href={STORES[r.store].sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 underline underline-offset-2"
                >
                  公式サイトで確認する
                </a>
              </div>
            ))}
          </div>
        )}

        {promos.length > 0 ? (
          <>
            {highlightedPromos.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-xs tracking-[0.15em] text-stone-400 dark:text-stone-500">
                  注目（プロテイン・無糖飲料）
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {highlightedPromos.map((p) => (
                    <PromoCard key={p.id} promo={p} />
                  ))}
                </div>
              </div>
            )}

            {normalPromos.length > 0 && (
              <div>
                {highlightedPromos.length > 0 && (
                  <h2 className="mb-3 text-xs tracking-[0.15em] text-stone-400 dark:text-stone-500">
                    その他の対象商品
                  </h2>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {normalPromos.map((p) => (
                    <PromoCard key={p.id} promo={p} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          !loading && (
            <p className="text-stone-500 dark:text-stone-400">
              表示できるキャンペーン情報がありません。上のリンクから各社の公式サイトをご確認ください。
            </p>
          )
        )}
      </main>
    </div>
  );
}

function FilterTab({
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
      className={`-mb-px border-b-2 py-3 text-sm transition-colors ${
        active
          ? "border-stone-900 text-stone-900 dark:border-stone-100 dark:text-stone-100"
          : "border-transparent text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
      }`}
    >
      {label}
    </button>
  );
}
