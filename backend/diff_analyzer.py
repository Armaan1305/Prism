import re


FUNCTION_PATTERN = re.compile(
    r"\b(?:function|def)\s+([A-Za-z_]\w*)\s*\((.*?)\)"
)

def generate_change_summary(
    modified_functions: list[dict],
    added_functions: list[dict],
    removed_functions: list[dict],
    logic_changes: bool,
    import_changes: bool,
):
    """
    Generate human-readable explanations
    of the changes detected in a diff.
    """

    summary = []

    for function in modified_functions:
        summary.append(
            {
                "type": "FUNCTION_MODIFIED",
                "function": function["name"],
                "message": (
                    f"Function '{function['name']}' was modified."
                ),
                "old_signature": function["old_signature"],
                "new_signature": function["new_signature"],
            }
        )

    for function in added_functions:
        summary.append(
            {
                "type": "FUNCTION_ADDED",
                "function": function["name"],
                "message": (
                    f"Function '{function['name']}' was added."
                ),
            }
        )

    for function in removed_functions:
        summary.append(
            {
                "type": "FUNCTION_REMOVED",
                "function": function["name"],
                "message": (
                    f"Function '{function['name']}' was removed."
                ),
            }
        )

    if logic_changes:
        summary.append(
            {
                "type": "LOGIC_CHANGE",
                "message": (
                    "Application logic was modified in the diff."
                ),
            }
        )

    if import_changes:
        summary.append(
            {
                "type": "IMPORT_CHANGE",
                "message": (
                    "Imports or dependencies were modified."
                ),
            }
        )

    return summary

def analyze_diff(
    patch: str | None,
):
    """
    Analyze a GitHub pull request patch.

    Detects:
    - added/removed lines
    - added functions
    - removed functions
    - modified functions
    - import changes
    - logic changes
    """

    if not patch:
        return {
            "added_lines": 0,
            "removed_lines": 0,
            "function_changes": [],
            "added_functions": [],
            "removed_functions": [],
            "modified_functions": [],
            "import_changes": False,
            "logic_changes": False,
        }

    added_lines = 0
    removed_lines = 0

    added_functions = []
    removed_functions = []

    import_changes = False
    logic_changes = False

    for line in patch.splitlines():

        # Ignore GitHub's file metadata lines.
        if line.startswith("+++"):
            continue

        if line.startswith("---"):
            continue

        # -------------------------
        # Added line
        # -------------------------
        if line.startswith("+"):
            added_lines += 1

            content = line[1:].strip()

            match = FUNCTION_PATTERN.search(content)

            if match:
                function_name = match.group(1)

                added_functions.append(
                    {
                        "name": function_name,
                        "signature": content,
                    }
                )

            if content.startswith(
                ("import ", "from ")
            ):
                import_changes = True

            if any(
                keyword in content
                for keyword in [
                    "if ",
                    "else",
                    "for ",
                    "while ",
                    "try:",
                    "catch",
                    "throw ",
                    "return ",
                ]
            ):
                logic_changes = True

        # -------------------------
        # Removed line
        # -------------------------
        elif line.startswith("-"):
            removed_lines += 1

            content = line[1:].strip()

            match = FUNCTION_PATTERN.search(content)

            if match:
                function_name = match.group(1)

                removed_functions.append(
                    {
                        "name": function_name,
                        "signature": content,
                    }
                )

            if content.startswith(
                ("import ", "from ")
            ):
                import_changes = True

            if any(
                keyword in content
                for keyword in [
                    "if ",
                    "else",
                    "for ",
                    "while ",
                    "try:",
                    "catch",
                    "throw ",
                    "return ",
                ]
            ):
                logic_changes = True

    # ------------------------------------------------
    # Detect modified functions
    # ------------------------------------------------

    added_names = {
        function["name"]
        for function in added_functions
    }

    removed_names = {
        function["name"]
        for function in removed_functions
    }

    modified_names = (
        added_names & removed_names
    )

    modified_functions = []

    for name in sorted(modified_names):

        old_function = next(
            function
            for function in removed_functions
            if function["name"] == name
        )

        new_function = next(
            function
            for function in added_functions
            if function["name"] == name
        )

        modified_functions.append(
            {
                "name": name,
                "old_signature": old_function["signature"],
                "new_signature": new_function["signature"],
            }
        )

    # Remove modified functions from
    # pure added/removed lists.
    added_functions = [
        function
        for function in added_functions
        if function["name"] not in modified_names
    ]

    removed_functions = [
        function
        for function in removed_functions
        if function["name"] not in modified_names
    ]

    # A function modification is itself
    # a logic-level change.
    if modified_functions:
        logic_changes = True

    change_summary = generate_change_summary(
        modified_functions,
        added_functions,
        removed_functions,
        logic_changes,
        import_changes,
    )

    return {
        "added_lines": added_lines,
        "removed_lines": removed_lines,
        "function_changes": [
            function["name"]
            for function in modified_functions
        ],
        "added_functions": added_functions,
        "removed_functions": removed_functions,
        "modified_functions": modified_functions,
        "change_summary": change_summary,
        "import_changes": import_changes,
        "logic_changes": logic_changes,
    }