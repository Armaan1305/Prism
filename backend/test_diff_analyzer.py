from diff_analyzer import analyze_diff


patch = """@@ -1,3 +1,5 @@
 export function processPayment() {
+  console.log("PRISM test change");
+
   return "payment processed";
-}
+}
"""


result = analyze_diff(patch)


print("\nPRISM DIFF ANALYZER")
print("-------------------")

print(
    f"Added lines: {result['added_lines']}"
)

print(
    f"Removed lines: {result['removed_lines']}"
)

print(
    f"Import changes: {result['import_changes']}"
)

print(
    f"Logic changes: {result['logic_changes']}"
)

print(
    f"Function changes: {result['function_changes']}"
)