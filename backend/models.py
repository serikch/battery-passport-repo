"""
Modèles Pydantic - Validation des données API
Définit les schémas pour les requêtes/réponses de l'API
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


# ============================================
# ENUMS
# ============================================

class BatteryStatus(str, Enum):
    """Statuts possibles d'une batterie"""
    ORIGINAL = "Original"
    WASTE = "Waste"
    REUSED = "Reused"
    REPURPOSED = "Repurposed"


class DecisionType(str, Enum):
    """Décisions possibles du centre de tri"""
    RECYCLE = "Recycle"
    REUSE = "Reuse"
    REMANUFACTURE = "Remanufacture"
    REPURPOSE = "Repurpose"


# ============================================
# MODULES (Télémétrie - Défi #1)
# ============================================

class ModuleBase(BaseModel):
    """Données de base d'un module batterie"""
    moduleId: str = Field(..., example="M1")
    internalResistance: float = Field(..., ge=0, example=0.012)
    maxResistance: float = Field(..., ge=0, example=0.020)
    voltage: float = Field(..., ge=0, example=3.7)
    temperature: float = Field(..., example=25.0)
    soh: float = Field(..., ge=0, le=100, example=98.0)


class ModuleResponse(ModuleBase):
    """Réponse module avec indicateur de défaillance"""
    isDefective: bool = Field(..., example=False)
    
    class Config:
        json_schema_extra = {
            "example": {
                "moduleId": "M3",
                "internalResistance": 0.045,
                "maxResistance": 0.020,
                "voltage": 3.2,
                "temperature": 42.0,
                "soh": 35.0,
                "isDefective": True
            }
        }


class TelemetryInput(BaseModel):
    """Données de télémétrie reçues du BMS (Wokwi/micro:bit)"""
    batteryId: str = Field(..., example="BP-2024-LG-002")
    modules: List[ModuleBase] = Field(..., min_length=1, max_length=10)
    timestamp: Optional[datetime] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "batteryId": "BP-2024-LG-002",
                "modules": [
                    {"moduleId": "M1", "internalResistance": 0.015, "maxResistance": 0.020, "voltage": 3.6, "temperature": 28, "soh": 75},
                    {"moduleId": "M2", "internalResistance": 0.016, "maxResistance": 0.020, "voltage": 3.5, "temperature": 29, "soh": 72},
                    {"moduleId": "M3", "internalResistance": 0.045, "maxResistance": 0.020, "voltage": 3.2, "temperature": 42, "soh": 35},
                    {"moduleId": "M4", "internalResistance": 0.017, "maxResistance": 0.020, "voltage": 3.5, "temperature": 30, "soh": 70},
                    {"moduleId": "M5", "internalResistance": 0.018, "maxResistance": 0.020, "voltage": 3.4, "temperature": 31, "soh": 68}
                ]
            }
        }


# ============================================
# BATTERY
# ============================================

class BatteryBase(BaseModel):
    """Informations de base d'une batterie"""
    batteryId: str = Field(..., example="BP-2024-CATL-001")
    batteryPassportId: str = Field(..., example="EU-BP-FR-2024-00001")
    serialNumber: Optional[str] = None
    status: BatteryStatus = BatteryStatus.ORIGINAL


class BatteryCreate(BatteryBase):
    """Création d'une nouvelle batterie"""
    modelName: str = Field(..., example="CATL Qilin")
    manufacturingDate: Optional[date] = None
    warrantyPeriod: Optional[int] = Field(None, ge=0, example=8)
    massKg: Optional[float] = Field(None, ge=0, example=450.0)
    carbonFootprint: Optional[float] = Field(None, ge=0, example=65.5)


class BatteryResponse(BatteryBase):
    """Réponse complète d'une batterie"""
    serialNumber: Optional[str] = None
    manufacturingDate: Optional[str] = None
    warrantyPeriod: Optional[int] = None
    massKg: Optional[float] = None
    carbonFootprint: Optional[float] = None
    
    # Relations
    modelName: Optional[str] = None
    manufacturer: Optional[str] = None
    batteryType: Optional[str] = None
    composition: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "batteryId": "BP-2024-LG-002",
                "batteryPassportId": "EU-BP-DE-2024-00002",
                "serialNumber": "LG2023U00042",
                "status": "Waste",
                "manufacturingDate": "2023-11-20",
                "warrantyPeriod": 8,
                "massKg": 480.0,
                "carbonFootprint": 72.3,
                "modelName": "LG Ultium",
                "manufacturer": "LG Energy Solution",
                "batteryType": "EV Battery",
                "composition": "NCA"
            }
        }


