# app/services/product_service.py
import unicodedata
import re
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException, Query
from app.models.product import Product, ProductImage, Specification, Abs
from app.schemas.product import (
    ProductSchema, AddProductSchema, AttributeSchema,
    ImagesSchema, PromotionSchema, AbsProduct, OutPutAbs, ProductSearchResult, OutPutPage
)

# --- KHAI BÁO HẰNG SỐ VÀ HÀM PHÂN TÍCH SEARCH ---
import unicodedata
import re
DEVICE_SLUGS = ["phone", "laptop", "tablet"] 
KNOWN_CATEGORIES = {
    "dien thoai": "phone", "may tinh bang": "tablet", "laptop": "laptop",
    "pin du phong": "pinduphong", "cap sac": "capsac", "tai nghe": "tainghe"
}

def normalize_search_term(query: str) -> str:
    """Chuẩn hóa chuỗi tìm kiếm: hạ chữ, bỏ dấu, và thay thế từ viết tắt."""
    text = query.lower().strip()
    
    # 1. Bỏ dấu tiếng Việt
    text = unicodedata.normalize('NFD', text)
    text = re.sub(r'[\u0300-\u036f]', '', text)
    text = text.replace('đ', 'd')
    
    # 2. Thay thế Từ viết tắt phổ biến
    replacements = {
        r'\bdt\b': 'dien thoai', 
        r'\blt\b': 'laptop',
        r'\bss\b': 'samsung',
        r'\bip\b': 'iphone',
        r'\bpin dp\b': 'pin du phong'
    }
    for old, new in replacements.items():
        text = re.sub(old, new, text)
        
    # Loại bỏ ký tự đặc biệt, nhưng giữ lại '/','-', '.' và '+' 
    text = re.sub(r'[^a-z0-9\s/+-.]', ' ', text)
    
    # Rút gọn khoảng trắng thừa
    return " ".join(text.split())
def parse_query_to_conditions(query: str) -> dict:
    """
    Phân tích truy vấn, trích xuất thông số kỹ thuật (RAM, Pin, Lưu trữ) 
    và ánh xạ ngược thành cụm từ chính xác (Exact Match) và từ khóa mở rộng (Broad Match).
    """
    conditions: Dict[str] = {}
    remaining_query = query
    
    # 1. Tìm và loại bỏ Loại sản phẩm
    conditions['phanloai'] = None
    for cat_name, cat_slug in KNOWN_CATEGORIES.items():
        if re.search(r'\b' + re.escape(cat_name) + r'\b', remaining_query):
            conditions['phanloai'] = cat_slug
            remaining_query = re.sub(r'\b' + re.escape(cat_name) + r'\b', ' ', remaining_query).strip()
            break
            
    text_filter_parts = []
    broad_search_terms = [] 
    

    is_device = conditions['phanloai'] in DEVICE_SLUGS
    

    ram_match = re.search(r'\b(\d+)\s*(gb)?\s*ram\b|\bram\s*(\d+)\s*(gb)?\b', remaining_query)
    if ram_match:
        ram_gb = int(ram_match.group(1) or ram_match.group(3))
        text_filter_parts.append(f'"RAM: {ram_gb} GB"') 
        broad_search_terms.extend([str(ram_gb), "ram", "gb"])
        remaining_query = re.sub(r'\b' + re.escape(ram_match.group(0)) + r'\b', ' ', remaining_query)


    storage_pattern1 = r'\b(\d+)\s*(gb|g)?\s*(dung\s*luong|luu\s*tru|bo\s*nho|storage|rom)\b'

    storage_pattern2 = r'\b(dung\s*luong|luu\s*tru|bo\s*nho|storage|rom)\s*(\d+)\s*(gb|g)?\b'
    
    storage_match = re.search(storage_pattern1, remaining_query) or re.search(storage_pattern2, remaining_query)
    
    if storage_match:
        if re.search(storage_pattern1, remaining_query):
            # Pattern 1: group(1) chứa số
            storage_gb = int(storage_match.group(1))
        else:
            # Pattern 2: group(2) chứa số
            storage_gb = int(storage_match.group(2))
            
        text_filter_parts.append(f'"Dung lượng lưu trữ: {storage_gb} GB"')
        broad_search_terms.extend([str(storage_gb), "bo", "nho", "dung", "luong", "gb"])
        remaining_query = re.sub(r'\b' + re.escape(storage_match.group(0)) + r'\b', ' ', remaining_query)

    pin_match = re.search(r'\b(\d+)\s*(mah)?\s*pin\b|\bpin\s*(\d+)\s*(mah)?\b', remaining_query)
    if pin_match:
        pin_mah = int(pin_match.group(1) or pin_match.group(3))
        text_filter_parts.append(f'"Dung lượng pin: {pin_mah} mAh"')
        broad_search_terms.extend([str(pin_mah), "mah", "pin"])
        remaining_query = re.sub(r'\b' + re.escape(pin_match.group(0)) + r'\b', ' ', remaining_query)

    cleaned_text_search = " ".join(remaining_query.split())
    broad_search_terms.extend(cleaned_text_search.split())
    

    unique_broad_terms = set(broad_search_terms)
    

    exact_terms_sql = [f'{term}' for term in text_filter_parts] 
    

    broad_terms_sql = [
        f'{word}' 
        for word in unique_broad_terms 
        if len(word) > 1 and word.isalnum()
    ]
    
    final_text_search_query = " ".join(exact_terms_sql + broad_terms_sql)

    if final_text_search_query:
        conditions['text_search'] = final_text_search_query
        
    return conditions

