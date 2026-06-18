export function add(a: number, b: number): number {
  return a + b;
}

export function formatPrice(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}
