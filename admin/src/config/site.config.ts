/**
 * サイト設定ファイル（Admin）
 * Fork して別の地方議会向けに使用する場合はこのファイルを変更してください。
 */
export const siteConfig = {
  siteName: "みらい議会＠埼玉県",
  cityName: "埼玉県",
  councilName: "埼玉県議会",
  councilBaseUrl: "https://www.pref.saitama.lg.jp/gikai/",
  councilBillsDetailUrl:
    "https://www.pref.saitama.lg.jp/gikai/gikaiday/gian/index.html",
  councilFactionExamples:
    "自由民主党埼玉県議員団、立憲民主党・無所属議員団、公明党埼玉県議員団、埼玉政本圃議員団等",
} as const;
