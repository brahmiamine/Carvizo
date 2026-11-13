"use client";
import { createContext, useContext } from "react";
import type { CarvizoController } from "./use-controller";
export const CarvizoContext = createContext<CarvizoController | null>(null);
export function useCarvizo() {
  const value = useContext(CarvizoContext);
  if (!value) throw new Error("Carvizo provider missing");
  return value;
}
