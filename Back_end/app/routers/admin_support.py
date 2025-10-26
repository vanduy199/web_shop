from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.core.config import SessionLocal
from app.models.support import SupportTicketModel
from app.schemas.support import TicketDetailSchema, TicketUpdate, FullTicketDetail,TicketSummary
from app.services.authentication import require_admin 
from app.models.user import User 

router = APIRouter(prefix="/admin/support", tags=["Admin Support"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/tickets", response_model=List[TicketSummary])
def get_tickets_summary(
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    q = db.query(SupportTicketModel)

    if status_filter:
        q = q.filter(SupportTicketModel.status == status_filter)

    tickets = (
        q.options(
            joinedload(SupportTicketModel.requester),  
        )
        .order_by(SupportTicketModel.created_at.desc())
        .all()
    )

    out: List[TicketSummary] = []
    for t in tickets:
        out.append(
            TicketSummary(
                id=t.id,
                created_at=t.created_at,
                requester_name=getattr(t, "requester_name", None),
                requester_email=getattr(t, "requester_email", None),
                status=t.status,
                priority=t.priority,
            )
        )
    return out


# ------------------------------- DETAIL (FULL) --------------------------------
@router.get("/tickets/{ticket_id}", response_model=FullTicketDetail)
def get_ticket_detail(
    ticket_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    ticket = (
        db.query(SupportTicketModel)
        .options(
            joinedload(SupportTicketModel.requester),
            joinedload(SupportTicketModel.messages),
        )
        .filter(SupportTicketModel.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy ticket.")

    msgs = ticket.messages
    return FullTicketDetail(
        detail=TicketDetailSchema.model_validate(ticket),
        messages=[m.message for m in msgs],
        attachment_urls=[m.attachment_url for m in msgs if m.attachment_url],
    )

# ------------------------------ UPDATE STATUS ---------------------------------
@router.patch("/tickets/{ticket_id}/status", response_model=FullTicketDetail)
def update_ticket_status_admin(
    ticket_id: int,
    payload: TicketUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    if payload.status is None and payload.priority is None:
        raise HTTPException(status_code=400, detail="Phải truyền ít nhất 'status' hoặc 'priority'.")
        
    ticket = (
        db.query(SupportTicketModel)
        .options(
            joinedload(SupportTicketModel.messages),
            joinedload(SupportTicketModel.requester),
        )
        .filter(SupportTicketModel.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy ticket.")

    if payload.status is not None:
        ticket.status = payload.status
    if payload.priority is not None:
        ticket.priority = payload.priority

    if ticket.assigned_to_id is None:
        ticket.assigned_to_id = admin_user.id

    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    msgs = ticket.messages
    return FullTicketDetail(
        detail=TicketDetailSchema.model_validate(ticket),
        messages=[m.message for m in msgs],
        attachment_urls=[m.attachment_url for m in msgs if m.attachment_url],
    )