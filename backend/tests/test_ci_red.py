"""Temporary: fails on purpose to show that CI marks the pull request as failed (AR-20). Reverted in the next commit."""


def test_ar20_ci_feiler_med_vilje():
    assert False, "deliberate failure to check that CI turns red"
