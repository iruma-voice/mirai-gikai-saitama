/**
 * サイト設定ファイル
 * Fork して別の地方議会向けに使用する場合はこのファイルを変更してください。
 */
export const siteConfig = {
  siteName: "みらい議会＠埼玉県",
  siteDescription:
    "埼玉県議会で今どんな議案が検討されているか、わかりやすく伝えるプラットフォームです",
  cityName: "埼玉県",
  councilName: "埼玉県議会",
  keywords: [
    "みらい議会＠埼玉県",
    "みらい議会",
    "議案",
    "埼玉県",
    "県議会",
    "地方政治",
    "政策",
    "解説",
  ],
  councilBaseUrl: "https://www.pref.saitama.lg.jp/gikai/",
  /** 議案・議決結果の一覧ページ */
  councilBillsDetailUrl:
    "https://www.pref.saitama.lg.jp/gikai/gikaiday/gian/index.html",
  twitterHashtag: "埼玉県議会", // # なし
  externalLinks: {
    report: "",
    aboutNote: "",
    donation: "",
    teamAbout: "",
    terms: "",
    privacy: "",
    faq: "",
  },
  /**
   * ページを管理する政党名（空文字列の場合は政党名を省略した汎用表現を使用）
   * 例: "チームみらい"
   */
  managingParty: "" as string,
  /**
   * サービス運営者情報
   * 利用規約や問い合わせ先に使用します。
   */
  operator: {
    name: "" as string,
    contactUrl: "" as string,
    /** 利用規約の準拠法・管轄裁判所（第一審の専属的合意管轄） */
    jurisdiction: "" as string,
  },
  /**
   * 表示切り替えフラグ
   * Fork 先で各トグルを切り替えて利用してください。
   */
  features: {
    /**
     * サイトロゴ（ヘッダー・フッター）の表示
     * Fork 先で独自ロゴを用意した場合は true にする。
     * `web/public/img/logo.svg` を差し替えてから有効化する。
     */
    showLogo: false as boolean,
    /**
     * チームみらいセクションの表示（トップページ・フッター・デスクトップメニュー）
     * 非公式運営など、党の公式サービスとして出さない場合は false にする。
     */
    showTeamMiraiSection: false as boolean,
  },
} as const;
