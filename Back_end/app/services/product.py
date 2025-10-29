# app/services/product_service.py
import unicodedata
import re
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException, Query, UploadFile
from app.models.product import Product, ProductImage, Specification, Abs, Search
from app.schemas.product import (
    ProductSchema, AddProductSchema, AttributeSchema,
    ImagesSchema, PromotionSchema, AbsProduct, OutPutAbs, ProductSearchResult, OutPutPage
)

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

import unicodedata
import re
from difflib import SequenceMatcher

def normalize_vietnamese_string(text: str) -> str:
    text = text.lower().strip()
    text = unicodedata.normalize('NFD', text)
    text = re.sub(r'[\u0300-\u036f]', '', text)
    text = text.replace('đ', 'd')
    return " ".join(text.split())

def fuzzy_brand_match(text: str, threshold: float = 0.6) -> str | None:
    brand_variants = {
            'samsung': ['samsung', 'ss', 'sam sung', 'samsum', 'samsun'],
            'macbook': ['apple', 'iphone', 'macbook', 'mac', 'ip'],
            'ipad' : ['apple', 'iphone', 'ipad', 'ip'],
            'oppo': ['oppo', 'op', 'opo'],
            'vivo': ['vivo', 'vi vo', 'vv'],
            'xiaomi': ['xiaomi', 'mi', 'redmi', 'xiao mi', 'xiomi'],
            'realme': ['realme', 'real me', 'rm'],
            'lenovo': ['lenovo'],
            'anker': ['anker'],
            'xmobile': ['xmobile'],
            'ugreen': ['ugreen'],
            'jbl': ['jbl']
    }
    
    text = normalize_vietnamese_string(text)
    
    # Kiểm tra exact match trước
    for brand, variants in brand_variants.items():
        for variant in variants:
            if variant in text:
                return brand
    
    # Fuzzy matching nếu không có exact match
    best_brand = None
    best_score = 0
    
    for brand, variants in brand_variants.items():
        for variant in variants:
            # Tính similarity score
            score = SequenceMatcher(None, variant, text).ratio()
            if score > threshold and score > best_score:
                best_score = score
                best_brand = brand
    
    return best_brand

def parse_price_string(price_str: str) -> int | None:
    if not price_str: 
        return None
    try:
        text = price_str.lower().strip().replace('.', '').replace(',', '')
        total_value = 0
        if 'tr' in text or 'trieu' in text:
            text = text.replace('trieu', 'tr')
            parts = text.split('tr')
            if parts[0]: 
                total_value += float(parts[0]) * 1_000_000
            if len(parts) > 1 and parts[1]:
                if len(parts[1]) < 3: 
                    total_value += float(parts[1]) * 100_000
                else: 
                    total_value += float(parts[1]) * 1_000
            return int(total_value)
        if 'k' in text:
            value_part = text.replace('k', '').strip()
            return int(float(value_part) * 1_000)
        return int(text)
    except (ValueError, IndexError):
        return None
