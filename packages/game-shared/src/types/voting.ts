export type VotableGameMode = "waves" | "battle_royale" | "infection";

export interface VotingState {
  isVotingActive: boolean;
  votingEndTime: number; // Server timestamp when voting ends
  votes: {
    waves: number;
    battle_royale: number;
    infection: number;
  };
  disabledModes: VotableGameMode[];
}
