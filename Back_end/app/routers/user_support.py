from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File, status, Request
from sqlalchemy.orm import Session
from typing import Optional
import uuid, os

from app.core.config import SessionLocal
from app.models.support import SupportTicketModel, SupportMessageModel
from app.models.user import User
from app.schemas.support import SupportTicketResponse
from app.core.security import decode_access_token

router = APIRouter(prefix="/api/support", tags=["User Support"])

DEFAULT_GUEST_ID = 0
UPLOAD_DIR = "app/static/support_files" 

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def save_uploaded_file(file: Optional[UploadFile]) -> Optional[str]:
    if not file or not file.filename:
        return None
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1]
    unique_name = f"ticket_{uuid.uuid4().hex}.{ext}"
    abs_path = os.path.join(UPLOAD_DIR, unique_name)
    # ghi file
    with open(abs_path, "wb") as f:
        f.write(await file.read())
    return f"/static/support_files/{unique_name}"

# --- API GỬI YÊU CẦU HỖ TRỢ ---
@router.post(
    "/submit",
    status_code=status.HTTP_201_CREATED,
    response_model=SupportTicketResponse
)
async def submit_support_request(
    request: Request,
    support_name: str = Form(..., alias="support-name"),
    support_email: str = Form(..., alias="support-email"),
    support_type: str = Form(..., alias="support-type"),
    support_desc: str = Form(..., alias="support-desc"),
    support_phone: Optional[str] = Form(None, alias="support-phone"),
    support_file: Optional[UploadFile] = File(None, alias="support-file"),
    db: Session = Depends(get_db),
):
    user_id = DEFAULT_GUEST_ID
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        payload = decode_access_token(token)
        if payload and payload.get("sub") is not None:
            try:
                user_id = int(payload.get("sub"))
            except Exception:
                user_id = DEFAULT_GUEST_ID

    # Lưu file và tạo URL
    rel_path = await save_uploaded_file(support_file)  
    base_url = str(request.base_url).rstrip("/")      
    attachment_url = f"{base_url}{rel_path}" if rel_path else None

    # 1) Tạo ticket trước để có ticket_id
    subject_line = f"[{support_type}] Yêu cầu từ {support_name}"
    new_ticket = SupportTicketModel(
        user_id=user_id,
        subject=subject_line,
        issue_type=support_type,
        status="New",
        assigned_to_id=0,
        priority="Medium",
        requester_name=support_name,
        requester_email=support_email,
        requester_phone=support_phone,
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    new_message = SupportMessageModel(
        ticket_id=new_ticket.id,
        sender_id=user_id,
        sender_type="Customer",
        message=support_desc,
        attachment_url=attachment_url,
    )
   
    db.add(new_message)
    db.commit()
    db.refresh(new_message)

    new_ticket.first_message_id = new_message.id
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    return SupportTicketResponse(
        message="🎫 Yêu cầu của bạn đã được ghi nhận thành công!",
    )
