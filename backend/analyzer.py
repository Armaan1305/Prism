from pathlib import Path
import re


IMPORT_PATTERN = re.compile(
    r"""(?:import\s+.*?\s+from\s+|import\s*\(\s*|require\s*\(\s*)['"](.+?)['"]"""
)


def extract_imports(file_path: Path):
    """
    Extract imported files from a JavaScript/TypeScript file.
    """

    try:
        content = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return []

    imports = IMPORT_PATTERN.findall(content)

    return imports


def resolve_import(source_file: Path, import_path: str):
    """
    Resolve a relative import to an actual file.
    """

    if not import_path.startswith("."):
        return None

    base_path = (source_file.parent / import_path).resolve()

    extensions = [
        "",
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
    ]

    for extension in extensions:
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

    files = list(root.rglob("*.ts"))
    files += list(root.rglob("*.tsx"))
    files += list(root.rglob("*.js"))
    files += list(root.rglob("*.jsx"))

    for file_path in files:
        relative_file = file_path.relative_to(root).as_posix()

        graph[relative_file] = []

        imports = extract_imports(file_path)

        for import_path in imports:
            resolved = resolve_import(file_path, import_path)

            if resolved:
                try:
                    relative_dependency = resolved.relative_to(root).as_posix()
                    graph[relative_file].append(relative_dependency)
                except ValueError:
                    pass

    return graph


def find_affected_files(graph, changed_file):
    """
    Find files that directly or indirectly depend on the changed file.
    """

    affected = set()

    changed_file = changed_file.replace("\\", "/")

    reverse_graph = {}

    for file, dependencies in graph.items():
        for dependency in dependencies:
            reverse_graph.setdefault(dependency, []).append(file)

    queue = [changed_file]

    while queue:
        current = queue.pop(0)

        for dependent in reverse_graph.get(current, []):
            if dependent not in affected:
                affected.add(dependent)
                queue.append(dependent)

    return sorted(affected)