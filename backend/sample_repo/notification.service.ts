import { updateInventory } from "./inventory.service";

export function sendNotification() {
  updateInventory();

  return "notification sent";
}