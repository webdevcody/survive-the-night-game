import { SIGN_MAX_MESSAGE_LENGTH, normalizeSignMessage } from "@shared/util/sign-message";
import { RPG_BORDER_GOLD, RPG_METADATA_MUTED, RPG_TITLE_CREAM } from "./rpg-hud-theme";

const SIGN_MODAL_SCRIM = "rgba(0, 0, 0, 0.72)";
const SIGN_MODAL_PANEL_BG =
  "linear-gradient(180deg, rgba(16,18,31,0.98) 0%, rgba(6,8,16,0.95) 100%)";
const SIGN_MODAL_BODY_TEXT = "rgba(241, 232, 210, 0.96)";
const SIGN_MODAL_ACCENT = "rgba(255, 214, 102, 0.95)";
const SIGN_MODAL_INVALID = "rgba(255, 110, 110, 0.96)";
const SIGN_MODAL_FIELD_BG = "rgba(9, 11, 20, 0.98)";
const SIGN_MODAL_FIELD_BORDER = "rgba(150, 163, 184, 0.45)";

function signModalButtonStyle(kind: "primary" | "secondary"): string {
  if (kind === "primary") {
    return [
      "border:1px solid rgba(255,214,102,0.92)",
      "background:rgba(123, 90, 24, 0.92)",
      `color:${RPG_TITLE_CREAM}`,
      "padding:8px 14px",
      "border-radius:6px",
      "cursor:pointer",
      "font:600 13px Arial, sans-serif",
    ].join(";");
  }
  return [
    `border:1px solid ${SIGN_MODAL_FIELD_BORDER}`,
    "background:rgba(255,255,255,0.04)",
    `color:${RPG_TITLE_CREAM}`,
    "padding:8px 14px",
    "border-radius:6px",
    "cursor:pointer",
    "font:600 13px Arial, sans-serif",
  ].join(";");
}

function signModalTextFieldStyle(multiline: boolean): string {
  return [
    `background:${SIGN_MODAL_FIELD_BG}`,
    `border:1px solid ${SIGN_MODAL_FIELD_BORDER}`,
    "border-radius:6px",
    `color:${SIGN_MODAL_BODY_TEXT}`,
    "font:14px Arial, sans-serif",
    "padding:10px 12px",
    "outline:none",
    multiline ? "min-height:150px" : "",
    multiline ? "resize:vertical" : "",
    "box-sizing:border-box",
    "width:100%",
  ]
    .filter(Boolean)
    .join(";");
}

type SignTextModalOptions = {
  initialMessage: string;
  /** Primary button label (default: Post in Ground). */
  confirmButtonLabel?: string;
  onConfirm: (message: string) => void;
};

export class SignTextModal {
  private root: HTMLDivElement | null = null;

  constructor(
    private readonly opts: SignTextModalOptions,
    private readonly onCancel: () => void,
  ) {}

  public isOpen(): boolean {
    return this.root !== null;
  }

  public open(): void {
    if (typeof document === "undefined" || this.root) {
      return;
    }

    const wrap = document.createElement("div");
    wrap.style.cssText =
      `position:fixed;inset:0;background:${SIGN_MODAL_SCRIM};z-index:99999;display:flex;` +
      "align-items:center;justify-content:center;padding:18px;";

    const box = document.createElement("div");
    box.style.cssText =
      `background:${SIGN_MODAL_PANEL_BG};border:2px solid ${RPG_BORDER_GOLD};border-radius:10px;` +
      "width:min(560px, calc(100vw - 36px));box-shadow:0 14px 40px rgba(0,0,0,0.55);" +
      "padding:16px;font-family:Georgia,system-ui,sans-serif;";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;gap:12px;";

    const title = document.createElement("div");
    title.textContent = "Write sign";
    title.style.cssText = `color:${RPG_TITLE_CREAM};font-size:20px;font-weight:600;`;

    const hint = document.createElement("div");
    hint.textContent =
      "Post your message to drop this sign in front of you. Other players read it by interacting with the sign.";
    hint.style.cssText = `margin:10px 0 12px;color:${RPG_METADATA_MUTED};font:13px Arial,sans-serif;line-height:1.45;`;

    const textLabel = document.createElement("label");
    textLabel.textContent = `Message (${SIGN_MAX_MESSAGE_LENGTH} chars max)`;
    textLabel.style.cssText = `display:block;margin-bottom:6px;color:${SIGN_MODAL_ACCENT};font:600 13px Arial,sans-serif;`;

    const textArea = document.createElement("textarea");
    textArea.maxLength = SIGN_MAX_MESSAGE_LENGTH;
    textArea.value = this.opts.initialMessage;
    textArea.placeholder = "Leave a warning, directions, or a note for other survivors.";
    textArea.style.cssText = signModalTextFieldStyle(true);

    const metaRow = document.createElement("div");
    metaRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;";

    const errEl = document.createElement("div");
    errEl.style.cssText = `min-height:18px;color:${SIGN_MODAL_INVALID};font:12px Arial,sans-serif;line-height:1.35;`;

    const countEl = document.createElement("div");
    countEl.style.cssText = `color:${RPG_METADATA_MUTED};font:12px Arial,sans-serif;white-space:nowrap;`;

    const updateMeta = () => {
      const normalized = normalizeSignMessage(textArea.value);
      const remaining = SIGN_MAX_MESSAGE_LENGTH - normalized.length;
      countEl.textContent = `${Math.max(0, remaining)} left`;
      errEl.textContent = "";
      textArea.style.border = `1px solid ${SIGN_MODAL_FIELD_BORDER}`;
    };

    updateMeta();
    textArea.addEventListener("input", updateMeta);

    const footer = document.createElement("div");
    footer.style.cssText = "display:flex;justify-content:flex-end;gap:10px;margin-top:14px;";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.style.cssText = signModalButtonStyle("secondary");

    const save = document.createElement("button");
    save.type = "button";
    save.textContent = this.opts.confirmButtonLabel ?? "Post in Ground";
    save.style.cssText = signModalButtonStyle("primary");

    const finishCancel = () => {
      this.close();
      this.onCancel();
    };

    const trySubmit = () => {
      const normalized = normalizeSignMessage(textArea.value);
      if (!normalized) {
        errEl.textContent = "Enter a message before posting.";
        textArea.style.border = `1px solid ${SIGN_MODAL_INVALID}`;
        textArea.focus();
        return;
      }
      this.close();
      this.opts.onConfirm(normalized);
    };

    cancel.onclick = finishCancel;
    save.onclick = trySubmit;
    wrap.onclick = (event) => {
      if (event.target === wrap) {
        finishCancel();
      }
    };
    box.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "enter") {
        event.preventDefault();
        trySubmit();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        finishCancel();
      }
    });

    header.appendChild(title);
    metaRow.appendChild(errEl);
    metaRow.appendChild(countEl);
    footer.appendChild(cancel);
    footer.appendChild(save);

    box.appendChild(header);
    box.appendChild(hint);
    box.appendChild(textLabel);
    box.appendChild(textArea);
    box.appendChild(metaRow);
    box.appendChild(footer);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    this.root = wrap;

    queueMicrotask(() => {
      textArea.focus();
      textArea.setSelectionRange(textArea.value.length, textArea.value.length);
    });
  }

  public close(): void {
    this.root?.remove();
    this.root = null;
  }
}

