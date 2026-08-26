export function normalizeCategory(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ')
}
