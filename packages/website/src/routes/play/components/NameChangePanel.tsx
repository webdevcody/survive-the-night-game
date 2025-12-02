import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { Button } from "~/components/ui/button";

interface NameChangePanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentName?: string;
  onNameChange: (newName: string) => void;
}

/**
 * Panel for changing player display name
 */
export function NameChangePanel({
  isOpen,
  onClose,
  currentName = "",
  onNameChange,
}: NameChangePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [playerName, setPlayerName] = useState(currentName);
  const [errorMessage, setErrorMessage] = useState("");

  // Update playerName when currentName changes or panel opens
  useEffect(() => {
    if (isOpen) {
      // Always sync with currentName when panel opens or currentName changes
      setPlayerName(currentName);
      setErrorMessage("");
      // Focus input when panel opens
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, currentName]);

  const handleSubmit = React.useCallback(() => {
    if (playerName.length < 4) {
      setErrorMessage("Name must be at least 4 characters");
      return;
    }

    if (playerName.length > 12) {
      setErrorMessage("Name must be 12 characters or less");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(playerName)) {
      setErrorMessage("Name can only contain letters, numbers, underscores, and hyphens");
      return;
    }

    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("displayName", playerName);
    }

    // Call the onNameChange callback
    onNameChange(playerName);
    onClose();
  }, [playerName, onNameChange, onClose]);

  // Handle ESC key to close and Enter to submit
  // Use capture phase to intercept events before other handlers
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Handle ESC to close (always, regardless of where pressed)
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // Handle Enter to submit (always, regardless of where pressed)
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit();
        return;
      }

      // For keys being typed in the input field, let them through naturally
      // but stop propagation to prevent game handlers from receiving them
      if (isInputField) {
        e.stopPropagation();
        return;
      }

      // For keys pressed outside input fields, block game shortcuts
      // Stop propagation to prevent other handlers from receiving them
      e.stopPropagation();
      if (
        e.key === "i" ||
        e.key === "I" ||
        e.key === "w" ||
        e.key === "a" ||
        e.key === "s" ||
        e.key === "d" ||
        e.key === "e" ||
        e.key === "f" ||
        e.key === "h" ||
        e.key === "c" ||
        e.key === "g" ||
        e.key === "x" ||
        e.key === "q" ||
        e.key === "m" ||
        e.key === "t" ||
        e.key === "Tab"
      ) {
        e.preventDefault();
      }
    };

    // Use capture phase to intercept events before other handlers
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, handleSubmit, onClose]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      // Add a small delay to prevent immediate closing when opening
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow alphanumeric, underscore, and hyphen
    if (/^[a-zA-Z0-9_-]*$/.test(value) && value.length <= 12) {
      setPlayerName(value);
      setErrorMessage("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={panelRef}
        className="bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-xl w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-2xl">Change Name</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="name-input" className="block text-sm font-medium text-gray-300 mb-2">
              Display Name
            </label>
            <input
              ref={inputRef}
              id="name-input"
              type="text"
              value={playerName}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your name"
              maxLength={12}
            />
            <p className="mt-2 text-xs text-gray-400">
              {playerName.length}/12 characters (minimum 4)
            </p>
          </div>

          {errorMessage && <div className="text-red-400 text-sm">{errorMessage}</div>}

          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={playerName.length < 4}
            >
              Change Name
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              className="flex-1 border border-gray-700 hover:bg-gray-800"
            >
              Cancel
            </Button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-400 text-center">
              Press <span className="font-mono text-white">ENTER</span> to submit or{" "}
              <span className="font-mono text-white">ESC</span> to cancel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
