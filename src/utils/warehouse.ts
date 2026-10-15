import { WarehouseMovement } from '../types/apu';

export function calculateStock(movements: WarehouseMovement[]): Record<string, number> {
  const stock: Record<string, number> = {};
  for (const movement of movements) {
    const sign = movement.type === 'entrada' ? 1 : -1;
    stock[movement.resourceId] = Number(((stock[movement.resourceId] || 0) + sign * movement.quantity).toFixed(4));
  }
  return stock;
}

export function availableStock(movements: WarehouseMovement[], resourceId: string): number {
  return calculateStock(movements)[resourceId] || 0;
}
