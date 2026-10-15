import type { StockItem, StockMovement } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  STOCK_UNITS,
  type StockItemView,
  type StockKind,
  type StockMoveView,
  type StockUnit,
} from "@/lib/modules/stock-shared";

export class StockError extends Error {}

const KINDS = new Set<StockKind>(["issue", "receive", "return", "adjust", "legacy"]);

function clean(value: string | null | undefined, max: number) {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function signature(value: string | undefined, message: string) {
  if (!value || !value.startsWith("data:image/") || value.length > 500_000) {
    throw new StockError(message);
  }
  return value;
}

function unitOf(value: string | null | undefined): StockUnit {
  return STOCK_UNITS.includes(value as StockUnit) ? (value as StockUnit) : "each";
}

export function toStockMove(row: StockMovement, withSignatures: boolean): StockMoveView {
  const kind = KINDS.has(row.kind as StockKind) ? (row.kind as StockKind) : "legacy";
  const quantity = row.quantity > 0 ? row.quantity : Math.abs(row.delta);
  return {
    id: row.id,
    kind,
    quantity,
    delta: row.delta,
    balanceAfter: row.balanceAfter,
    partyName: row.partyName,
    partySignature: withSignatures ? row.partySignature : null,
    loggedByName: row.loggedByName,
    loggedBySignature: withSignatures ? row.loggedBySignature : null,
    jobRef: row.jobRef,
    note: row.note,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toStockItem(item: StockItem & { movements?: StockMovement[] }, withSignatures = false): StockItemView {
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    unit: unitOf(item.unit),
    location: item.location,
    supplier: item.supplier,
    quantity: item.quantity,
    reorderAt: item.reorderAt,
    publicToken: item.publicToken,
    low: item.quantity <= item.reorderAt,
    movements: (item.movements ?? []).map((row) => toStockMove(row, withSignatures)),
  };
}

export type MovementInput = {
  organizationId: string;
  itemId: string;
  kind: Exclude<StockKind, "legacy">;
  quantity?: number;
  counted?: number;
  partyName: string;
  partySignature?: string;
  loggedByName: string;
  loggedBySignature: string;
  jobRef?: string | null;
  note?: string | null;
  reason?: string | null;
  /** Opening balance is logged by one person. Every later entry needs both signatures. */
  opening?: boolean;
};

export async function recordMovement(input: MovementInput) {
  const partyName = clean(input.partyName, 120);
  const loggedByName = clean(input.loggedByName, 120);
  if (!loggedByName) throw new StockError("Add the name of the person who logged the amount.");
  const loggedBySignature = signature(input.loggedBySignature, "The person who logged the amount must sign.");

  let partySignature: string | null = null;
  if (input.opening) {
    if (!partyName) throw new StockError("Add the name of the person who counted the opening stock.");
  } else if (!partyName) {
    throw new StockError(input.kind === "issue"
      ? "Add the name of the person taking the stock."
      : input.kind === "adjust"
        ? "Add the name of the person who counted."
        : "Add the name of the other person.");
  } else {
    partySignature = signature(
      input.partySignature,
      input.kind === "issue"
        ? "The person taking the stock must sign."
        : input.kind === "adjust"
          ? "The person who counted must sign."
          : "The other person must sign.",
    );
  }

  return db.$transaction(async (tx) => {
    const item = await tx.stockItem.findFirst({
      where: { id: input.itemId, organizationId: input.organizationId },
    });
    if (!item) throw new StockError("That stock item was not found.");

    let quantity = 0;
    let delta = 0;
    let balance = item.quantity;

    if (input.kind === "adjust") {
      if (input.counted == null || !Number.isInteger(input.counted) || input.counted < 0 || input.counted > 100_000) {
        throw new StockError("Enter the quantity you counted.");
      }
      if (!clean(input.reason, 2000)) throw new StockError("Add the reason for this stock count.");
      if (input.counted === item.quantity) throw new StockError("That is already the quantity on hand.");
      quantity = Math.abs(input.counted - item.quantity);
      delta = input.counted - item.quantity;
      balance = input.counted;
    } else {
      quantity = input.quantity ?? 0;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100_000) {
        throw new StockError("Enter the amount.");
      }
      if (input.kind === "issue" && quantity > item.quantity) {
        throw new StockError(`Only ${item.quantity} ${unitOf(item.unit)} on hand.`);
      }
      delta = input.kind === "issue" ? -quantity : quantity;
      balance = item.quantity + delta;
    }

    const updated = await tx.stockItem.update({
      where: { id: item.id },
      data: { quantity: balance },
    });
    const movement = await tx.stockMovement.create({
      data: {
        itemId: item.id,
        kind: input.kind,
        quantity,
        delta,
        balanceAfter: balance,
        partyName,
        partySignature,
        loggedByName,
        loggedBySignature,
        jobRef: clean(input.jobRef, 120),
        note: clean(input.note, 2000),
        reason: clean(input.reason, 2000),
      },
    });

    if (item.quantity > item.reorderAt && balance <= item.reorderAt) {
      await tx.notification.create({
        data: {
          organizationId: item.organizationId,
          productSlug: "workshop-consumables",
          title: "Reorder threshold breached",
          body: `${item.name} now at ${balance} ${unitOf(item.unit)} (reorder at ${item.reorderAt})`,
        },
      });
    }

    return { item: updated, movement };
  });
}
