from pathlib import Path
import re
from collections import deque


IMPORT_PATTERN = re.compile(
    r"""(?:import\s+.*?\s+from\s+|import\s*\(\s*|require\s*\(\s*)['"](.+?)['"]"""
)


SUPPORTED_EXTENSIONS = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
]


def extract_imports(file_path: Path):
    """
    Extract imported files from a JavaScript/TypeScript file.
    """

    try:
        content = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return []

    return IMPORT_PATTERN.findall(content)


def resolve_import(source_file: Path, import_path: str):
    """
    Resolve a relative import to an actual file.
    """

    if not import_path.startswith("."):
        return None

    base_path = (source_file.parent / import_path).resolve()

    candidates = [
        "",
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        "/index.ts",
        "/index.tsx",
        "/index.js",
        "/index.jsx",
    ]

    for extension in candidates:
        candidate = Path(str(base_path) + extension)

        if candidate.exists() and candidate.is_file():
            return candidate

    return None


def build_dependency_graph(repo_path: str):
    """
    Build a dependency graph for JS/TS files.
    """

    root = Path(repo_path).resolve()

    graph = {}

    files = []

    for extension in SUPPORTED_EXTENSIONS:
        files.extend(root.rglob(f"*{extension}"))

    for file_path in files:
        relative_file = file_path.relative_to(root).as_posix()

        graph[relative_file] = []

        imports = extract_imports(file_path)

        for import_path in imports:
            resolved = resolve_import(
                file_path,
                import_path,
            )

            if resolved:
                try:
                    relative_dependency = (
                        resolved
                        .relative_to(root)
                        .as_posix()
                    )

                    if relative_dependency not in graph[relative_file]:
                        graph[relative_file].append(
                            relative_dependency
                        )

                except ValueError:
                    pass

    return graph


def build_dependency_graph_from_files(files):
    """
    Build a dependency graph from source files
    fetched from GitHub.
    """

    file_map = {
        file["path"].replace("\\", "/"): file["content"]
        for file in files
    }

    graph = {}

    for file_path, content in file_map.items():

        if not file_path.endswith(tuple(SUPPORTED_EXTENSIONS)):
            continue

        graph[file_path] = []

        imports = IMPORT_PATTERN.findall(content)

        current_file = Path(file_path)

        for import_path in imports:

            if not import_path.startswith("."):
                continue

            base_path = (
                current_file.parent / import_path
            ).as_posix()

            candidates = [
                base_path,
                base_path + ".ts",
                base_path + ".tsx",
                base_path + ".js",
                base_path + ".jsx",
                base_path + "/index.ts",
                base_path + "/index.tsx",
                base_path + "/index.js",
                base_path + "/index.jsx",
            ]

            for candidate in candidates:

                candidate = candidate.replace(
                    "\\",
                    "/",
                )

                if candidate in file_map:

                    if candidate not in graph[file_path]:
                        graph[file_path].append(
                            candidate
                        )

                    break

    return graph


def build_reverse_graph(graph):
    """
    Convert a dependency graph into a reverse graph.

    Normal graph:

        A -> B

    means:

        A imports B

    Reverse graph:

        B -> A

    means:

        A is affected if B changes.
    """

    reverse_graph = {}

    for file, dependencies in graph.items():

        for dependency in dependencies:

            reverse_graph.setdefault(
                dependency,
                [],
            ).append(file)

    return reverse_graph


def find_affected_files(graph, changed_file):
    """
    Find files that directly or indirectly depend
    on the changed file.
    """

    changed_file = changed_file.replace(
        "\\",
        "/",
    )

    reverse_graph = build_reverse_graph(graph)

    affected = set()

    queue = deque([changed_file])

    while queue:

        current = queue.popleft()

        for dependent in reverse_graph.get(
            current,
            [],
        ):

            if dependent not in affected:

                affected.add(dependent)

                queue.append(dependent)

    return sorted(affected)


def calculate_dependency_depth(graph, changed_file):
    """
    Calculate dependency depth.

    Depth:

        0 = changed file
        1 = directly affected
        2 = affected through one dependency
        3 = affected through two dependencies
    """

    changed_file = changed_file.replace(
        "\\",
        "/",
    )

    reverse_graph = build_reverse_graph(graph)

    depths = {
        changed_file: 0
    }

    queue = deque([changed_file])

    while queue:

        current = queue.popleft()

        current_depth = depths[current]

        for dependent in reverse_graph.get(
            current,
            [],
        ):

            if dependent not in depths:

                depths[dependent] = (
                    current_depth + 1
                )

                queue.append(dependent)

    return depths


def get_dependency_relationships(
    graph,
    changed_file,
):
    """
    Return dependency relationships that are
    relevant to the changed file.

    Each relationship contains:

        source
        target
        depth

    Example:

        payment.service.ts
            -> order.service.ts
            -> inventory.service.ts
    """

    changed_file = changed_file.replace(
        "\\",
        "/",
    )

    depths = calculate_dependency_depth(
        graph,
        changed_file,
    )

    relationships = []

    for source, dependencies in graph.items():

        if source not in depths:
            continue

        for target in dependencies:

            if target not in depths:
                continue

            relationships.append(
                {
                    "source": source,
                    "target": target,
                    "depth": depths[source],
                }
            )

    return relationships


def get_dependency_analysis(
    graph,
    changed_file,
):
    """
    Return a complete dependency analysis
    for the changed file.
    """

    depths = calculate_dependency_depth(
        graph,
        changed_file,
    )

    affected_files = sorted(
        file
        for file in depths
        if file != changed_file
    )

    relationships = get_dependency_relationships(
        graph,
        changed_file,
    )

    max_depth = max(
        depths.values()
    ) if depths else 0

    return {
        "changed_file": changed_file,
        "affected_files": affected_files,
        "affected_areas": len(affected_files),
        "dependency_depths": depths,
        "max_dependency_depth": max_depth,
        "relationships": relationships,
    }