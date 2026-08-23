export function generateProviderOrderCode(): number {
  const timestampPart = Date.now().toString().slice(-9);
  const randomPart = Math.floor(Math.random() * 90 + 10);
  return Number(`${timestampPart}${randomPart}`);
}