type SignReadModalOptions = {
  title?: string;
  message: string;
  /** Adds a Pick up button that runs this (e.g. send interact for the ground sign entity). */
  onPickUp?: () => void;
};

export class SignReadModal {
  private root: HTMLDivElement | null = null;

  constructor(
    private readonly opts: SignReadModalOptions,
    private readonly onClose: () => void,
  ) {}

  public isOpen(): boolean {
    return this.root !== null;
  }

  public open(): void {
    if (typeof document === "undefined" || this.root) {
      return;
    }

    const wrap = document.createElement("div");
    wrap.style.cssText =
      `position:fixed;inset:0;background:${SIGN_MODAL_SCRIM};z-index:99999;display:flex;` +
      "align-items:center;justify-content:center;padding:18px;";

    const box = document.createElement("div");
    box.style.cssText =
      `background:${SIGN_MODAL_PANEL_BG};border:2px solid ${RPG_BORDER_GOLD};border-radius:10px;` +
      "width:min(540px, calc(100vw - 36px));box-shadow:0 14px 40px rgba(0,0,0,0.55);" +
      "padding:16px;font-family:Georgia,system-ui,sans-serif;";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;gap:12px;";

    const title = document.createElement("div");
    title.textContent = this.opts.title ?? "Sign";
    title.style.cssText = `color:${RPG_TITLE_CREAM};font-size:20px;font-weight:600;`;

    const body = document.createElement("div");
    body.textContent = this.opts.message;
    body.style.cssText =
      `margin-top:12px;padding:14px 16px;border-radius:8px;background:${SIGN_MODAL_FIELD_BG};` +
      `border:1px solid ${SIGN_MODAL_FIELD_BORDER};color:${SIGN_MODAL_BODY_TEXT};` +
      "font:14px Arial,sans-serif;line-height:1.6;white-space:pre-wrap;max-height:min(50vh, 380px);overflow:auto;";

    const footer = document.createElement("div");
    footer.style.cssText = "display:flex;justify-content:flex-end;gap:10px;margin-top:14px;flex-wrap:wrap;";

    let pickUp: HTMLButtonElement | null = null;
    if (this.opts.onPickUp) {
      pickUp = document.createElement("button");
      pickUp.type = "button";
      pickUp.textContent = "Pick up";
      pickUp.style.cssText = signModalButtonStyle("secondary");
    }

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close";
    close.style.cssText = signModalButtonStyle("primary");

    const finishClose = () => {
      this.close();
      this.onClose();
    };

    if (pickUp && this.opts.onPickUp) {
      const runPickUp = this.opts.onPickUp;
      pickUp.onclick = () => {
        runPickUp();
        finishClose();
      };
    }
    close.onclick = finishClose;
    wrap.onclick = (event) => {
      if (event.target === wrap) {
        finishClose();
      }
    };
    box.addEventListener("keydown", (event) => {
      if (event.key === "Escape" || event.key === "Enter") {
        event.preventDefault();
        finishClose();
      }
    });

    header.appendChild(title);
    if (pickUp) {
      footer.appendChild(pickUp);
    }
    footer.appendChild(close);
    box.appendChild(header);
    box.appendChild(body);
    box.appendChild(footer);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    this.root = wrap;

    queueMicrotask(() => close.focus());
  }

  public close(): void {
    this.root?.remove();
    this.root = null;
  }
}