# 8, 'Samsung Galaxy Z Flip7 5G 12GB/256GB', '27000000.00', 'dien thoai', 'phone', 'Samsung', 12, 256, '4300', 'Bluetooth: v5.4 | Chất liệu: Khung nhôm & Mặt lưng kính cường lực | Chip đồ họa (GPU): Xclipse 950 | Chip xử lý (CPU): Exynos 2500 10 nhân | Chống nước/bụi: IP48 | Cổng kết nối: Type-C | Công nghệ màn hình: Chính: Dynamic AMOLED 2X, Phụ: Super AMOLED | Công nghệ pin: Tiết kiệm pin | Sạc pin nhanh | Sạc không dây | Công suất sạc tối đa: 25 W | Danh bạ: Không giới hạn | Đèn flash camera sau: Có | Định dạng âm thanh: DFF | XMF | WAV | RTX | RTTTL | OTA | OGG | OGA | MXMF | MP3 | Midi | M4A | IMY | FLAC | DSF | AWB | APE | AMR | AAC | 3GA | Định dạng video: WEBM | MP4 | MKV | M4V | FLV | AVI | 3GP | 3G2 | Độ phân giải camera sau: Chính 50 MP & Phụ 12 MP | Độ phân giải camera trước: 10 MP | Độ phân giải màn hình: Chính: Full HD+ (1080 x 2520 Pixels) & Phụ: 948 x 1048 Pixels | Độ sáng tối đa: 2600 nits | Dung lượng khả dụng: 223.8 GB | Dung lượng lưu trữ: 256 GB | Dung lượng pin: 4300 mAh | Ghi âm: Ghi âm mặc định | Ghi âm cuộc gọi | GPS: QZSS | GPS | GLONASS | GALILEO | BEIDOU | Hệ điều hành: Android 16 | Jack tai nghe: Type-C | Kết nối khác: OTG | NFC | Kích thước & Trọng lượng: Dài 166.7 (khi mở) | 85.5 mm (khi gập) - Ngang 75.2 mm - Dày 6.5 mm (khi mở) | 13.7 mm (khi gập) - Nặng 188g | Kích thước màn hình: Chính 6.9 | Kính bảo vệ màn hình: Kính cường lực Corning Gorilla Glass Victus 2 | Loại pin: Li-Ion | Mạng di động: Hỗ trợ 5G | Quay video camera sau: FullHD 1080p@240fps | FullHD 1080p@120fps | 4K 2160p@60fps | RAM: 12 GB | SIM: 1 Nano SIM + 1 eSIM hoặc 2 eSIM | Thiết kế: Nguyên khối | Tính năng bảo mật: Mở khoá vân tay cạnh viền | Mở khoá khuôn mặt | Tính năng camera sau: Xóa phông | Tự động lấy nét (AF) | Toàn cảnh (Panorama) | Quay chậm (Slow Motion) | Làm đẹp | HDR | Góc siêu rộng (Ultrawide) | Chống rung quang học (OIS) | Chọn ảnh chân dung đẹp nhất (Best Face) | Ban đêm (Night Mode) | Audio zoom | Tính năng camera trước: Xóa phông | Làm đẹp | Chọn ảnh chân dung đẹp nhất (Best Face) | Tính năng đặc biệt: Vision Booster | Trợ lý ảo Google Gemini | Samsung DeX (Kết nối màn hình sử dụng giao diện tương tự PC) | Now Brief | Khoanh tròn để tìm kiếm | Audio Eraser | Tốc độ CPU: 3.3 GHz | Wi-Fi: Wi-Fi MIMO | Wi-Fi hotspot | Wi-Fi Display | Wi-Fi 7 | Dual-band (2.4 GHz/5 GHz) | 6 GHz'
# s24 : điện thoại samsung
def parse_master_query(query: str) -> dict:
    conditions = {}
    q = normalize_vietnamese_string(query)
    original_q = q
    
    phanloai = r'(dien thoai|laptop|may tinh bang|cap sac|tai nghe|du phong|flycam|tablet)'
    type_match = re.search(phanloai, q)
    if type_match:
        conditions['phanloai'] = type_match.group(1)
        q = re.sub(phanloai, '', q).strip()

    brand = fuzzy_brand_match(original_q)
    if brand:
        conditions['brand'] = brand
        brand_variants = {
            'samsung': ['samsung', 'ss', 'sam sung', 'samsum', 'samsun'],
            'macbook': ['apple', 'iphone', 'macbook', 'mac', 'ip'],
            'ipad' : ['apple', 'iphone', 'ipad', 'ip'],
            'oppo': ['oppo', 'op', 'opo'],
            'vivo': ['vivo', 'vi vo', 'vv'],
            'xiaomi': ['xiaomi', 'mi', 'redmi', 'xiao mi', 'xiomi'],
            'realme': ['realme', 'real me', 'rm'],
            'lenovo': ['lenovo'],
            'anker': ['anker'],
            'xmobile': ['xmobile'],
            'ugreen': ['ugreen'],
            'jbl': ['jbl']
        }
        
        if brand in brand_variants:
            for variant in brand_variants[brand]:
                q = re.sub(rf'\b{re.escape(variant)}\b', '', q, flags=re.IGNORECASE).strip()


    price_patterns = {
        'price_lte': r'(duoi|toi da|max)\s*([0-9,.\s]+(?:tr|trieu|k)?)',
        'price_gte': r'(tren|tu|min)\s*([0-9,.\s]+(?:tr|trieu|k)?)',
        'price_exact': r'(?:gia|)\s*([0-9,.\s]+)\s*(tr|trieu|k)\b(?!\s*(?:duoi|tren|tu|min|toi da|max))'
    }
    
    for key, pattern in price_patterns.items():
        match = re.search(pattern, q)
        if match:
            if key == 'price_exact':
                price_str = match.group(1) + match.group(2)
                price_val = parse_price_string(price_str)
            else:
                price_val = parse_price_string(match.group(2))
            
            if price_val is not None: 
                conditions[key] = price_val
                q = re.sub(pattern, '', q).strip()
                
    # hoa hoang
    ram_pattern = r'\b(\d+)\s*(?:g|gb)?\s*ram\b|\bram\s*(\d+)\s*(?:g|gb)\b'
    ram_match = re.search(ram_pattern, q)
    if ram_match:
        for group in ram_match.groups():
            if group and group.isdigit():
                conditions['ram_gb'] = int(group)
                break
        q = re.sub(ram_pattern, '', q).strip()
    
    storage_patterns = [
        r'(\d+)\s*(?:g|gb)\s*(?:bo nho|luu tru)\b',
        r'\b(?:bo nho|luu tru)\s*(\d+)\s*(?:g|gb)\b'
    ]
    
    for pattern in storage_patterns:
        storage_match = re.search(pattern, q)
        if storage_match:
            conditions['storage_gb'] = int(storage_match.group(1))
            q = re.sub(pattern, '', q).strip()
            break
    
    # Xử lý số GB còn lại
    if 'storage_gb' not in conditions:
        remaining_gb = re.search(r'\b(\d+)\s*(?:g|gb)\b', q)
        if remaining_gb:
            gb_value = int(remaining_gb.group(1))
            if gb_value >= 32:
                conditions['storage_gb'] = gb_value
                q = re.sub(r'\b(\d+)\s*(?:g|gb)\b', '', q, count=1).strip()
    
    #fullindex
    # Text search cho phần còn lại
    q_clean = re.sub(r'\s+', ' ', q).strip()
    if q_clean:
        conditions['text_search'] = q_clean
        
    return conditions

