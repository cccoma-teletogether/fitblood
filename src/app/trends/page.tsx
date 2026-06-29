"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { getItemHistory } from "@/lib/exam-store";
import { EXAM_TYPE_LABELS } from "@/lib/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface ItemSummary {
  nameEn: string;
  name: string;
  count: number;
  latestValue: number;
  unit: string;
}

type HistoryPoint = Awaited<ReturnType<typeof getItemHistory>>[number];

function TrendsList() {
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const all = await db.examItems.toArray();
      const map = new Map<string, ItemSummary>();
      for (const item of all) {
        if (!item.nameEn) continue;
        const existing = map.get(item.nameEn);
        if (!existing) {
          map.set(item.nameEn, { nameEn: item.nameEn, name: item.name, count: 1, latestValue: item.value, unit: item.unit });
        } else {
          existing.count += 1;
          existing.latestValue = item.value;
        }
      }
      setItems([...map.values()]);
      setLoaded(true);
    }
    load();
  }, []);

  if (!loaded) return null;

  return (
    <div className="flex flex-col gap-4 p-4 pt-8">
      <h2 className="text-xl font-semibold">항목별 추이</h2>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
          <TrendingUp size={40} />
          <p className="text-sm">검사 결과를 등록하면 추이를 확인할 수 있습니다</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <Link key={item.nameEn} href={`/trends?item=${encodeURIComponent(item.nameEn)}`}>
              <div className="flex items-center justify-between border rounded-xl px-4 py-3 hover:bg-muted transition-colors">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.nameEn}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {item.latestValue} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{item.count}회 측정</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendDetail({ nameEn }: { nameEn: string }) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getItemHistory(nameEn).then((data) => { setHistory(data); setLoaded(true); });
  }, [nameEn]);

  if (!loaded) return null;

  const chartData = history.map((h) => ({
    date: h.examDate.slice(5),
    value: h.value,
    type: EXAM_TYPE_LABELS[h.examType as keyof typeof EXAM_TYPE_LABELS] ?? h.examType,
  }));

  return (
    <div className="flex flex-col gap-4 p-4 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/trends" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-xl font-semibold">{nameEn}</h2>
          <p className="text-xs text-muted-foreground">{history.length}회 측정</p>
        </div>
      </div>

      {history.length < 2 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          추이를 보려면 2회 이상 측정 데이터가 필요합니다
        </p>
      ) : (
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value, _, entry) => [
                  `${value} (${(entry as { payload: { type: string } }).payload.type})`,
                  nameEn,
                ]}
              />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {[...history].reverse().map((h, i) => (
          <div key={i} className="flex items-center justify-between border rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium">{h.examDate}</p>
              <p className="text-xs text-muted-foreground">
                {EXAM_TYPE_LABELS[h.examType as keyof typeof EXAM_TYPE_LABELS] ?? h.examType}
              </p>
            </div>
            <p className="font-semibold">{h.displayValue ?? h.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendsContent() {
  const searchParams = useSearchParams();
  const item = searchParams.get("item");
  return item ? <TrendDetail nameEn={decodeURIComponent(item)} /> : <TrendsList />;
}

export default function TrendsPage() {
  return <Suspense fallback={null}><TrendsContent /></Suspense>;
}
