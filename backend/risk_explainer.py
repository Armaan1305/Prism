def explain_risk(
    risk: dict,
    additions: int,
    deletions: int,
    affected_files: list[str],
    diff_analysis: dict,
):
    """
    Generate a deterministic explanation of the PR risk.
    """

    factors = risk["factors"]

    score = risk["score"]
    level = risk["level"]

    explanations = []

    # ----------------------------------------------
    # Change size
    # ----------------------------------------------

    total_changes = additions + deletions

    if total_changes <= 5:
        explanations.append(
            "The pull request contains a small number of code changes."
        )
    elif total_changes <= 20:
        explanations.append(
            "The pull request contains a moderate number of code changes."
        )
    else:
        explanations.append(
            "The pull request contains a relatively large number of code changes."
        )

    # ----------------------------------------------
    # Blast radius
    # ----------------------------------------------

    affected_count = len(affected_files)

    if affected_count == 0:
        explanations.append(
            "No downstream files were detected as affected."
        )
    elif affected_count == 1:
        explanations.append(
            "One downstream file may be affected by this change."
        )
    else:
        explanations.append(
            f"{affected_count} downstream files may be affected by this change."
        )

    # ----------------------------------------------
    # Dependency depth
    # ----------------------------------------------

    max_depth = factors.get(
        "max_dependency_depth",
        0,
    )

    if max_depth >= 4:
        explanations.append(
            f"The change propagates through {max_depth} dependency levels."
        )
    elif max_depth >= 2:
        explanations.append(
            f"The change propagates through {max_depth} dependency levels."
        )
    elif max_depth == 1:
        explanations.append(
            "The change has a direct downstream dependency."
        )

    # ----------------------------------------------
    # Logic changes
    # ----------------------------------------------

    if diff_analysis.get("logic_changes"):
        explanations.append(
            "The diff contains changes to application logic."
        )

    # ----------------------------------------------
    # Function changes
    # ----------------------------------------------

    function_changes = diff_analysis.get(
        "function_changes",
        []
    )

    if function_changes:
        explanations.append(
            f"The diff modifies {len(function_changes)} function definition(s)."
        )

    # ----------------------------------------------
    # Import changes
    # ----------------------------------------------

    if diff_analysis.get("import_changes"):
        explanations.append(
            "The diff modifies imports or dependencies."
        )

    # ----------------------------------------------
    # Deletion-heavy changes
    # ----------------------------------------------

    if factors.get("deletion_score", 0) > 0:
        explanations.append(
            "The change removes more code than it adds, increasing regression risk."
        )

    # ----------------------------------------------
    # Final summary
    # ----------------------------------------------

    summary = (
        f"PRISM assessed this change as {level} risk "
        f"with a score of {score}/100."
    )

    return {
        "summary": summary,
        "reasons": explanations,
    }