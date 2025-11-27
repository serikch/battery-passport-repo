"""
Router Notifications - Workflow de communication
Gère les notifications entre Garagiste, Propriétaire BP et Centre de tri
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime
import uuid

from models import (
    NotificationCreate,
    NotificationResponse,
    StatusChangeRequest,
    StatusChangeResponse,
    APIResponse,
    BatteryStatus
)
from database import db, get_battery_by_id, update_battery_status

router = APIRouter()

# ============================================
# Stockage en mémoire des notifications
# (En prod, utiliser Neo4j ou Redis)
# ============================================

notifications_store: List[dict] = []


# ============================================
# POST - Créer une notification
# ============================================

@router.post("/", response_model=NotificationResponse)
async def create_notification(notification: NotificationCreate):
    """
    Crée une notification (Garagiste → Propriétaire BP).
    Utilisé quand le garagiste détecte une batterie hors d'usage.
    """
    try:
        # Vérifier que la batterie existe
        battery = get_battery_by_id(notification.batteryId)
        if not battery:
            raise HTTPException(status_code=404, detail=f"Batterie {notification.batteryId} non trouvée")
        
        # Créer la notification
        notif_id = str(uuid.uuid4())[:8]
        new_notification = {
            "notificationId": notif_id,
            "batteryId": notification.batteryId,
            "message": notification.message,
            "senderRole": notification.senderRole,
            "senderName": notification.senderName,
            "urgency": notification.urgency,
            "createdAt": datetime.now(),
            "read": False,
            "status": "pending"  # pending, acknowledged, resolved
        }
        
        notifications_store.append(new_notification)
        
        # Aussi créer un nœud Notification dans Neo4j (optionnel)
        query = """
        MATCH (b:BatteryInstance {batteryId: $battery_id})
        CREATE (n:Notification {
            notificationId: $notif_id,
            message: $message,
            senderRole: $sender_role,
            senderName: $sender_name,
            urgency: $urgency,
            createdAt: datetime(),
            read: false,
            status: 'pending'
        })
        CREATE (b)-[:HAS_NOTIFICATION]->(n)
        RETURN n
        """
        db.execute_query(query, {
            "battery_id": notification.batteryId,
            "notif_id": notif_id,
            "message": notification.message,
            "sender_role": notification.senderRole,
            "sender_name": notification.senderName or "",
            "urgency": notification.urgency
        })
        
        return NotificationResponse(
            notificationId=notif_id,
            batteryId=notification.batteryId,
            message=notification.message,
            senderRole=notification.senderRole,
            senderName=notification.senderName,
            urgency=notification.urgency,
            createdAt=new_notification["createdAt"],
            read=False
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# GET - Liste des notifications
# ============================================

@router.get("/", response_model=List[dict])
async def list_notifications(
    unread_only: bool = Query(False, description="Afficher uniquement les non lues"),
    battery_id: Optional[str] = Query(None, description="Filtrer par batterie"),
    urgency: Optional[str] = Query(None, description="Filtrer par urgence (low, normal, high)")
):
    """
    Liste toutes les notifications.
    Utilisé par le Propriétaire BP pour voir les demandes des garagistes.
    """
    try:
        # Récupérer depuis Neo4j
        query = """
        MATCH (b:BatteryInstance)-[:HAS_NOTIFICATION]->(n:Notification)
        RETURN n.notificationId AS notificationId,
               b.batteryId AS batteryId,
               n.message AS message,
               n.senderRole AS senderRole,
               n.senderName AS senderName,
               n.urgency AS urgency,
               n.createdAt AS createdAt,
               n.read AS read,
               n.status AS status
        ORDER BY n.createdAt DESC
        """
        notifications = db.execute_query(query)
        
        # Appliquer les filtres
        if unread_only:
            notifications = [n for n in notifications if not n.get("read")]
        
        if battery_id:
            notifications = [n for n in notifications if n.get("batteryId") == battery_id]
        
        if urgency:
            notifications = [n for n in notifications if n.get("urgency") == urgency]
        
        return notifications
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# GET - Notifications non lues (count)
# ============================================

@router.get("/unread/count", response_model=dict)
async def count_unread():
    """
    Compte les notifications non lues.
    Pour le badge de notification du Propriétaire BP.
    """
    try:
        query = """
        MATCH (n:Notification)
        WHERE n.read = false
        RETURN count(n) AS count
        """
        result = db.execute_query(query)
        return {"unreadCount": result[0]["count"] if result else 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# PUT - Marquer comme lue
# ============================================

@router.put("/{notification_id}/read", response_model=APIResponse)
async def mark_as_read(notification_id: str):
    """
    Marque une notification comme lue.
    """
    try:
        query = """
        MATCH (n:Notification {notificationId: $notif_id})
        SET n.read = true, n.readAt = datetime()
        RETURN n.notificationId AS id
        """
        result = db.execute_query(query, {"notif_id": notification_id})
        
        if not result:
            raise HTTPException(status_code=404, detail="Notification non trouvée")
        
        return APIResponse(
            success=True,
            message=f"Notification {notification_id} marquée comme lue"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# PUT - Traiter une notification (changer statut batterie)
# ============================================

@router.put("/{notification_id}/process", response_model=StatusChangeResponse)
async def process_notification(
    notification_id: str,
    request: StatusChangeRequest
):
    """
    Traite une notification en changeant le statut de la batterie.
    Workflow complet: Garagiste signale → Propriétaire valide → Statut change.
    """
    try:
        # Récupérer la notification et la batterie associée
        query = """
        MATCH (b:BatteryInstance)-[:HAS_NOTIFICATION]->(n:Notification {notificationId: $notif_id})
        RETURN b.batteryId AS batteryId, b.status AS currentStatus, n
        """
        result = db.execute_query(query, {"notif_id": notification_id})
        
        if not result:
            raise HTTPException(status_code=404, detail="Notification non trouvée")
        
        battery_id = result[0]["batteryId"]
        previous_status = result[0]["currentStatus"]
        
        # Changer le statut de la batterie
        update_result = update_battery_status(battery_id, request.newStatus.value)
        
        if not update_result:
            raise HTTPException(status_code=500, detail="Échec du changement de statut")
        
        # Mettre à jour la notification
        update_notif_query = """
        MATCH (n:Notification {notificationId: $notif_id})
        SET n.status = 'resolved',
            n.read = true,
            n.resolvedAt = datetime(),
            n.resolvedBy = $resolved_by,
            n.resolution = $resolution
        RETURN n
        """
        db.execute_query(update_notif_query, {
            "notif_id": notification_id,
            "resolved_by": "Propriétaire BP",
            "resolution": f"Statut changé: {previous_status} → {request.newStatus.value}"
        })
        
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
# POST - Signaler batterie Waste (raccourci garagiste)
# ============================================

@router.post("/report-waste/{battery_id}", response_model=NotificationResponse)
async def report_waste(
    battery_id: str,
    reason: str = Query(..., description="Raison du signalement"),
    garage_name: str = Query("Garage", description="Nom du garage")
):
    try:
        # Vérifier la batterie
        battery = get_battery_by_id(battery_id)
        if not battery:
            raise HTTPException(status_code=404, detail=f"Batterie {battery_id} non trouvée")
        
        # Changer le statut à "Signaled As Waste"
        db.execute_query("""
            MATCH (b:BatteryInstance {batteryId: $battery_id})
            SET b.status = 'Signaled As Waste'
        """, {"battery_id": battery_id})
        
        # Créer la notification
        notification = NotificationCreate(
            batteryId=battery_id,
            message=f"🚨 Batterie signalée comme hors d'usage: {reason}",
            senderRole="Garagiste",
            senderName=garage_name,
            urgency="high"
        )
        return await create_notification(notification)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# GET - Historique d'une batterie
# ============================================

@router.get("/history/{battery_id}", response_model=List[dict])
async def get_battery_history(battery_id: str):
    """
    Récupère l'historique complet d'une batterie.
    Notifications, changements de statut, etc.
    """
    try:
        query = """
        MATCH (b:BatteryInstance {batteryId: $battery_id})
        OPTIONAL MATCH (b)-[:HAS_NOTIFICATION]->(n:Notification)
        RETURN b.batteryId AS batteryId,
               b.status AS currentStatus,
               collect({
                   notificationId: n.notificationId,
                   message: n.message,
                   senderRole: n.senderRole,
                   createdAt: n.createdAt,
                   status: n.status,
                   urgency: n.urgency
               }) AS notifications
        """
        result = db.execute_query(query, {"battery_id": battery_id})
        
        if not result:
            raise HTTPException(status_code=404, detail=f"Batterie {battery_id} non trouvée")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# POST - Confirmer réception centre de tri
# ============================================

@router.post("/confirm-reception/{battery_id}", response_model=APIResponse)
async def confirm_reception(
    battery_id: str,
    center_name: str = Query(..., description="Nom du centre de tri")
):
    """
    Confirme la réception d'une batterie au Centre de tri.
    Vérifie que le statut est bien 'Waste'.
    """
    try:
        # Vérifier la batterie
        battery = get_battery_by_id(battery_id)
        if not battery:
            raise HTTPException(status_code=404, detail=f"Batterie {battery_id} non trouvée")
        
        current_status = battery.get("b", {}).get("status")
        
        if current_status != "Waste":
            raise HTTPException(
                status_code=400, 
                detail=f"Statut incorrect: {current_status}. Attendu: Waste"
            )
        
        # Créer un événement de réception dans Neo4j
        query = """
        MATCH (b:BatteryInstance {batteryId: $battery_id})
        CREATE (e:Event {
            type: 'RECEPTION',
            centerName: $center_name,
            timestamp: datetime(),
            batteryStatus: b.status
        })
        CREATE (b)-[:HAS_EVENT]->(e)
        RETURN e
        """
        db.execute_query(query, {
            "battery_id": battery_id,
            "center_name": center_name
        })
        
        return APIResponse(
            success=True,
            message=f"Réception confirmée pour {battery_id} au {center_name}",
            data={
                "batteryId": battery_id,
                "status": current_status,
                "receivedBy": center_name,
                "receivedAt": datetime.now().isoformat()
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))