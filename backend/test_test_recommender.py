from test_recommender import recommend_tests


repository_files = [
    "backend/sample_repo/payment.service.ts",
    "backend/sample_repo/payment.service.test.ts",
    "backend/sample_repo/order.service.ts",
    "backend/sample_repo/order.service.test.ts",
    "backend/sample_repo/inventory.service.ts",
]


recommendations = recommend_tests(
    changed_file="backend/sample_repo/payment.service.ts",
    affected_files=[
        "backend/sample_repo/order.service.ts",
        "backend/sample_repo/inventory.service.ts",
    ],
    repository_files=repository_files,
)


print("\nPRISM TEST MAPPING")
print("------------------")

for index, test in enumerate(
    recommendations,
    start=1,
):

    print(
        f"\n{index}. {test['source_file']}"
    )

    print(
        f"Status: {test['status']}"
    )

    print(
        f"Priority: {test['priority']}"
    )

    if test["test_file"]:

        print(
            f"Test: {test['test_file']}"
        )

    print(
        f"Recommendation: {test['recommendation']}"
    )