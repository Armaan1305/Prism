from pathlib import Path


def find_matching_test_file(
    source_file: str,
    repository_files: list[str],
):
    """
    Find a likely test file corresponding to a source file.
    """

    source_path = Path(source_file)

    stem = source_path.stem
    extension = source_path.suffix

    possible_names = [
        f"{stem}.test{extension}",
        f"{stem}.spec{extension}",
        f"{stem}.test.ts",
        f"{stem}.spec.ts",
        f"{stem}.test.tsx",
        f"{stem}.spec.tsx",
        f"{stem}.test.js",
        f"{stem}.spec.js",
        f"{stem}.test.jsx",
        f"{stem}.spec.jsx",
    ]

    for repository_file in repository_files:

        repository_name = Path(
            repository_file
        ).name

        if repository_name in possible_names:
            return repository_file

    return None


def recommend_tests(
    changed_file: str,
    affected_files: list[str],
    repository_files: list[str] | None = None,
):
    """
    Generate test recommendations based on
    changed files, affected files and existing
    repository test files.
    """

    if repository_files is None:
        repository_files = []

    recommendations = []

    files_to_check = [
        changed_file
    ] + affected_files

    for file in files_to_check:

        test_file = find_matching_test_file(
            file,
            repository_files,
        )

        if test_file:

            recommendations.append(
                {
                    "source_file": file,
                    "test_file": test_file,
                    "status": "FOUND",
                    "priority": (
                        "HIGH"
                        if file == changed_file
                        else "MEDIUM"
                    ),
                    "recommendation": (
                        f"Run {test_file} before merging."
                    ),
                }
            )

        else:

            recommendations.append(
                {
                    "source_file": file,
                    "test_file": None,
                    "status": "NOT_FOUND",
                    "priority": (
                        "HIGH"
                        if file == changed_file
                        else "MEDIUM"
                    ),
                    "recommendation": (
                        f"No matching test file found for {file}."
                    ),
                }
            )

    return recommendations  