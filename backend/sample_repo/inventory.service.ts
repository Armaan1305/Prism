import { createOrder } from "./order.service";

export function updateInventory() {
  createOrder();

  return "inventory updated";
}