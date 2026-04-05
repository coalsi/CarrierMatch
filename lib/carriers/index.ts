import { CarrierConfig } from "./types";
import { americo } from "./americo";
import { corebridge } from "./corebridge";
import { transamerica } from "./transamerica";
import { aetna } from "./aetna";
import { americanAmicable } from "./american-amicable";
import { mutualOfOmaha } from "./mutual-of-omaha";

export const carriers: CarrierConfig[] = [
  americo,
  corebridge,
  transamerica,
  aetna,
  americanAmicable,
  mutualOfOmaha,
];

export const carrierMap: Record<string, CarrierConfig> = Object.fromEntries(
  carriers.map((c) => [c.id, c])
);
