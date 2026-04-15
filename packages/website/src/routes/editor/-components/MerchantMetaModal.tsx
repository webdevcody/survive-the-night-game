import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { ComboboxTypeahead } from "~/components/ui/combobox-typeahead";
import { WholeNumberInput } from "~/components/ui/whole-number-input";
import { useEditorStore } from "../-store";
import {
  MERCHANT_META_LABEL_MAX,
  MERCHANT_META_MAX_SHOP_LINES,
  MERCHANT_META_PRICE_MAX,
  type WorldMapMerchantShopLine,
} from "@survive-the-night/game-shared/map/world-map-types";
import {
  itemRegistry,
  resourceRegistry,
  weaponRegistry,
} from "@survive-the-night/game-shared/entities/index";
import type { EntityType } from "@survive-the-night/game-shared/types/entity";
import { getMerchantBuyPriceForEntityType } from "@survive-the-night/game-shared/util/merchant-pricing";
import { DECAL_TILE_SHOPKEEPER } from "@survive-the-night/game-shared/map/decal-palette";
import { COLLIDABLE_TILE_MERCHANT } from "@survive-the-night/game-shared/map/collidable-tile-ids";

function sortedAllItemTypeIds(): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  const push = (id: string) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  for (const id of itemRegistry.getAllItemIds()) push(id);
  for (const id of weaponRegistry.getAllWeaponTypes()) push(id);
  for (const id of resourceRegistry.getAllResourceTypes()) push(id);
  ids.sort((a, b) => a.localeCompare(b));
  return ids;
}

