import re


SECURITY_PATTERNS = [
    {
        "id": "hardcoded-secret",
        "pattern": re.compile(
            r"""(?i)\b(api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{8,}["']"""
        ),
        "severity": "HIGH",
        "message": "Possible hardcoded secret or credential detected.",
    },
    {
        "id": "eval-usage",
        "pattern": re.compile(
            r"""\beval\s*\("""
        ),
        "severity": "HIGH",
        "message": "Use of eval() can execute dynamically generated code.",
    },
    {
        "id": "shell-execution",
        "pattern": re.compile(
            r"""(?:exec|spawn|system)\s*\("""
        ),
        "severity": "MEDIUM",
        "message": "Potential operating-system command execution detected.",
    },
    {
        "id": "inner-html",
        "pattern": re.compile(
            r"""\.innerHTML\s*="""
        ),
        "severity": "MEDIUM",
        "message": "Direct innerHTML assignment may introduce XSS risk.",
    },
    {
        "id": "sql-string-concatenation",
        "pattern": re.compile(
            r"""(?i)(SELECT|INSERT|UPDATE|DELETE).*(\+|f["']|\.format\s*\()"""
        ),
        "severity": "HIGH",
        "message": "Possible SQL query construction using string interpolation or concatenation.",
    },
]


def analyze_security(
    content: str,
    file_path: str,
):
    """
    Analyze source code for common security-risk patterns.
    """

    findings = []

    if not content:
        return findings

    lines = content.splitlines()

    for line_number, line in enumerate(
        lines,
        start=1,
    ):

        for rule in SECURITY_PATTERNS:

            if rule["pattern"].search(line):

                findings.append(
                    {
                        "id": rule["id"],
                        "severity": rule["severity"],
                        "message": rule["message"],
                        "file": file_path,
                        "line": line_number,
                    }
                )

    return findings