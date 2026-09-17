from risk_engine import calculate_risk


result = calculate_risk(
    additions=10,
    deletions=2,
    affected_files=[
        "order.service.ts",
        "inventory.service.ts",
        "notification.service.ts",
    ],
    dependency_depths={
        "payment.service.ts": 0,
        "order.service.ts": 1,
        "inventory.service.ts": 2,
        "notification.service.ts": 3,
    },
    diff_analysis={
        "logic_changes": True,
        "function_changes": [
            "processPayment"
        ],
        "import_changes": False,
    },
    security_findings=[],
)


def test_risk_score_exists():
    assert "score" in result


def test_risk_level_exists():
    assert result["level"] in [
        "LOW",
        "MEDIUM",
        "HIGH",
    ]


def test_risk_score_is_valid():
    assert 0 <= result["score"] <= 100


def test_dependency_depth_is_used():
    assert result["factors"]["max_dependency_depth"] == 3


def test_logic_change_is_detected():
    assert result["factors"]["logic_score"] > 0