class BatteryListItem(BaseModel):
    """Item pour la liste des batteries"""
    batteryId: str
    passportId: str
    status: str
    modelName: Optional[str] = None
    manufacturer: Optional[str] = None


class BatteryWithModules(BatteryResponse):
    """Batterie avec ses modules (pour diagnostic garagiste)"""
    modules: List[ModuleResponse] = []
    hasDefectiveModule: bool = False
    defectiveModulesCount: int = 0


# ============================================
# STATUS & NOTIFICATIONS
# ============================================

class StatusChangeRequest(BaseModel):
    """Demande de changement de statut"""
    newStatus: BatteryStatus = Field(..., example=BatteryStatus.WASTE)
    reason: Optional[str] = Field(None, example="Module M3 défaillant - résistance interne trop élevée")
    requestedBy: Optional[str] = Field(None, example="Garagiste Martin")


class StatusChangeResponse(BaseModel):
    """Réponse après changement de statut"""
    batteryId: str
    previousStatus: str
    newStatus: str
    changedAt: datetime
    success: bool


class NotificationCreate(BaseModel):
    """Création d'une notification (garagiste → propriétaire)"""
    batteryId: str = Field(..., example="BP-2024-LG-002")
    message: str = Field(..., example="Batterie hors d'usage - Module M3 défaillant")
    senderRole: str = Field(..., example="Garagiste")
    senderName: Optional[str] = Field(None, example="Garage Auto Plus")
    urgency: str = Field("normal", example="high")


class NotificationResponse(NotificationCreate):
    """Réponse notification avec métadonnées"""
    notificationId: str
    createdAt: datetime
    read: bool = False


# ============================================
# DECISION CENTER (Défi #3)
# ============================================

class DecisionCriteria(BaseModel):
    """Critères pour l'algorithme de décision"""
    avgSoh: float = Field(..., ge=0, le=100, description="SOH moyen de la batterie")
    age_months: int = Field(..., ge=0, description="Âge en mois")
    defectiveModulesCount: int = Field(..., ge=0, description="Nombre de modules défaillants")
    avgResistanceRatio: float = Field(..., ge=0, description="Ratio résistance/max moyen")
    composition: str = Field(..., description="Chimie de la batterie (NMC, LFP, NCA)")
    marketDemand: Optional[str] = Field("normal", description="Demande marché (low, normal, high)")


class DecisionRecommendation(BaseModel):
    """Recommandation du centre de tri"""
    batteryId: str
    recommendation: DecisionType
    confidence: float = Field(..., ge=0, le=100, description="Score de confiance en %")
    scores: dict = Field(..., description="Scores détaillés par option")
    reasoning: str = Field(..., description="Justification de la recommandation")
    
    class Config:
        json_schema_extra = {
            "example": {
                "batteryId": "BP-2024-LG-002",
                "recommendation": "Recycle",
                "confidence": 85.5,
                "scores": {
                    "Recycle": 85.5,
                    "Reuse": 20.0,
                    "Remanufacture": 45.0,
                    "Repurpose": 35.0
                },
                "reasoning": "SOH moyen faible (64%), module défaillant détecté, âge > 12 mois"
            }
        }


# ============================================
# QR CODE
# ============================================

class QRCodeResponse(BaseModel):
    """Réponse génération QR code"""
    batteryId: str
    qrCodeUrl: str = Field(..., example="/static/qrcodes/BP-2024-CATL-001.png")
    passportUrl: str = Field(..., example="http://localhost:8000/battery/BP-2024-CATL-001")


# ============================================
# API RESPONSES
# ============================================

class APIResponse(BaseModel):
    """Réponse générique de l'API"""
    success: bool
    message: str
    data: Optional[dict] = None


class ErrorResponse(BaseModel):
    """Réponse d'erreur"""
    success: bool = False
    error: str
    detail: Optional[str] = None