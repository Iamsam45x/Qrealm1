import re
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.settings import settings


PASSWORD_PATTERN = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
)

ROLE_HIERARCHY = {
    "STUDENT": 1,
    "RESEARCHER": 2,
    "PROFESSOR": 3,
    "ADMIN": 4,
}

ROLE_CAN_CREATE_DEBATE = {"RESEARCHER", "PROFESSOR", "ADMIN"}

VOTE_WEIGHTS = {
    "STUDENT": 1,
    "RESEARCHER": 2,
    "PROFESSOR": 3,
}

REPORT_TYPES = ("REPORT", "BLOG")

NOTIFICATION_TYPES = ("COMMENT", "DEBATE", "SYSTEM", "REPORT")

FEEDBACK_CATEGORIES = ("BUG", "FEATURE", "IMPROVEMENT", "OTHER")

INVITE_ROLES = ("STUDENT", "RESEARCHER")

TARGET_TYPES = ("blog", "forum", "comment", "user")

LEARNING_INTERACTION_TYPES = ("ERROR_REPORT", "DOUBT")

LEARNING_INTERACTION_CLASSIFICATIONS = ("VALID_ERROR", "INVALID_ERROR", "DOUBT_PLATFORM", "DOUBT_EXTERNAL", "MISCONCEPTION", "AMBIGUOUS")

LEARNING_RESPONSE_TYPES = ("ACKNOWLEDGE", "EXPLAIN", "CLARIFY", "RECONCILE", "CORRECT")


def convert_camel_to_snake(data: Any) -> Any:
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            snake_key = ''.join(['_' + c.lower() if c.isupper() else c for c in key])
            snake_key = snake_key.lstrip('_')
            result[snake_key] = convert_camel_to_snake(value)
        return result
    elif isinstance(data, list):
        return [convert_camel_to_snake(item) for item in data]
    return data


class StudentFields(BaseModel):
    institution: str = Field(..., min_length=1, max_length=200)
    course: str = Field(..., min_length=1, max_length=200)
    year_of_study: str = Field(..., min_length=1, max_length=10)
    student_id: Optional[str] = Field(None, max_length=50)


class ResearcherFields(BaseModel):
    institution: str = Field(..., min_length=1, max_length=200)
    field_of_research: str = Field(..., min_length=1, max_length=200)
    years_of_experience: int = Field(..., ge=0, le=50)
    research_profile: Optional[str] = Field(None, max_length=500)