export function MerchantMetaModal() {
  const merchantConfigModal = useEditorStore((s) => s.merchantConfigModal);
  const setMerchantConfigModal = useEditorStore((s) => s.setMerchantConfigModal);
  const decalsGrid = useEditorStore((s) => s.decalsGrid);
  const collidablesGrid = useEditorStore((s) => s.collidablesGrid);
  const merchantMeta = useEditorStore((s) => s.merchantMeta);
  const setMerchantShopLinesAt = useEditorStore((s) => s.setMerchantShopLinesAt);
  const clearMerchantOverrideAt = useEditorStore((s) => s.clearMerchantOverrideAt);
  const updateMerchantLabelAt = useEditorStore((s) => s.updateMerchantLabelAt);
  const startMerchantRelocate = useEditorStore((s) => s.startMerchantRelocate);
  const removeMerchantAtTile = useEditorStore((s) => s.removeMerchantAtTile);

  const itemIds = useMemo(() => sortedAllItemTypeIds(), []);
  const merchantItemOptions = useMemo(
    () => itemIds.map((id) => ({ value: id, label: id })),
    [itemIds],
  );

  const open = merchantConfigModal !== null;
  const row = merchantConfigModal?.row ?? 0;
  const col = merchantConfigModal?.col ?? 0;

  const decalId = decalsGrid[row]?.[col] ?? 0;
  const collId = collidablesGrid[row]?.[col] ?? -1;
  const isMerchantTile =
    open && (decalId === DECAL_TILE_SHOPKEEPER || collId === COLLIDABLE_TILE_MERCHANT);

  const entry = merchantMeta.find((e) => e.row === row && e.col === col);
  const lines: WorldMapMerchantShopLine[] = entry?.shopItems ?? [];
  const usesGlobalStock = entry === undefined || entry.shopItems === undefined;

  const [labelDraft, setLabelDraft] = useState("");
  useEffect(() => {
    if (!open) return;
    setLabelDraft(entry?.label ?? "");
  }, [open, row, col, entry?.label]);

  const flushLabelIfNeeded = () => {
    const cell = merchantConfigModal;
    if (!cell) return;
    const { row: r, col: c } = cell;
    const isCellMerchant =
      (decalsGrid[r]?.[c] ?? 0) === DECAL_TILE_SHOPKEEPER ||
      (collidablesGrid[r]?.[c] ?? -1) === COLLIDABLE_TILE_MERCHANT;
    if (!isCellMerchant) return;
    const ent = merchantMeta.find((e) => e.row === r && e.col === c);
    if (labelDraft !== (ent?.label ?? "")) {
      updateMerchantLabelAt(r, c, labelDraft);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        flushLabelIfNeeded();
        setMerchantConfigModal(null);
      }}
    >
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 overflow-hidden rounded-none border-gray-600 bg-gray-900 text-white sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>Merchant stock</DialogTitle>
          <DialogDescription className="text-gray-400">
            Tile row {row}, col {col}. Override which items this shop sells and their base prices
            (coins). Leave as global catalog unless you need a custom list. Use Relocate to move
            this shop—the dialog closes until you click a valid destination on the map.
          </DialogDescription>
        </DialogHeader>
        {!isMerchantTile ? (
          <p className="text-[10px] text-gray-500">
            This tile is not a merchant. Close and pick another from the Merchants list.
          </p>
        ) : (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            <div className="space-y-1">
              <label className="block text-[9px] font-medium text-gray-500">Editor label</label>
              <input
                type="text"
                maxLength={MERCHANT_META_LABEL_MAX}
                placeholder="e.g. Town armory"
                className="h-8 w-full rounded border border-gray-600 bg-gray-950 px-2 text-[11px] text-gray-100 placeholder:text-gray-600"
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onBlur={() => {
                  if (labelDraft !== (entry?.label ?? "")) {
                    updateMerchantLabelAt(row, col, labelDraft);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
              <p className="text-[9px] text-gray-600">Shown in the Merchants list only; not in-game.</p>
            </div>

            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
                disabled={usesGlobalStock}
                onClick={() => clearMerchantOverrideAt(row, col)}
              >
                Use global catalog
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
                disabled={!usesGlobalStock && lines.length >= MERCHANT_META_MAX_SHOP_LINES}
                onClick={() => {
                  const first = itemIds[0] ?? "wood";
                  const price = getMerchantBuyPriceForEntityType(first as EntityType) || 1;
                  setMerchantShopLinesAt(row, col, [...lines, { itemType: first, price }]);
                }}
              >
                + Add item
              </Button>
            </div>

            {usesGlobalStock ? (
              <p className="text-[10px] text-amber-200/90">
                Currently using the global buyable-items list from item/weapon/resource configs.
                Click &quot;Add item&quot; to start a custom stock list for this shop only.
              </p>
            ) : lines.length === 0 ? (
              <p className="text-[10px] text-gray-500">
                Custom list is empty — this merchant will sell nothing until you add items.
              </p>
            ) : null}

            <ul className="space-y-2">
              {lines.map((line, idx) => (
                <li
                  key={`merchant-line-${idx}`}
                  className="flex flex-wrap items-end gap-2 rounded border border-gray-700 bg-gray-950/60 p-2"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <label className="block text-[9px] font-medium text-gray-500">Item</label>
                    <ComboboxTypeahead
                      value={line.itemType}
                      options={merchantItemOptions}
                      placeholder="Type to search…"
                      stopEscapePropagation
                      listClassName="max-h-48"
                      onValueChange={(v) => {
                        const next = lines.map((x, i) =>
                          i === idx ? { ...x, itemType: v } : x,
                        );
                        setMerchantShopLinesAt(row, col, next);
                      }}
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <label className="block text-[9px] font-medium text-gray-500">Price</label>
                    <WholeNumberInput
                      max={MERCHANT_META_PRICE_MAX}
                      min={0}
                      className="h-8 w-full rounded border border-gray-600 bg-gray-950 px-2 text-[11px] text-gray-100"
                      value={line.price}
                      onValueChange={(price) => {
                        const next = lines.map((x, i) =>
                          i === idx ? { ...x, price } : x,
                        );
                        setMerchantShopLinesAt(row, col, next);
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="!h-8 !text-[10px] text-red-300 hover:bg-red-950/40 hover:text-red-200"
                    onClick={() => {
                      const next = lines.filter((_, i) => i !== idx);
                      setMerchantShopLinesAt(row, col, next);
                    }}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap justify-end gap-1 border-t border-gray-700 pt-3">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
                onClick={() => startMerchantRelocate(row, col)}
              >
                Relocate
              </Button>
            </div>

            <div className="border-t border-gray-700 pt-3">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="!h-7 !rounded-none !px-2 !text-[10px] text-red-300 hover:bg-red-950/40 hover:text-red-200"
                onClick={() => {
                  removeMerchantAtTile(row, col);
                  setMerchantConfigModal(null);
                }}
              >
                Remove merchant from map
              </Button>
              <p className="mt-1 text-[9px] text-gray-500">
                Clears the shopkeeper decal and/or merchant collidable at this tile and any custom
                stock for it.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
