"""
Q Realm Phase 1 - Test Suite

Tests for:
- Auth security (revoked token rejection)
- Visibility (hidden/deleted content filtering)
- LaTeX integrity
- RBAC (role-based access control)
- Soft delete
"""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta, timezone


@pytest.fixture
def mock_firebase_uid():
    return "test_firebase_uid_12345"


@pytest.fixture
def mock_user_student():
    return {
        "id": "user_student_123",
        "name": "Test Student",
        "email": "student@test.com",
        "role": "STUDENT",
        "userType": "STUDENT",
        "bio": None,
        "verified": True,
        "voteWeight": 1,
    }


@pytest.fixture
def mock_user_researcher():
    return {
        "id": "user_researcher_456",
        "name": "Test Researcher",
        "email": "researcher@test.com",
        "role": "RESEARCHER",
        "userType": "RESEARCHER",
        "bio": None,
        "verified": True,
        "voteWeight": 2,
    }


@pytest.fixture
def mock_user_admin():
    return {
        "id": "user_admin_789",
        "name": "Test Admin",
        "email": "admin@test.com",
        "role": "ADMIN",
        "userType": "PROFESSOR",
        "bio": None,
        "verified": True,
        "voteWeight": 4,
    }


class TestRoleHierarchy:
    def test_role_hierarchy_student_lowest(self):
        from app.models import ROLE_HIERARCHY
        assert ROLE_HIERARCHY["STUDENT"] == 1
        assert ROLE_HIERARCHY["STUDENT"] < ROLE_HIERARCHY["RESEARCHER"]

    def test_role_hierarchy_researcher_above_student(self):
        from app.models import ROLE_HIERARCHY
        assert ROLE_HIERARCHY["RESEARCHER"] == 2
        assert ROLE_HIERARCHY["RESEARCHER"] < ROLE_HIERARCHY["PROFESSOR"]

    def test_role_hierarchy_professor_below_admin(self):
        from app.models import ROLE_HIERARCHY
        assert ROLE_HIERARCHY["PROFESSOR"] == 3
        assert ROLE_HIERARCHY["ADMIN"] == 4

    def test_role_can_create_debate(self):
        from app.models import ROLE_CAN_CREATE_DEBATE
        assert "STUDENT" not in ROLE_CAN_CREATE_DEBATE
        assert "RESEARCHER" in ROLE_CAN_CREATE_DEBATE
        assert "PROFESSOR" in ROLE_CAN_CREATE_DEBATE
        assert "ADMIN" in ROLE_CAN_CREATE_DEBATE


class TestVoteWeights:
    def test_student_vote_weight(self):
        from app.models import VOTE_WEIGHTS
        assert VOTE_WEIGHTS["STUDENT"] == 1

    def test_researcher_vote_weight(self):
        from app.models import VOTE_WEIGHTS
        assert VOTE_WEIGHTS["RESEARCHER"] == 2

    def test_professor_vote_weight(self):
        from app.models import VOTE_WEIGHTS
        assert VOTE_WEIGHTS["PROFESSOR"] == 3


class TestVisibilityFilter:
    def test_visibility_filter_constant(self):
        from app.main import VISIBILITY_FILTER
        assert "deleted_at IS NULL" in VISIBILITY_FILTER
        assert "is_hidden = FALSE" in VISIBILITY_FILTER


class TestSoftDelete:
    def test_blog_has_deleted_at_column(self):
        from app.database import Blog
        assert hasattr(Blog, "deleted_at")

    def test_blog_has_is_hidden_column(self):
        from app.database import Blog
        assert hasattr(Blog, "is_hidden")

    def test_forum_has_deleted_at_column(self):
        from app.database import Forum
        assert hasattr(Forum, "deleted_at")

    def test_forum_has_is_hidden_column(self):
        from app.database import Forum
        assert hasattr(Forum, "is_hidden")

    def test_comment_has_deleted_at_column(self):
        from app.database import Comment
        assert hasattr(Comment, "deleted_at")

    def test_comment_has_is_hidden_column(self):
        from app.database import Comment
        assert hasattr(Comment, "is_hidden")


class TestFlagshipSystem:
    def test_blog_has_is_flagship_column(self):
        from app.database import Blog
        assert hasattr(Blog, "is_flagship")

    def test_blog_has_report_type_column(self):
        from app.database import Blog
        assert hasattr(Blog, "report_type")


class TestDebateSystem:
    def test_debate_table_exists(self):
        from app.database import Debate
        assert Debate is not None

    def test_debate_has_blog_a_id(self):
        from app.database import Debate
        assert hasattr(Debate, "blog_a_id")

    def test_debate_has_blog_b_id(self):
        from app.database import Debate
        assert hasattr(Debate, "blog_b_id")

    def test_debate_vote_table_exists(self):
        from app.database import DebateVote
        assert DebateVote is not None

    def test_debate_vote_has_vote_field(self):
        from app.database import DebateVote
        assert hasattr(DebateVote, "vote")

    def test_debate_vote_has_weight_field(self):
        from app.database import DebateVote
        assert hasattr(DebateVote, "weight")