def ultimate_search_products( db: Session,q: str, page: int = 1, limit: int = 20,brand: Optional[str] = None,sort_price: Optional[str] = None):
    conditions = parse_master_query(q)
    search_query = db.query(Search) 
    len = search_query.count()
    if 'price_exact' in conditions:
        pc = conditions['price_exact'] * 0.1
        search_query = search_query.filter((Search.price >= conditions['price_exact'] - pc) & (Search.price <= conditions['price_exact'] + pc))
    if 'price_lte' in conditions:
        search_query = search_query.filter(Search.price <= conditions['price_lte'])
    if 'price_gte' in conditions:
        search_query = search_query.filter(Search.price >= conditions['price_gte'])
    if 'phanloai' in conditions:
        search_query = search_query.filter(Search.phanloai_vi == conditions['phanloai'])
    if 'brand' in conditions:
        search_query = search_query.filter(Search.brand == conditions['brand'])
    if 'ram_gb' in conditions:
        search_query = search_query.filter(Search.ram == conditions['ram_gb'])
    if 'storage_gb' in conditions:
        search_query = search_query.filter(Search.bonho == conditions['storage_gb'])  
    
    if 'text_search' in conditions:
        search_text = f"%{conditions['text_search']}%"
        search_query = search_query.filter(Search.name.ilike(search_text))
    search_subquery = search_query.with_entities(Search.id).subquery()
    now = datetime.now()
    present_abs = (
        db.query(Product, Abs)
        .outerjoin(
            Abs,
            (Abs.product_id == Product.id) & (Abs.start_time <= now) & (Abs.end_time >= now)
        )
        .filter(Product.id.in_(search_subquery))
    )

    if brand:
        present_abs = present_abs.filter(Product.brand == brand)

    if sort_price == "asc":
        present_abs = present_abs.order_by(Product.price.asc())
    elif sort_price == "desc":
        present_abs = present_abs.order_by(Product.price.desc())

    length = present_abs.count()
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
    return (length, result)


import pickle
import numpy as np
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity

MODELS_DIR = Path(__file__).resolve().parent.parent / "models" / "recommendation"

