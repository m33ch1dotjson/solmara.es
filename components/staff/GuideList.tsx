"use client";

import { useMemo, useState, useTransition } from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteGuideAction, duplicateGuideAction } from "@/app/admin/process-guide/actions";
import { useCopy } from "@/components/ui/LocaleProvider";
import { GuideMenu } from "./GuideMenu";
import s from "./GuideList.module.css";

export type GuideCard = {
  id: string;
  title: string;
  category: string;
  preview: string;
  updated: string;
  coverUrl: string | null;
  haystack: string;
};

const ALL = "ALL";

/**
 * The library: search, category filters, cards.
 *
 * A card is a link to the document and nothing else — clicking it opens the guide
 * on its own page rather than unfolding the text underneath, which is the whole
 * point of having documents instead of expandable notes.
 */
export function GuideList({ cards }: { cards: GuideCard[] }) {
  const { t } = useCopy();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [pending, start] = useTransition();

  const categories = t.guides.category as Record<string, string>;

  // Only the categories that something is actually filed under, plus All. A filter
  // that always finds nothing is a filter nobody trusts.
  const present = useMemo(() => {
    const seen = new Set(cards.map((card) => card.category));
    return Object.keys(categories).filter((key) => seen.has(key));
  }, [cards, categories]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cards.filter((card) => {
      if (category !== ALL && card.category !== category) return false;
      if (needle === "") return true;
      // The category name is searchable too: typing "vehicles" should find them
      // even though the word is nowhere in the text.
      const label = categories[card.category] ?? "";
      return card.haystack.includes(needle) || label.toLowerCase().includes(needle);
    });
  }, [cards, category, query, categories]);

  function duplicate(id: string) {
    start(async () => {
      const form = new FormData();
      form.set("id", id);
      await duplicateGuideAction(form);
    });
  }

  function destroy(id: string) {
    start(async () => {
      const form = new FormData();
      form.set("id", id);
      await deleteGuideAction(form);
    });
  }

  return (
    <div className={s.wrap}>
      <div className={s.controls}>
        <input
          type="search"
          className={s.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.guides.searchPlaceholder}
          aria-label={t.guides.searchPlaceholder}
        />
      </div>

      {present.length > 1 && (
        <div className={s.filters} role="group" aria-label={t.guides.filterLabel}>
          <button
            type="button"
            className={category === ALL ? `${s.chip} ${s.chipOn}` : s.chip}
            onClick={() => setCategory(ALL)}
            aria-pressed={category === ALL}
          >
            {t.guides.all}
          </button>
          {present.map((key) => (
            <button
              key={key}
              type="button"
              className={category === key ? `${s.chip} ${s.chipOn}` : s.chip}
              onClick={() => setCategory(key)}
              aria-pressed={category === key}
            >
              {categories[key]}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className={s.empty}>{cards.length === 0 ? t.guides.empty : t.guides.noMatch}</p>
      ) : (
        <div className={s.grid} aria-busy={pending}>
          {shown.map((card) => (
            <article key={card.id} className={s.card}>
              <Link href={`/admin/process-guide/${card.id}`} className={s.cardLink}>
                {card.coverUrl && (
                  // A thumbnail, deliberately short: the card is a way in, and a
                  // guide without a picture must not look like a broken one.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.coverUrl} alt="" className={s.cardCover} />
                )}
                <h2 className={s.cardTitle}>{card.title}</h2>
                <p className={s.cardPreview}>{card.preview || t.guides.stillEmpty}</p>
              </Link>

              <div className={s.cardFoot}>
                <span className={s.badge}>{categories[card.category]}</span>
                <span className={s.updated}>{card.updated}</span>
                <GuideMenu
                  // A query string on a dynamic route defeats typedRoutes' inference,
                  // so these two say what they are.
                  onEdit={() => router.push(`/admin/process-guide/${card.id}?edit=1` as Route)}
                  onPrint={() => router.push(`/admin/process-guide/${card.id}?print=1` as Route)}
                  onDuplicate={() => duplicate(card.id)}
                  onDelete={() => destroy(card.id)}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
