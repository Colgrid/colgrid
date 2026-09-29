// Supabase rows come back untyped (no generated types yet); this names the shape a query selected.
export function rows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}