try:
    with open(MODELS_DIR / "similarity_matrix_v2.pkl", 'rb') as f:
        similarity_matrix = pickle.load(f)
    with open(MODELS_DIR / "scaler_v2.pkl", 'rb') as f:
        scaler = pickle.load(f)
except Exception as e:
    similarity_matrix = None
    scaler = None

def get_product_recommendations(db: Session, product_id: int, top_n: int = 5) -> List[OutPutAbs] | None:
    if similarity_matrix is None:
        return None
    
    try:
        base_product = db.query(Product).filter(Product.id == product_id).first()
        if not base_product:
            return None
        
        # Lấy tất cả sản phẩm để tạo mapping
        all_products = db.query(Product).all()
        if not all_products:
            return None
        
        # Tạo mapping id -> index
        product_id_to_idx = {p.id: idx for idx, p in enumerate(all_products)}
        
        if product_id not in product_id_to_idx:
            return None
        
        # Lấy index của sản phẩm
        product_idx = product_id_to_idx[product_id]
        
        # Lấy similarity scores
        similarities = similarity_matrix[product_idx]
        # lấy giá trị similarity trên ma trận đấy 
        # Lấy top similar products (bỏ chính nó)
        top_indices = np.argsort(similarities)[::-1][1:top_n+1]
        
        # Lấy thông tin sản phẩm recommend
        now = datetime.now()
        recommendations = []
        
        for idx in top_indices:
            recommended_product = all_products[idx]
            promotion = db.query(Abs).filter(
                Abs.product_id == recommended_product.id,
                Abs.start_time <= now,
                Abs.end_time >= now
            ).first()
            
            product_name = recommended_product.name
            if recommended_product.phanloai == "laptop" and "(" in product_name:
                product_name = product_name.split("(")[0]
            
            recommendations.append(
                OutPutAbs(
                    id=recommended_product.id,
                    name=product_name,
                    price=recommended_product.price,
                    thumb=recommended_product.thumb,
                    main_image=recommended_product.main_image,
                    phanloai=recommended_product.phanloai,
                    brand=recommended_product.brand,
                    release_date=recommended_product.release_date,
                    percent_abs=promotion.percent_abs if promotion else 0,
                    start_time=promotion.start_time if promotion else None,
                    end_time=promotion.end_time if promotion else None,
                )
            )
        
        return recommendations
    
    except Exception as e:
        print(f"Lỗi trong recommendation: {e}")
        return None


def get_user_recommendations(db: Session, user_id: int, top_n: int = 32) -> List[OutPutAbs] | None:
    try:
        if similarity_matrix is None:
            return None
        
        # Lấy user activity - lọc distinct product, lấy hành động gần nhất
        from app.models.user_activity import UserActivity
        all_activities = db.query(UserActivity).filter(
            UserActivity.user_id == user_id
        ).order_by(UserActivity.created_at.desc()).all()
        
        seen_products = set()
        user_activities = []
        for activity in all_activities:
            if activity.product_id not in seen_products:
                user_activities.append(activity)
                seen_products.add(activity.product_id)
                if len(user_activities) >= 8:
                    break
        
        if not user_activities:
            return get_promotion_products(db, top_n)
        

        all_products = db.query(Product).all()
        if not all_products:
            return None
        
  
        product_id_to_idx = {p.id: idx for idx, p in enumerate(all_products)}
        

        recommended_ids = set()
        now = datetime.now()
        
        for activity in user_activities:
            if activity.product_id not in product_id_to_idx:
                continue
            
            product_idx = product_id_to_idx[activity.product_id]
            similarities = similarity_matrix[product_idx]
            
 
            top_indices = np.argsort(similarities)[::-1][1:8]
            
            for idx in top_indices:
                recommended_ids.add(all_products[idx].id)
        

        recommendations = []
        for product_id in list(recommended_ids)[:top_n]:
            product = db.query(Product).filter(Product.id == product_id).first()
            if not product:
                continue
            
            promotion = db.query(Abs).filter(
                Abs.product_id == product_id,
                Abs.start_time <= now,
                Abs.end_time >= now
            ).first()
            
            product_name = product.name
            if product.phanloai == "laptop" and "(" in product_name:
                product_name = product_name.split("(")[0]
            
            recommendations.append(
                OutPutAbs(
                    id=product.id,
                    name=product_name,
                    price=product.price,
                    thumb=product.thumb,
                    main_image=product.main_image,
                    phanloai=product.phanloai,
                    percent_abs=promotion.percent_abs if promotion else 0,
                    start_time=promotion.start_time if promotion else None,
                    end_time=promotion.end_time if promotion else None,
                )
            )
        
        # Nếu không đủ top_n sản phẩm → Thêm trending
        if len(recommendations) < top_n:
            trending = get_trending_products(db, top_n - len(recommendations))
            # Lọc để tránh duplicate
            existing_ids = {r.id for r in recommendations}
            for product in trending:
                if product.id not in existing_ids and len(recommendations) < top_n:
                    recommendations.append(product)
        
        return recommendations if recommendations else get_promotion_products(db, top_n)
    
    except Exception as e:
        print(f"Lỗi trong user recommendation: {e}")
        return get_promotion_products(db, top_n)


