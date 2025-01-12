export interface ServerOnly {
  isServerOnly: () => boolean;
}

export type Hitbox = {
  x: number;
  y: number;
  width: number;
  height: number;
};
