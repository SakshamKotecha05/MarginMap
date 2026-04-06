import rawSkus from "@/data/skus.json";
import { classifyAll, type ClassifiedSKU, type SKU } from "./classify";

// Run classification once at module load — all consumers share this array
export const allSKUs: ClassifiedSKU[] = classifyAll(rawSkus as SKU[]);

export const zombies  = allSKUs.filter((s) => s.classification === "zombie");
export const gems     = allSKUs.filter((s) => s.classification === "gem");
export const gateways = allSKUs.filter((s) => s.classification === "gateway");
export const healthy  = allSKUs.filter((s) => s.classification === "healthy");
