import { NextResponse } from "next/server";
export const error = (message: string, status = 400) =>
  NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
export const ok = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function jsonObject(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const input = await request.json();
    return input && typeof input === "object" && !Array.isArray(input)
      ? input
      : null;
  } catch {
    return null;
  }
}
export const txt = (value: unknown, max = 180) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
export const positiveInt = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
export const decimal = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
export const dateValue = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};
