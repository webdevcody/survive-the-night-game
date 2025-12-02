import {
  COMMAND_DEFINITIONS,
  GAME_MODES,
  CommandDefinition,
  CommandArgumentDefinition,
} from "@shared/commands/command-definitions";
import { SPAWNABLE_ENTITY_TYPES } from "@shared/constants";

interface AutocompleteState {
  isActive: boolean;
  suggestions: string[];
  selectedIndex: number;
  originalInput: string;
}

export class CommandAutocomplete {
  private state: AutocompleteState = {
    isActive: false,
    suggestions: [],
    selectedIndex: 0,
    originalInput: "",
  };

  private readonly MAX_SUGGESTIONS = 10;

  /**
   * Reset autocomplete state
   */
  public reset(): void {
    this.state = {
      isActive: false,
      suggestions: [],
      selectedIndex: 0,
      originalInput: "",
    };
  }

  /**
   * Handle Tab key press
   * @param currentInput - Current chat input text
   * @returns Completed text, or null if no completion available
   */
  public handleTab(currentInput: string): string | null {
    // Only autocomplete commands (starting with /)
    if (!currentInput.startsWith("/")) {
      return null;
    }

    if (!this.state.isActive) {
      // First Tab press - generate suggestions
      this.state.originalInput = currentInput;
      this.state.suggestions = this.generateSuggestions(currentInput);

      if (this.state.suggestions.length === 0) {
        return null; // No matches
      }

      if (this.state.suggestions.length === 1) {
        // Single match - complete immediately
        const completed = this.state.suggestions[0];
        this.reset();
        return completed;
      }

      // Multiple matches - show suggestions panel
      this.state.isActive = true;
      this.state.selectedIndex = 0;
      return this.state.suggestions[0];
    } else {
      // Subsequent Tab - cycle through suggestions
      this.state.selectedIndex = (this.state.selectedIndex + 1) % this.state.suggestions.length;
      return this.state.suggestions[this.state.selectedIndex];
    }
  }

  /**
   * Handle Shift+Tab key press (cycle backwards)
   * @param currentInput - Current chat input text
   * @returns Completed text, or null if not active
   */
  public handleShiftTab(currentInput: string): string | null {
    if (!this.state.isActive) {
      return null;
    }

    // Cycle backwards
    this.state.selectedIndex =
      (this.state.selectedIndex - 1 + this.state.suggestions.length) % this.state.suggestions.length;
    return this.state.suggestions[this.state.selectedIndex];
  }

  /**
   * Handle ArrowDown key press (move selection down)
   * @returns Completed text, or null if not active
   */
  public handleArrowDown(): string | null {
    if (!this.state.isActive) {
      return null;
    }

    this.state.selectedIndex = (this.state.selectedIndex + 1) % this.state.suggestions.length;
    return this.state.suggestions[this.state.selectedIndex];
  }

  /**
   * Handle ArrowUp key press (move selection up)
   * @returns Completed text, or null if not active
   */
  public handleArrowUp(): string | null {
    if (!this.state.isActive) {
      return null;
    }

    this.state.selectedIndex =
      (this.state.selectedIndex - 1 + this.state.suggestions.length) % this.state.suggestions.length;
    return this.state.suggestions[this.state.selectedIndex];
  }

  /**
   * Handle character input - update suggestions based on new input
   * @param currentInput - Current chat input text
   */
  public handleInput(currentInput: string): void {
    if (!currentInput.startsWith("/")) {
      this.reset();
      return;
    }

    // If autocomplete is active, filter suggestions based on new input
    if (this.state.isActive) {
      const newSuggestions = this.generateSuggestions(currentInput);

      if (newSuggestions.length === 0) {
        this.reset();
        return;
      }

      this.state.suggestions = newSuggestions;
      this.state.selectedIndex = 0;
      this.state.originalInput = currentInput;
    }
  }

  /**
   * Get current suggestions for rendering
   */
  public getSuggestions(): string[] {
    return this.state.suggestions;
  }

  /**
   * Get selected suggestion index for rendering
   */
  public getSelectedIndex(): number {
    return this.state.selectedIndex;
  }

  /**
   * Check if autocomplete suggestions panel is showing
   */
  public isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Accept current selection (e.g., on Enter when suggestions shown)
   * @returns The selected suggestion, or null if not active
   */
  public acceptSelection(): string | null {
    if (!this.state.isActive || this.state.suggestions.length === 0) {
      return null;
    }

    const selected = this.state.suggestions[this.state.selectedIndex];
    this.reset();
    return selected;
  }

  /**
   * Generate suggestions based on current input
   */
  private generateSuggestions(input: string): string[] {
    const trimmed = input.slice(1).trim(); // Remove leading /
    const parts = trimmed.split(/\s+/);

    if (parts.length <= 1) {
      // Completing command name
      const prefix = parts[0] || "";
      return this.getMatchingCommands(prefix);
    }

    // Completing argument
    const commandName = parts[0].toLowerCase();
    const command = COMMAND_DEFINITIONS.find((c: CommandDefinition) => c.name === commandName);

    if (!command || !command.arguments) {
      return [];
    }

    const argIndex = parts.length - 2; // Which argument we're completing
    const argDef = command.arguments[argIndex];

    if (!argDef) {
      return [];
    }

    const argPrefix = parts[parts.length - 1];
    const baseParts = parts.slice(0, -1);
    const baseCommand = `/${baseParts.join(" ")} `;

    return this.getMatchingArguments(argDef, argPrefix).map((arg) => `${baseCommand}${arg}`);
  }

  /**
   * Get commands matching the given prefix
   */
  private getMatchingCommands(prefix: string): string[] {
    const prefixLower = prefix.toLowerCase();

    return COMMAND_DEFINITIONS.filter((cmd: CommandDefinition) => cmd.name.startsWith(prefixLower)).map(
      (cmd: CommandDefinition) => {
        // Add trailing space if command has no arguments, or after command name
        return `/${cmd.name} `;
      }
    );
  }

  /**
   * Get argument values matching the given prefix
   */
  private getMatchingArguments(argDef: CommandArgumentDefinition, prefix: string): string[] {
    const prefixLower = prefix.toLowerCase();

    switch (argDef.type) {
      case "entity":
        return SPAWNABLE_ENTITY_TYPES.filter((e) => e.toLowerCase().startsWith(prefixLower)).slice(
          0,
          this.MAX_SUGGESTIONS
        );

      case "mode":
        return GAME_MODES.filter((m: string) => m.startsWith(prefixLower));

      default:
        return [];
    }
  }
}