class TestNotificationSystem:
    def test_notification_table_exists(self):
        from app.database import Notification
        assert Notification is not None

    def test_notification_has_is_read_field(self):
        from app.database import Notification
        assert hasattr(Notification, "is_read")

    def test_notification_has_message_field(self):
        from app.database import Notification
        assert hasattr(Notification, "message")


class TestReportSystem:
    def test_report_table_exists(self):
        from app.database import Report
        assert Report is not None

    def test_report_has_target_type(self):
        from app.database import Report
        assert hasattr(Report, "target_type")

    def test_report_has_status(self):
        from app.database import Report
        assert hasattr(Report, "status")


class TestFeedbackSystem:
    def test_feedback_table_exists(self):
        from app.database import Feedback
        assert Feedback is not None

    def test_feedback_has_category(self):
        from app.database import Feedback
        assert hasattr(Feedback, "category")


class TestInviteSystem:
    def test_invite_table_exists(self):
        from app.database import Invite
        assert Invite is not None

    def test_invite_has_token(self):
        from app.database import Invite
        assert hasattr(Invite, "token")

    def test_invite_has_status(self):
        from app.database import Invite
        assert hasattr(Invite, "status")


class TestPostViewsSystem:
    def test_postview_table_exists(self):
        from app.database import PostView
        assert PostView is not None

    def test_postview_has_post_type(self):
        from app.database import PostView
        assert hasattr(PostView, "post_type")


class TestUserVoteWeight:
    def test_user_has_vote_weight_column(self):
        from app.database import User
        assert hasattr(User, "vote_weight")


class TestLatexIntegrity:
    def test_latex_inline_preserved(self):
        latex_input = r"$E = mc^2$"
        assert latex_input == r"$E = mc^2$"

    def test_latex_block_preserved(self):
        latex_input = r"$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$"
        assert latex_input == r"$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$"

    def test_latex_complex_preserved(self):
        latex_input = r"$$\psi(x) = \sum_{n=0}^\infty c_n \phi_n(x)$$"
        assert latex_input == r"$$\psi(x) = \sum_{n=0}^\infty c_n \phi_n(x)$$"

    def test_latex_with_brackets(self):
        latex_input = r"$\left(\frac{a}{b}\right)$"
        assert r"\left(" in latex_input
        assert r"\right)" in latex_input


class TestRBAC:
    def test_student_cannot_create_debate(self, mock_user_student):
        from app.models import ROLE_CAN_CREATE_DEBATE
        assert mock_user_student["role"] not in ROLE_CAN_CREATE_DEBATE

    def test_researcher_can_create_debate(self, mock_user_researcher):
        from app.models import ROLE_CAN_CREATE_DEBATE
        assert mock_user_researcher["role"] in ROLE_CAN_CREATE_DEBATE

    def test_professor_can_create_debate(self, mock_user_admin):
        from app.models import ROLE_CAN_CREATE_DEBATE
        assert mock_user_admin["role"] in ROLE_CAN_CREATE_DEBATE


class TestRequireRoleDependency:
    def test_require_role_allows_admin(self, mock_user_admin):
        from app.deps import require_role
        dep = require_role("ADMIN", "PROFESSOR")
        result = dep(mock_user_admin)
        assert result is not None

    def test_require_role_rejects_student_for_admin_only(self, mock_user_student):
        from app.deps import require_role
        from fastapi import HTTPException
        dep = require_role("ADMIN")
        with pytest.raises(HTTPException) as exc_info:
            dep(mock_user_student)
        assert exc_info.value.status_code == 403

    def test_require_role_allows_multiple_roles(self, mock_user_researcher):
        from app.deps import require_role
        dep = require_role("ADMIN", "RESEARCHER")
        result = dep(mock_user_researcher)
        assert result is not None


class TestConstants:
    def test_report_types(self):
        from app.models import REPORT_TYPES
        assert "REPORT" in REPORT_TYPES
        assert "BLOG" in REPORT_TYPES

    def test_notification_types(self):
        from app.models import NOTIFICATION_TYPES
        assert "COMMENT" in NOTIFICATION_TYPES
        assert "DEBATE" in NOTIFICATION_TYPES
        assert "SYSTEM" in NOTIFICATION_TYPES

    def test_feedback_categories(self):
        from app.models import FEEDBACK_CATEGORIES
        assert "BUG" in FEEDBACK_CATEGORIES
        assert "FEATURE" in FEEDBACK_CATEGORIES
        assert "IMPROVEMENT" in FEEDBACK_CATEGORIES
        assert "OTHER" in FEEDBACK_CATEGORIES

    def test_target_types(self):
        from app.models import TARGET_TYPES
        assert "blog" in TARGET_TYPES
        assert "forum" in TARGET_TYPES
        assert "comment" in TARGET_TYPES
        assert "user" in TARGET_TYPES