class RegisterInput(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    user_type: str = Field(..., pattern=r"^(STUDENT|RESEARCHER)$")
    bio: Optional[str] = Field(None, max_length=500)
    student_fields: Optional[Dict[str, Any]] = None
    researcher_fields: Optional[Dict[str, Any]] = None

    @model_validator(mode="before")
    @classmethod
    def convert_camel_case(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return convert_camel_to_snake(data)
        return data

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^[a-zA-Z\s'-]+$", v):
            raise ValueError("Name must contain only letters, spaces, hyphens, and apostrophes")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not PASSWORD_PATTERN.match(v):
            raise ValueError(
                "Password must contain at least 8 characters, one uppercase, "
                "one lowercase, one number, and one special character"
            )
        return v

    def get_student_fields(self) -> Optional[StudentFields]:
        if self.student_fields:
            return StudentFields(**self.student_fields)
        return None

    def get_researcher_fields(self) -> Optional[ResearcherFields]:
        if self.researcher_fields:
            return ResearcherFields(**self.researcher_fields)
        return None


class RegisterWithVerificationInput(RegisterInput):
    pass


class FirebaseRegisterInput(BaseModel):
    firebase_uid: str = Field(..., min_length=1, max_length=128)
    name: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    user_type: str = Field(..., pattern=r"^(STUDENT|RESEARCHER)$")
    bio: Optional[str] = Field(None, max_length=500)
    student_fields: Optional[Dict[str, Any]] = None
    researcher_fields: Optional[Dict[str, Any]] = None

    @model_validator(mode="before")
    @classmethod
    def convert_camel_case(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return convert_camel_to_snake(data)
        return data

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^[a-zA-Z\s'-]+$", v):
            raise ValueError("Name must contain only letters, spaces, hyphens, and apostrophes")
        return v

    def get_student_fields(self) -> Optional[StudentFields]:
        if self.student_fields:
            return StudentFields(**self.student_fields)
        return None

    def get_researcher_fields(self) -> Optional[ResearcherFields]:
        if self.researcher_fields:
            return ResearcherFields(**self.researcher_fields)
        return None


class LoginInput(BaseModel):
    email: EmailStr
    password: str
    remember: bool = False


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not PASSWORD_PATTERN.match(v):
            raise ValueError(
                "Password must contain at least 8 characters, one uppercase, "
                "one lowercase, one number, and one special character"
            )
        return v

    @field_validator("confirm_password")
    @classmethod
    def validate_password_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class ChangePasswordInput(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not PASSWORD_PATTERN.match(v):
            raise ValueError(
                "Password must contain at least 8 characters, one uppercase, "
                "one lowercase, one number, and one special character"
            )
        return v

    @field_validator("confirm_password")
    @classmethod
    def validate_password_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class BlogCreateInput(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=10)
    published: bool = False


class BlogUpdateInput(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    content: Optional[str] = Field(None, min_length=10)
    published: Optional[bool] = None


class ForumCreateInput(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=10)


class CommentCreateInput(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    blog_id: Optional[str] = None
    forum_id: Optional[str] = None
    parent_id: Optional[str] = None


class UploadSignedInput(BaseModel):
    filename: str
    content_type: str = Field(..., pattern=r"^image/(\w+)$")


class DebateCreateInput(BaseModel):
    blog_a_id: str = Field(..., min_length=1, max_length=36)
    blog_b_id: str = Field(..., min_length=1, max_length=36)
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)


class DebateVoteInput(BaseModel):
    vote: str = Field(..., pattern=r"^[AB]$")


class NotificationCreateInput(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    link: Optional[str] = Field(None, max_length=255)
    notification_type: str = Field(..., pattern=r"^(COMMENT|DEBATE|SYSTEM|REPORT)$")


class ReportCreateInput(BaseModel):
    target_type: str = Field(..., pattern=r"^(blog|forum|comment|user)$")
    target_id: str = Field(..., min_length=1, max_length=36)
    reason: str = Field(..., min_length=1, max_length=1000)

    @model_validator(mode="before")
    @classmethod
    def convert_camel_case(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return convert_camel_to_snake(data)
        return data


class FeedbackCreateInput(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    category: Optional[str] = Field(None, pattern=r"^(BUG|FEATURE|IMPROVEMENT|OTHER)$")


class LearningInteractionCreateInput(BaseModel):
    target_type: str = Field(..., pattern=r"^(blog|forum|question|practice)$")
    target_id: str = Field(..., min_length=1, max_length=36)
    interaction_type: str = Field(..., pattern=r"^(ERROR_REPORT|DOUBT)$")
    content: str = Field(..., min_length=1, max_length=3000)
    context: Optional[str] = Field(None, max_length=1000)

    @model_validator(mode="before")
    @classmethod
    def convert_camel_case(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return convert_camel_to_snake(data)
        return data


class LearningInteractionResponseInput(BaseModel):
    response_type: str = Field(..., pattern=r"^(ACKNOWLEDGE|EXPLAIN|CLARIFY|RECONCILE|CORRECT)$")
    content: str = Field(..., min_length=1, max_length=3000)

    @model_validator(mode="before")
    @classmethod
    def convert_camel_case(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return convert_camel_to_snake(data)
        return data


class InviteCreateInput(BaseModel):
    email: EmailStr
    role: str = Field("STUDENT", pattern=r"^(STUDENT|RESEARCHER)$")


class InviteAcceptInput(BaseModel):
    token: str
    name: str = Field(..., min_length=3, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    student_fields: Optional[Dict[str, Any]] = None
    researcher_fields: Optional[Dict[str, Any]] = None


class SearchInput(BaseModel):
    q: str = Field(..., min_length=1, max_length=200)
    type: Optional[str] = Field(None, pattern=r"^(blog|forum)$")
    limit: int = Field(20, ge=1, le=100)
    cursor: Optional[str] = Field(None, max_length=36)


SMTP_HOST = settings.SMTP_HOST
SMTP_PORT = settings.SMTP_PORT
SMTP_USER = settings.SMTP_USER
SMTP_PASSWORD = settings.SMTP_PASSWORD
SMTP_FROM = settings.SMTP_FROM or settings.SMTP_USER
FROM_NAME = settings.SMTP_FROM_NAME


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f"[EMAIL] SMTP not configured. Would send to {to_email}: {subject}")
        return True
    
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{FROM_NAME} <{SMTP_FROM}>"
        msg["To"] = to_email
        
        html_part = MIMEText(html_body, "html")
        msg.attach(html_part)
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [to_email], msg.as_string())
        
        return True
    except Exception as e:
        print(f"[EMAIL] Failed to send email: {e}")
        return False


def send_welcome_email(email: str, name: str) -> bool:
    subject = "Welcome to QRealm!"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
            .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>QRealm</h1>
            </div>
            <div class="content">
                <h2>Welcome, {name}!</h2>
                <p>Your account has been created successfully. You can now log in and start using QRealm.</p>
                <p>Here's what you can do next:</p>
                <ul>
                    <li>Explore research blogs and discussions</li>
                    <li>Connect with other researchers and students</li>
                    <li>Share your own insights and knowledge</li>
                </ul>
            </div>
            <div class="footer">
                <p>Happy researching!</p>
            </div>
        </div>
    </body>
    </html>
    """
    return send_email(email, subject, html)
