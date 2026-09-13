from analyzer import build_dependency_graph, find_affected_files


repo_path = "sample_repo"

graph = build_dependency_graph(repo_path)

print("\nDEPENDENCY GRAPH")
print("----------------")

for file, dependencies in graph.items():
    print(f"{file} -> {dependencies}")


changed_file = "payment.service.ts"

affected = find_affected_files(graph, changed_file)

print("\nCHANGED FILE")
print("------------")
print(changed_file)

print("\nAFFECTED FILES")
print("--------------")

for file in affected:
    print(file)

print(f"\nTotal affected files: {len(affected)}")