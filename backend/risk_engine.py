def calculate_risk(
    additions: int,
    deletions: int,
    affected_files: list[str],
    dependency_depths: dict[str, int],
    diff_analysis: dict,
    security_findings: list[dict],
):
    """
    Calculate PR risk using engineering and security signals.
    """

    total_changes = additions + deletions
    affected_count = len(affected_files)

    # ----------------------------------------------
    # Change size
    # ----------------------------------------------

    if total_changes >= 100:
        change_score = 30
    elif total_changes >= 50:
        change_score = 22
    elif total_changes >= 20:
        change_score = 14
    elif total_changes >= 10:
        change_score = 8
    else:
        change_score = 4

    # ----------------------------------------------
    # Blast radius
    # ----------------------------------------------

    if affected_count >= 10:
        impact_score = 35
    elif affected_count >= 5:
        impact_score = 28
    elif affected_count >= 3:
        impact_score = 22
    elif affected_count >= 1:
        impact_score = 12
    else:
        impact_score = 0

    # ----------------------------------------------
    # Dependency depth
    # ----------------------------------------------

    max_depth = (
        max(dependency_depths.values())
        if dependency_depths
        else 0
    )

    if max_depth >= 6:
        depth_score = 20
    elif max_depth >= 4:
        depth_score = 16
    elif max_depth >= 3:
        depth_score = 12
    elif max_depth >= 2:
        depth_score = 8
    elif max_depth >= 1:
        depth_score = 4
    else:
        depth_score = 0

    # ----------------------------------------------
    # Logic changes
    # ----------------------------------------------

    logic_score = (
        10
        if diff_analysis.get("logic_changes")
        else 0
    )

    # ----------------------------------------------
    # Function changes
    # ----------------------------------------------

    function_changes = diff_analysis.get(
        "function_changes",
        []
    )

    if len(function_changes) >= 3:
        function_score = 8
    elif len(function_changes) >= 1:
        function_score = 5
    else:
        function_score = 0

    # ----------------------------------------------
    # Import changes
    # ----------------------------------------------

    import_score = (
        6
        if diff_analysis.get("import_changes")
        else 0
    )

    # ----------------------------------------------
    # Deletion-heavy changes
    # ----------------------------------------------

    deletion_score = (
        5
        if deletions > additions and deletions >= 5
        else 0
    )

    # ----------------------------------------------
    # Security findings
    # ----------------------------------------------

    high_security = sum(
        1
        for finding in security_findings
        if finding.get("severity") == "HIGH"
    )

    medium_security = sum(
        1
        for finding in security_findings
        if finding.get("severity") == "MEDIUM"
    )

    security_score = min(
        (high_security * 15)
        + (medium_security * 7),
        25,
    )

    # ----------------------------------------------
    # Final score
    # ----------------------------------------------

    score = min(
        change_score
        + impact_score
        + depth_score
        + logic_score
        + function_score
        + import_score
        + deletion_score
        + security_score,
        100,
    )

    # ----------------------------------------------
    # Risk level
    # ----------------------------------------------

    if score >= 75:
        level = "HIGH"
    elif score >= 50:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "score": score,
        "level": level,
        "factors": {
            "change_score": change_score,
            "impact_score": impact_score,
            "depth_score": depth_score,
            "logic_score": logic_score,
            "function_score": function_score,
            "import_score": import_score,
            "deletion_score": deletion_score,
            "security_score": security_score,
            "high_security_findings": high_security,
            "medium_security_findings": medium_security,
            "max_dependency_depth": max_depth,
        },
    }