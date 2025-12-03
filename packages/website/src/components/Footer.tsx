import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="relative z-10 border-t bg-[#00080e]">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/privacy"
              className="text-gray-500 hover:text-gray-400 text-sm transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-gray-700">•</span>
            <Link
              to="/terms"
              className="text-gray-500 hover:text-gray-400 text-sm transition-colors"
            >
              Terms of Service
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Survive the Night. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
