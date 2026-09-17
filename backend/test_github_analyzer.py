from analyzer import build_dependency_graph_from_files


files = [
    {
        "path": "payment.service.ts",
        "content": """
export function processPayment() {
    return "payment";
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
]


graph = build_dependency_graph_from_files(files)


print("\nGITHUB FILE ANALYSIS")
print("--------------------")

for file, dependencies in graph.items():
    print(f"{file} -> {dependencies}")