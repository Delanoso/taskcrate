export const STOCK_UNITS = ["each", "pair", "box", "pack", "roll", "metre", "kg", "litre"] as const;
export type StockUnit = (typeof STOCK_UNITS)[number];
export type StockKind = "issue" | "receive" | "return" | "adjust" | "legacy";

export type StockMoveView = {
  id: string;
  kind: StockKind;
  quantity: number;
  delta: number;
  balanceAfter: number | null;
  partyName: string | null;
  partySignature: string | null;
  loggedByName: string | null;
  loggedBySignature: string | null;
  jobRef: string | null;
  note: string | null;
  reason: string | null;
  createdAt: string;
};

export type StockItemView = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  location: string | null;
  supplier: string | null;
  quantity: number;
  reorderAt: number;
  publicToken: string;
  low: boolean;
  movements: StockMoveView[];
};

export function stockKindLabel(kind: StockKind) {
  if (kind === "issue") return "Signed out";
  if (kind === "receive") return "Received";
  if (kind === "return") return "Returned";
  if (kind === "adjust") return "Stock count";
  return "Earlier entry";
}

export function partyLabels(kind: Exclude<StockKind, "legacy">) {
  if (kind === "issue") {
    return {
      title: "Sign out",
      party: "Signed out to",
      partySign: "Signature of the person taking it",
      logged: "Logged by",
      loggedSign: "Signature of the person who logged the amount",
    };
  }
  if (kind === "receive") {
    return {
      title: "Receive stock",
      party: "Delivered by",
      partySign: "Signature of the person who delivered it",
      logged: "Logged by",
      loggedSign: "Signature of the person who logged the amount",
    };
  }
  if (kind === "return") {
    return {
      title: "Return stock",
      party: "Returned by",
      partySign: "Signature of the person returning it",
      logged: "Logged by",
      loggedSign: "Signature of the person who logged the amount",
    };
  }
  return {
    title: "Stock count",
    party: "Counted by",
    partySign: "Signature of the person who counted",
    logged: "Checked by",
    loggedSign: "Signature of the person who checked the count",
  };
}

export function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}
