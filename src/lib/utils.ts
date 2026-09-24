import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  const mergedClasses = twMerge(clsx(...inputs));
  return typeof mergedClasses === "string" ? mergedClasses : String(mergedClasses);
}
