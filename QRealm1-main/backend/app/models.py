from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterInput(BaseModel):
  name: str
  email: EmailStr
  password: str = Field(min_length=6)
  role: Optional[str] = None
  bio: Optional[str] = None


class LoginInput(BaseModel):
  email: EmailStr
  password: str


class BlogCreateInput(BaseModel):
  title: str
  content: str
  published: Optional[bool] = False


class BlogUpdateInput(BaseModel):
  title: Optional[str] = None
  content: Optional[str] = None
  published: Optional[bool] = None


class ForumCreateInput(BaseModel):
  title: str
  content: str


class CommentCreateInput(BaseModel):
  content: str
  parentId: Optional[str] = None


class UploadSignedInput(BaseModel):
  folder: Optional[str] = None
