import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isSameName(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;
  
  const cleanTokens = (name: string) => 
    name.trim().toLowerCase().split(/\s+/).sort();
    
  const tokens1 = cleanTokens(name1);
  const tokens2 = cleanTokens(name2);
  
  if (tokens1.length !== tokens2.length) return false;
  return tokens1.every((token, index) => token === tokens2[index]);
}