def get_promotion_products(db: Session, top_n: int = 32) -> List[OutPutAbs]:

    try:
        now = datetime.now()
        promotions = db.query(Abs).filter(
            Abs.start_time <= now,
            Abs.end_time >= now
        ).order_by(Abs.start_time.desc()).limit(top_n).all()
        
        recommendations = []
        for promotion in promotions:
            product = promotion.product
            if not product or product.price is None:
                continue
            
            product_name = product.name
            if product.phanloai == "laptop" and "(" in product_name:
                product_name = product_name.split("(")[0]
            
            recommendations.append(
                OutPutAbs(
                    id=product.id,
                    name=product_name,
                    price=product.price,
                    thumb=product.thumb,
                    main_image=product.main_image,
                    phanloai=product.phanloai,
                    percent_abs=promotion.percent_abs,
                    start_time=promotion.start_time,
                    end_time=promotion.end_time,
                )
            )
        
        return recommendations
    
    except Exception as e:
        print(f"Lỗi lấy promotion products: {e}")
        return []


def get_trending_products(db: Session, top_n: int = 32) -> List[OutPutAbs]:
    try:
        from app.models.user_activity import UserActivity
        from sqlalchemy import func
        
        # Lấy top products by interaction count
        activity_counts = db.query(
            UserActivity.product_id,
            func.count(UserActivity.id).label('interaction_count')
        ).group_by(UserActivity.product_id).order_by(
            func.count(UserActivity.id).desc()
        ).limit(top_n).all()
        
        if not activity_counts:
            # Fallback: nếu chưa có activity, trả promotion products
            return get_promotion_products(db, top_n)
        
        trending_product_ids = [ac[0] for ac in activity_counts]
        now = datetime.now()
        
        recommendations = []
        for product_id in trending_product_ids:
            product = db.query(Product).filter(Product.id == product_id).first()
            if not product or product.price is None:
                continue
            
            promotion = db.query(Abs).filter(
                Abs.product_id == product_id,
                Abs.start_time <= now,
                Abs.end_time >= now
            ).first()
            
            product_name = product.name
            if product.phanloai == "laptop" and "(" in product_name:
                product_name = product_name.split("(")[0]
            
            recommendations.append(
                OutPutAbs(
                    id=product.id,
                    name=product_name,
                    price=product.price,
                    thumb=product.thumb,
                    main_image=product.main_image,
                    phanloai=product.phanloai,
                    percent_abs=promotion.percent_abs if promotion else 0,
                    start_time=promotion.start_time if promotion else None,
                    end_time=promotion.end_time if promotion else None,
                )
            )
        
        return recommendations if recommendations else get_promotion_products(db, top_n)
    
    except Exception as e:
        print(f"Lỗi lấy trending products: {e}")
        return get_promotion_products(db, top_n)
    
import cloudinary
import cloudinary.uploader

async def upload_to_cloudinary(file: UploadFile) -> str:
    if not file.filename:
        raise HTTPException(400, "File không có tên")
    
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(400, f"Chỉ hỗ trợ file hình: JPG, PNG, WebP, GIF")
    
    try:
        file_content = await file.read()
        

        result = cloudinary.uploader.upload(
            file_content,
            folder="web_shop/products",
            resource_type="auto"
        )
        
        return result.get("secure_url", result.get("url"))
    except Exception as e:
        raise HTTPException(500, f"Lỗi khi upload ảnh: {str(e)}")