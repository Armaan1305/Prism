from security_analyzer import analyze_security


sample_code = """
const API_KEY = "123456789abcdef";
const result = eval(userInput);
element.innerHTML = userInput;
"""


findings = analyze_security(
    sample_code,
    "payment.service.ts",
)


print("\nPRISM SECURITY ANALYZER")
print("-----------------------")

print(
    f"Findings: {len(findings)}"
)

for finding in findings:

    print(
        f"\n[{finding['severity']}] "
        f"{finding['id']}"
    )

    print(
        f"File: {finding['file']}"
    )

    print(
        f"Line: {finding['line']}"
    )

    print(
        f"Message: {finding['message']}"
    )
    