# -------------------- LOGIC NGHIỆP VỤ & DB (CRUD) --------------------

def get_products(db: Session, type: Optional[str] = None) -> List[Product]:
    if type:
        return db.query(Product).filter(Product.phanloai == type).all()
    else:
        return db.query(Product).all()

def get_product_detail_by_id(db: Session, product_id: int) -> AddProductSchema | None:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return None

    # Lấy specifications
    attrs = db.query(Specification).filter(Specification.product_id == product_id).all()
    attributes = [
        AttributeSchema(key=attr.spec, value=attr.info, loai_cau_hinh=attr.loai_cau_hinh)
        for attr in attrs
    ]
    # Lấy images
    imgs = db.query(ProductImage.img).filter(ProductImage.product_id == product_id).all()
    images = [ImagesSchema(img=img.img) for img in imgs]

    # Lấy promotion
    now = datetime.now()
    present_abs = db.query(Abs).filter(
        Abs.start_time <= now, Abs.end_time >= now, Abs.product_id == product_id
    ).first()

    promotion = None
    if present_abs:
        promotion = PromotionSchema(
            percent_abs=present_abs.percent_abs, start_time=present_abs.start_time, end_time=present_abs.end_time
        )

    return AddProductSchema(
        name=product.name, phanloai=product.phanloai, price=product.price,
        thumb=product.thumb, main_image=product.main_image, brand=product.brand,
        release_date=product.release_date, attributes=attributes, images=images, promotion=promotion
    )

