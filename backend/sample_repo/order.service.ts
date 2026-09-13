import { processPayment } from "./payment.service";

export function createOrder() {
  processPayment();

  return "order created";
}