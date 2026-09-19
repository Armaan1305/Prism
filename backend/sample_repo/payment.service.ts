export function processPayment(amount: number) {
  if (amount <= 0) {
    throw new Error("Invalid payment amount");
  }

  console.log("PRISM test change");

  return "payment processed";
}
