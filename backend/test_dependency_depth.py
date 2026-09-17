from analyzer import (
    build_dependency_graph_from_files,
    calculate_dependency_depth,
)


files = [
    {
        "path": "payment.service.ts",
        "content": """
export function processPayment() {
    return "payment processed";
}
""",
    },
    {
        "path": "order.service.ts",
        "content": """
import { processPayment } from "./payment.service";

export function createOrder() {
    processPayment();
}
""",
    },
    {
        "path": "inventory.service.ts",
        "content": """
import { createOrder } from "./order.service";

export function updateInventory() {
    createOrder();
}
""",
    },
    {
        "path": "notification.service.ts",
        "content": """
import { updateInventory } from "./inventory.service";

export function sendNotification() {
    updateInventory();
}
""",
    },
]


graph = build_dependency_graph_from_files(files)

depths = calculate_dependency_depth(
    graph,
    "payment.service.ts",
)


print("\nPRISM DEPENDENCY DEPTH")
print("----------------------")

for file, depth in depths.items():
    print(f"{file}: depth {depth}")