import type { LucideIcon } from "lucide-react";
import {
  Crosshair,
  LayoutGrid,
  MapPin,
  MousePointer2,
  PackageSearch,
  ScrollText,
  Store,
  Users,
} from "lucide-react";
import type { EditorSidebarSection } from "./-types";

export interface EditorSidebarTabDefinition {
  id: EditorSidebarSection;
  label: string;
  /** Single-letter shortcut (shown on the rail; case-insensitive when pressed). */
  hotkey: string;
  Icon: LucideIcon;
}

export const EDITOR_SIDEBAR_TAB_ORDER: EditorSidebarTabDefinition[] = [
  { id: "cursor", label: "Select", hotkey: "C", Icon: MousePointer2 },
  { id: "tiles", label: "Tiles", hotkey: "T", Icon: LayoutGrid },
  { id: "markers", label: "Markers", hotkey: "F", Icon: MapPin },
  { id: "npcs", label: "NPCs", hotkey: "N", Icon: Users },
  { id: "spawners", label: "Spawners", hotkey: "R", Icon: Crosshair },
  { id: "merchants", label: "Merchants", hotkey: "M", Icon: Store },
  { id: "scavenge", label: "Scavenge", hotkey: "V", Icon: PackageSearch },
  { id: "quests", label: "Quests", hotkey: "Q", Icon: ScrollText },
];

/** Lowercase key → sidebar section (for map editor keyboard shortcuts). */
export const EDITOR_SIDEBAR_HOTKEY_TO_SECTION: Partial<
  Record<string, EditorSidebarSection>
> = Object.fromEntries(EDITOR_SIDEBAR_TAB_ORDER.map((t) => [t.hotkey.toLowerCase(), t.id]));
