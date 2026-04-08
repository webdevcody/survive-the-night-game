export type VotableGameMode = "open_world" | "battle_royale" | "infection";

export interface VotingState {
  isVotingActive: boolean;
  votingEndTime: number; // Server timestamp when voting ends
  votes: {
    open_world: number;
    battle_royale: number;
    infection: number;
  };
  disabledModes: VotableGameMode[];
}
