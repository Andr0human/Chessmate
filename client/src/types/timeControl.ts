export interface TimeControlOption {
  value: number;
  label: string;
}

export type TimeControlValue = "60" | "180" | "300" | "600" | "1800" | "0";

export type TimeControlType =
  | "bullet"
  | "blitz"
  | "rapid"
  | "classical"
  | "unlimited";
