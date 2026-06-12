import { NextRequest, NextResponse } from "next/server";

// v1公開までのステルス用Basic認証。
// 環境変数 BASIC_AUTH="user:pass" が設定されている場合のみ有効(ローカル開発は素通し)
export function proxy(req: NextRequest) {
  const expected = process.env.BASIC_AUTH;
  if (!expected) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = Buffer.from(auth.slice(6), "base64").toString();
    if (decoded === expected) return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="earth-trend"' },
  });
}

export const config = {
  // 静的アセットは素通し(認証はページとAPIのみ)
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
