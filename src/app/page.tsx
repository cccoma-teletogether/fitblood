import Link from "next/link";
import { Camera, TrendingUp, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col gap-6 p-4 pt-10">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold">FitBlood</h1>
        <p className="text-sm text-muted-foreground mt-1">
          혈액검사 결과를 스캔하고 추이를 확인하세요
        </p>
      </div>

      {/* 스캔 CTA */}
      <Link href="/scan">
        <Button size="lg" className="w-full gap-2">
          <Camera size={20} />
          검사 결과지 스캔하기
        </Button>
      </Link>

      {/* 빠른 메뉴 */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/history">
          <Card className="cursor-pointer hover:bg-muted transition-colors">
            <CardContent className="flex flex-col items-center gap-2 py-6">
              <History size={28} className="text-primary" />
              <span className="text-sm font-medium">검사 이력</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/trends">
          <Card className="cursor-pointer hover:bg-muted transition-colors">
            <CardContent className="flex flex-col items-center gap-2 py-6">
              <TrendingUp size={28} className="text-primary" />
              <span className="text-sm font-medium">추이 차트</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 면책 고지 */}
      <p className="text-xs text-muted-foreground text-center px-4">
        본 앱은 의료기기가 아니며, 의사의 진단을 대체하지 않습니다.
      </p>
    </div>
  );
}
