"""
Router Batteries - CRUD et génération QR Code
Endpoints pour la gestion des passeports de batteries
"""

import os
import qrcode
from io import BytesIO
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from typing import List, Optional

from models import (
    BatteryResponse,
    BatteryListItem,
    BatteryWithModules,
    QRCodeResponse,
    StatusChangeRequest,
    StatusChangeResponse,
    APIResponse
)
from database import (
    db,
    get_battery_by_id,
    get_battery_modules,
    get_all_batteries,
    update_battery_status
)
from datetime import datetime

router = APIRouter()

# ============================================
# GET - Liste des batteries
# ============================================

@router.get("/", response_model=List[BatteryListItem])
async def list_batteries(
    status: Optional[str] = Query(None, description="Filtrer par statut (Original, Waste, Reused, Repurposed)")
):
    """
    Liste toutes les batteries avec leur statut.
    Optionnel: filtrer par statut.
    """
    try:
        batteries = get_all_batteries()
        
        # Filtrer par statut si demandé
        if status:
            batteries = [b for b in batteries if b.get("status") == status]
        
        return batteries
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# GET - Détails d'une batterie
# ============================================

@router.get("/{battery_id}", response_model=BatteryResponse)
async def get_battery(battery_id: str):
    """
    Récupère les informations détaillées d'une batterie par son ID.
    Inclut: modèle, fabricant, type, composition, statut.
    """
    try:
        result = get_battery_by_id(battery_id)
        
        if not result:
            raise HTTPException(status_code=404, detail=f"Batterie {battery_id} non trouvée")
        
        # Extraire les données des nœuds
        battery = result.get("b", {})
        model = result.get("m", {})
        company = result.get("c", {})
        battery_type = result.get("t", {})
        composition = result.get("comp", {})
        status = result.get("s", {})
        
        return BatteryResponse(
            batteryId=battery.get("batteryId"),
            batteryPassportId=battery.get("batteryPassportId"),
            serialNumber=battery.get("serialNumber"),
            status=battery.get("status", "Original"),
            manufacturingDate=str(battery.get("manufacturingDate")) if battery.get("manufacturingDate") else None,
            warrantyPeriod=battery.get("warrantyPeriod"),
            massKg=battery.get("massKg"),
            carbonFootprint=battery.get("carbonFootprint"),
            modelName=model.get("name") if model else None,
            manufacturer=company.get("name") if company else None,
            batteryType=battery_type.get("name") if battery_type else None,
            composition=composition.get("id") if composition else None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# GET - Batterie avec modules (diagnostic)
# ============================================

@router.get("/{battery_id}/full", response_model=BatteryWithModules)
async def get_battery_full(battery_id: str):
    """
    Récupère une batterie avec tous ses modules.
    Utilisé par le Garagiste pour le diagnostic complet.
    Inclut: indicateurs de défaillance par module.
    """
    try:
        # Récupérer la batterie
        result = get_battery_by_id(battery_id)
        if not result:
            raise HTTPException(status_code=404, detail=f"Batterie {battery_id} non trouvée")
        
        # Récupérer les modules
        modules = get_battery_modules(battery_id)
        
        # Extraire les données
        battery = result.get("b", {})
        model = result.get("m", {})
        company = result.get("c", {})
        battery_type = result.get("t", {})
        composition = result.get("comp", {})
        
        # Calculer les stats de défaillance
        defective_modules = [m for m in modules if m.get("isDefective")]
        
        return BatteryWithModules(
            batteryId=battery.get("batteryId"),
            batteryPassportId=battery.get("batteryPassportId"),
            serialNumber=battery.get("serialNumber"),
            status=battery.get("status", "Original"),
            manufacturingDate=str(battery.get("manufacturingDate")) if battery.get("manufacturingDate") else None,
            warrantyPeriod=battery.get("warrantyPeriod"),
            massKg=battery.get("massKg"),
            carbonFootprint=battery.get("carbonFootprint"),
            modelName=model.get("name") if model else None,
            manufacturer=company.get("name") if company else None,
            batteryType=battery_type.get("name") if battery_type else None,
            composition=composition.get("id") if composition else None,
            modules=modules,
            hasDefectiveModule=len(defective_modules) > 0,
            defectiveModulesCount=len(defective_modules)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# PUT - Changer le statut
# ============================================

@router.put("/{battery_id}/status", response_model=StatusChangeResponse)
async def change_battery_status(battery_id: str, request: StatusChangeRequest):
    """
    Change le statut d'une batterie.
    Utilisé par le Propriétaire BP pour passer de Original → Waste, etc.
    """
    try:
        # Vérifier que la batterie existe
        current = get_battery_by_id(battery_id)
        if not current:
            raise HTTPException(status_code=404, detail=f"Batterie {battery_id} non trouvée")
        
        previous_status = current.get("b", {}).get("status", "Original")
        
        # Changer le statut
        result = update_battery_status(battery_id, request.newStatus.value)
        
        if not result:
            raise HTTPException(status_code=500, detail="Échec du changement de statut")
        
        return StatusChangeResponse(
            batteryId=battery_id,
            previousStatus=previous_status,
            newStatus=request.newStatus.value,
            changedAt=datetime.now(),
            success=True
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# QR CODE - Génération
# ============================================

@router.get("/{battery_id}/qrcode", response_class=StreamingResponse)
async def generate_qr_code(
    battery_id: str,
    size: int = Query(10, ge=5, le=50, description="Taille du QR code (box_size)")
):
    """
    Génère un QR code pour une batterie.
    Le QR code pointe vers l'URL du passeport de la batterie.
    """
    try:
        # Vérifier que la batterie existe
        result = get_battery_by_id(battery_id)
        if not result:
            raise HTTPException(status_code=404, detail=f"Batterie {battery_id} non trouvée")
        
        # URL du passeport (à adapter selon déploiement)
        base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
        passport_url = f"{base_url}/battery/{battery_id}/full"
        
        # Générer le QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=size,
            border=4,
        )
        qr.add_data(passport_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convertir en bytes
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="image/png",
            headers={
                "Content-Disposition": f"inline; filename={battery_id}_qrcode.png"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{battery_id}/qrcode/save", response_model=QRCodeResponse)
async def save_qr_code(battery_id: str):
    """
    Génère et sauvegarde le QR code d'une batterie.
    Retourne l'URL du fichier sauvegardé.
    """
    try:
        # Vérifier que la batterie existe
        result = get_battery_by_id(battery_id)
        if not result:
            raise HTTPException(status_code=404, detail=f"Batterie {battery_id} non trouvée")
        
        # URL du passeport
        base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
        passport_url = f"{base_url}/battery/{battery_id}/full"
        
        # Générer le QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(passport_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Sauvegarder
        qr_path = f"static/qrcodes/{battery_id}.png"
        os.makedirs("static/qrcodes", exist_ok=True)
        img.save(qr_path)
        
        return QRCodeResponse(
            batteryId=battery_id,
            qrCodeUrl=f"/static/qrcodes/{battery_id}.png",
            passportUrl=passport_url
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# GET - Batteries défaillantes
# ============================================

@router.get("/defective/list", response_model=List[dict])
async def list_defective_batteries():
    """
    Liste toutes les batteries ayant au moins un module défaillant.
    Utile pour le Propriétaire BP pour voir les alertes.
    """
    try:
        query = """
        MATCH (b:BatteryInstance)-[:HAS_MODULE]->(m:Module)
        WHERE m.internalResistance > m.maxResistance
        WITH b, collect({
            moduleId: m.moduleId,
            resistance: m.internalResistance,
            maxResistance: m.maxResistance
        }) AS defectiveModules
        RETURN b.batteryId AS batteryId,
               b.status AS status,
               defectiveModules,
               size(defectiveModules) AS defectiveCount
        """
        return db.execute_query(query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))