def add_product(db: Session, product: AddProductSchema) -> Dict[str, str]:
    prod = db.query(Product).filter(Product.name == product.name).first()
    if prod:
        raise HTTPException(404, detail="Product already exists") # Giữ HTTPException trong service để dễ dàng raise lỗi

    db_product = Product(
        name=product.name, phanloai=product.phanloai, price=product.price,
        thumb=product.thumb, main_image=product.main_image, brand=product.brand,
        release_date=product.release_date,
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    for attr in product.attributes:
        db_attr = Specification(
            spec=attr.key, info=attr.value, loai_cau_hinh=attr.loai_cau_hinh, product_id=db_product.id
        )
        db.add(db_attr)
    
    for img in product.images:
        db_img = ProductImage(product_id=db_product.id, img=img.img)
        db.add(db_img)

    pro = product.promotion
    if pro:
        db_promo = Abs(
            product_id=db_product.id, percent_abs=pro.percent_abs,
            start_time=pro.start_time, end_time=pro.end_time
        )
        db.add(db_promo)
    
    db.commit()
    return {"message": "Product is added"}

def update_product(db: Session, product_id: int, payload: AddProductSchema) -> Dict[str, Any]:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.name = payload.name
    product.phanloai = payload.phanloai
    product.price = payload.price
    product.brand = payload.brand
    product.release_date = payload.release_date
    product.thumb = payload.thumb
    product.main_image = payload.main_image

    db.query(Specification).filter(Specification.product_id == product_id).delete()
    for attr in payload.attributes:
        spec = Specification(product_id=product_id, spec=attr.key, info=attr.value, loai_cau_hinh=attr.loai_cau_hinh)
        db.add(spec)

    db.query(ProductImage).filter(ProductImage.product_id == product_id).delete()
    for img in payload.images:
        image = ProductImage(product_id=product_id, img=img.img)
        db.add(image)

    db.query(Abs).filter(Abs.product_id == product_id).delete()
    if payload.promotion:
        promo = Abs(
            product_id=product_id, percent_abs=payload.promotion.percent_abs,
            start_time=payload.promotion.start_time, end_time=payload.promotion.end_time
        )
        db.add(promo)

    db.commit()
    db.refresh(product)
    return {"message": "Product updated successfully", "product": product}

def delete_product(db: Session, product_id: int) -> Dict[str, str]:
    product_c = db.query(Product).filter(Product.id == product_id).first()
    if product_c:
        db.delete(product_c)
        db.commit()
        return {"message": "Product was deleted"}
    raise HTTPException(404, "Product not found")

def push_abs(db: Session, abs_data: AbsProduct) -> Abs:
    newabs = Abs(**abs_data.model_dump())
    now = datetime.now()

    existabs = db.query(Abs).filter(
        Abs.start_time <= now, Abs.end_time >= now, Abs.product_id == newabs.product_id
    ).first()
    if existabs:
        raise HTTPException(400, "Product is existed in another Abs")

    db.add(newabs)
    db.commit()
    db.refresh(newabs)
    return newabs

def get_abs(db: Session, type: Optional[str] = None, page: int = 1, limit: int = 20,brand: Optional[str] = None, show_abs: bool = False,price: Optional[int] = None,sort_price: Optional[str] = None) -> OutPutPage:
    now = datetime.now()
    present_abs = (
        db.query(Product, Abs)
        .outerjoin(
            Abs,
            (Abs.product_id == Product.id) & (Abs.start_time <= now) & (Abs.end_time >= now)
        )
    )

    if type == "phukien":
        present_abs = present_abs.filter(~Product.phanloai.in_(["phone", "laptop", "tablet"]))
    elif type:
        present_abs = present_abs.filter(Product.phanloai == type)

    if price == 1:
        present_abs = present_abs.filter(Product.price < 10000000)
    elif price == 2:
        present_abs = present_abs.filter(Product.price >= 10000000,Product.price < 20000000)
    elif price == 3:
        present_abs = present_abs.filter(Product.price >= 20000000)

    if brand:
        present_abs = present_abs.filter(Product.brand == brand)

    if sort_price == "asc":
        present_abs = present_abs.order_by(Product.price.asc())
    elif sort_price == "desc":
        present_abs = present_abs.order_by(Product.price.desc())

    length = present_abs.count()

    if not show_abs:
        present_abs = present_abs.offset((page - 1) * limit).limit(limit)
        pageView = []
        for product_obj, abs_obj in present_abs.all():
            if product_obj.phanloai == "laptop" and "(" in product_obj.name:
                product_obj.name = product_obj.name.split("(")[0]

            pageView.append(
                OutPutAbs(
                    id=product_obj.id, name=product_obj.name, price=product_obj.price,
                    thumb=product_obj.thumb, main_image=product_obj.main_image, phanloai=product_obj.phanloai,
                    brand=product_obj.brand, release_date=product_obj.release_date,
                    percent_abs=abs_obj.percent_abs if abs_obj else 0,
                    start_time=abs_obj.start_time if abs_obj else None, end_time=abs_obj.end_time if abs_obj else None,
                )
            )
        result = OutPutPage(
            show_product=pageView,
            remainingQuantity= max(0,length - page*limit) 
        )
        return result
    else:
        pageView = []
        for product_obj, abs_obj in present_abs.all():
            if product_obj.phanloai == "laptop" and "(" in product_obj.name:
                product_obj.name = product_obj.name.split("(")[0]

            pageView.append(
                OutPutAbs(
                    id=product_obj.id, name=product_obj.name, price=product_obj.price,
                    thumb=product_obj.thumb, main_image=product_obj.main_image, phanloai=product_obj.phanloai,
                    brand=product_obj.brand, release_date=product_obj.release_date,
                    percent_abs=abs_obj.percent_abs if abs_obj else 0,
                    start_time=abs_obj.start_time if abs_obj else None, end_time=abs_obj.end_time if abs_obj else None,
                )
            )
        result = OutPutPage(
            show_product=pageView,
            remainingQuantity= 0
        )
        return result

def smart_search_products(
    db: Session, 
    q: str       
) -> List[Tuple]: 

    normalized_q = normalize_search_term(q)
    
        
    conditions = parse_query_to_conditions(normalized_q)
    
    where_clauses = []
    params: Dict[str, Any] = {} 
    
    if conditions.get('phanloai'):
        where_clauses.append("phanloai = :phanloai")
        params['phanloai'] = conditions['phanloai']
        

    final_text_query = conditions.get('text_search', '')

    score_clause = "0 AS relevance_score"
    order_by_clause = "ORDER BY id DESC"
    
    if final_text_query:
        params['text_query'] = final_text_query 

        fulltext_match_clause = "MATCH(name, phanloai_vi, brand, cauhinh_daydu) AGAINST(:text_query IN BOOLEAN MODE)"
        
        where_clauses.append(fulltext_match_clause)
        
        score_clause = f"({fulltext_match_clause}) * 5 AS relevance_score"
        order_by_clause = "ORDER BY relevance_score DESC"
        
    if not where_clauses:
        return []

    where_sql = " AND ".join(where_clauses)

    sql_query = text(f"""
        SELECT 
            id, name, price, phanloai_vi, phanloai, brand, cauhinh_daydu,
            {score_clause}
        FROM product_search
        WHERE {where_sql}
        {order_by_clause}
    """)

    try:
        results = db.execute(sql_query, params).fetchall()
        return results
    except Exception as e:
        print(f"Lỗi truy vấn SQL trong Service: {e}")
        print(f"Truy vấn SQL lỗi: {sql_query.string.strip()}")
        print(f"Tham số: {params}")
        raise e