import * as React from "react";

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}

export function DropdownMenu({
  trigger,
  children,
  align = "left",
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on ESC key
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={`absolute top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[10000] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div
            className="py-1"
            onClick={() => setIsOpen(false)}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

interface DropdownMenuItemProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function DropdownMenuItem({
  onClick,
  children,
  className = "",
}: DropdownMenuItemProps) {
  return (
    <button
      className={`w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

interface DropdownMenuSeparatorProps {
  className?: string;
}

export function DropdownMenuSeparator({
  className = "",
}: DropdownMenuSeparatorProps) {
  return <div className={`border-t border-gray-700 my-1 ${className}`} />;
}
