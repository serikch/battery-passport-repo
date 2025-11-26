"""
Router Modules - Télémétrie & Diagnostic (Défi #1)
Endpoints pour recevoir les données du BMS (Wokwi/micro:bit)
et analyser l'état des modules de batterie
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime

from models import (
    ModuleResponse,
    TelemetryInput,
    APIResponse,
    DecisionCriteria,
    DecisionRecommendation,
    DecisionType
)
from database import db, get_battery_modules, get_battery_by_id

router = APIRouter()


# ============================================
# GET - Modules d'une batterie
# ============================================

@router.get("/battery/{battery_id}", response_model=List[ModuleResponse])
async def get_modules(battery_id: str):
    """
    Récupère tous les modules d'une batterie avec leur état.
    Inclut l'indicateur isDefective pour chaque module.
    """
    try:
        # Vérifier que la batterie existe
        battery = get_battery_by_id(battery_id)
        if not battery:
            raise HTTPException(status_code=404, detail=f"Batterie {battery_id} non trouvée")
        
        modules = get_battery_modules(battery_id)
        
        if not modules:
            raise HTTPException(status_code=404, detail=f"Aucun module trouvé pour {battery_id}")
        
        return modules
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# GET - Modules défaillants uniquement
# ============================================

@router.get("/battery/{battery_id}/defective", response_model=List[ModuleResponse])
async def get_defective_modules(battery_id: str):
    """
    Récupère uniquement les modules défaillants d'une batterie.
    Un module est défaillant si internalResistance > maxResistance.
    """
    try:
        modules = get_battery_modules(battery_id)
        defective = [m for m in modules if m.get("isDefective")]
        return defective
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# POST - Recevoir télémétrie du BMS
# ============================================

@router.post("/telemetry", response_model=APIResponse)
async def receive_telemetry(data: TelemetryInput):
    """
    Reçoit les données de télémétrie du BMS (Wokwi/micro:bit).
    Met à jour les valeurs des modules dans Neo4j.
    Déclenche une alerte si un module dépasse le seuil.
    
    Appelé par le simulateur BMS toutes les X secondes.
    """
    try:
        battery_id = data.batteryId
        
        # Vérifier que la batterie existe
        battery = get_battery_by_id(battery_id)
        if not battery:
            raise HTTPException(status_code=404, detail=f"Batterie {battery_id} non trouvée")
        
        alerts = []
        updated_count = 0
        
        for module in data.modules:
            # Mettre à jour le module dans Neo4j
            query = """
            MATCH (b:BatteryInstance {batteryId: $battery_id})-[:HAS_MODULE]->(m:Module {moduleId: $module_id})
            SET m.internalResistance = $resistance,
                m.voltage = $voltage,
                m.temperature = $temperature,
                m.soh = $soh,
                m.lastUpdate = datetime()
            RETURN m.moduleId AS moduleId,
                   m.internalResistance AS resistance,
                   m.maxResistance AS maxResistance
            """
            result = db.execute_query(query, {
                "battery_id": battery_id,
                "module_id": module.moduleId,
                "resistance": module.internalResistance,
                "voltage": module.voltage,
                "temperature": module.temperature,
                "soh": module.soh
            })
            
            if result:
                updated_count += 1
                # Vérifier si le module est défaillant
                if module.internalResistance > module.maxResistance:
                    alerts.append({
                        "moduleId": module.moduleId,
                        "resistance": module.internalResistance,
                        "maxResistance": module.maxResistance,
                        "message": f"⚠️ Module {module.moduleId} défaillant: résistance {module.internalResistance}Ω > max {module.maxResistance}Ω"
                    })
        
        return APIResponse(
            success=True,
            message=f"Télémétrie reçue: {updated_count} modules mis à jour, {len(alerts)} alertes",
            data={
                "batteryId": battery_id,
                "modulesUpdated": updated_count,
                "alerts": alerts,
                "timestamp": datetime.now().isoformat()
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# GET - Diagnostic complet
# ============================================

@router.get("/battery/{battery_id}/diagnostic", response_model=dict)
async def get_diagnostic(battery_id: str):
    """
    Effectue un diagnostic complet de la batterie.
    Retourne: SOH moyen, modules défaillants, recommandation.
    Utilisé par le Garagiste pour évaluer l'état de la batterie.
    """
    try:
        # Récupérer la batterie et ses modules
        battery = get_battery_by_id(battery_id)
        if not battery:
            raise HTTPException(status_code=404, detail=f"Batterie {battery_id} non trouvée")
        
        modules = get_battery_modules(battery_id)
        
        if not modules:
            raise HTTPException(status_code=404, detail="Aucun module trouvé")
        
        # Calculer les statistiques
        total_soh = sum(m.get("soh", 0) for m in modules)
        avg_soh = total_soh / len(modules)
        
        total_resistance_ratio = sum(
            m.get("internalResistance", 0) / m.get("maxResistance", 1) 
            for m in modules
        )
        avg_resistance_ratio = total_resistance_ratio / len(modules)
        
        defective_modules = [m for m in modules if m.get("isDefective")]
        
        avg_temp = sum(m.get("temperature", 0) for m in modules) / len(modules)
        avg_voltage = sum(m.get("voltage", 0) for m in modules) / len(modules)
        
        # Déterminer l'état global
        if len(defective_modules) > 0:
            health_status = "CRITICAL"
            recommendation = "Batterie hors d'usage - Signaler au Propriétaire BP"
        elif avg_soh < 70:
            health_status = "WARNING"
            recommendation = "SOH faible - Surveillance recommandée"
        elif avg_soh < 80:
            health_status = "FAIR"
            recommendation = "État acceptable - Contrôle dans 6 mois"
        else:
            health_status = "GOOD"
            recommendation = "Batterie en bon état"
        
        return {
            "batteryId": battery_id,
            "status": battery.get("b", {}).get("status", "Unknown"),
            "diagnostic": {
                "healthStatus": health_status,
                "avgSoh": round(avg_soh, 2),
                "avgResistanceRatio": round(avg_resistance_ratio, 3),
                "avgTemperature": round(avg_temp, 1),
                "avgVoltage": round(avg_voltage, 2),
                "totalModules": len(modules),
                "defectiveModules": len(defective_modules),
                "defectiveModuleIds": [m.get("moduleId") for m in defective_modules]
            },
            "recommendation": recommendation,
            "modules": modules
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# GET - Alertes actives
# ============================================

@router.get("/alerts", response_model=List[dict])
async def get_all_alerts():
    """
    Récupère toutes les alertes actives (modules défaillants).
    Vue d'ensemble pour le Propriétaire BP.
    """
    try:
        query = """
        MATCH (b:BatteryInstance)-[:HAS_MODULE]->(m:Module)
        WHERE m.internalResistance > m.maxResistance
        RETURN b.batteryId AS batteryId,
               b.status AS batteryStatus,
               m.moduleId AS moduleId,
               m.internalResistance AS resistance,
               m.maxResistance AS maxResistance,
               m.temperature AS temperature,
               m.soh AS soh,
               round((m.internalResistance / m.maxResistance) * 100) AS overloadPercent
        ORDER BY overloadPercent DESC
        """
        return db.execute_query(query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# POST - Aide à la décision (Défi #3)
# ============================================

@router.post("/battery/{battery_id}/decision", response_model=DecisionRecommendation)
async def get_decision_recommendation(
    battery_id: str,
    market_demand: str = Query("normal", description="Demande marché: low, normal, high")
):
    """
    Algorithme d'aide à la décision pour le Centre de tri (Défi #3).
    Analyse les critères et recommande: Recycle, Reuse, Remanufacture, Repurpose.
    """
    try:
        # Récupérer les données de la batterie
        battery = get_battery_by_id(battery_id)
        if not battery:
            raise HTTPException(status_code=404, detail=f"Batterie {battery_id} non trouvée")
        
        modules = get_battery_modules(battery_id)
        
        if not modules:
            raise HTTPException(status_code=404, detail="Aucun module trouvé")
        
        # Calculer les critères
        avg_soh = sum(m.get("soh", 0) for m in modules) / len(modules)
        defective_count = len([m for m in modules if m.get("isDefective")])
        avg_resistance_ratio = sum(
            m.get("internalResistance", 0) / m.get("maxResistance", 1) 
            for m in modules
        ) / len(modules)
        
        # Récupérer l'âge (en mois) depuis la date de fabrication
        battery_data = battery.get("b", {})
        manufacturing_date = battery_data.get("manufacturingDate")
        if manufacturing_date:
            from datetime import date
            today = date.today()
            # Neo4j retourne une date, calculer l'âge en mois
            age_months = (today.year - manufacturing_date.year) * 12 + (today.month - manufacturing_date.month)
        else:
            age_months = 24  # Valeur par défaut
        
        # Récupérer la composition chimique
        composition = battery.get("comp", {})
        chemistry = composition.get("id", "NMC") if composition else "NMC"
        
        # ============================================
        # ALGORITHME DE SCORING
        # ============================================
        
        scores = {
            "Recycle": 0,
            "Reuse": 0,
            "Remanufacture": 0,
            "Repurpose": 0
        }
        
        # 1. Score basé sur SOH (40% du poids)
        if avg_soh >= 80:
            scores["Reuse"] += 40
            scores["Repurpose"] += 30
        elif avg_soh >= 60:
            scores["Repurpose"] += 35
            scores["Remanufacture"] += 30
            scores["Reuse"] += 20
        elif avg_soh >= 40:
            scores["Remanufacture"] += 35
            scores["Recycle"] += 25
            scores["Repurpose"] += 20
        else:
            scores["Recycle"] += 40
            scores["Remanufacture"] += 15
        
        # 2. Score basé sur les modules défaillants (25% du poids)
        if defective_count == 0:
            scores["Reuse"] += 25
            scores["Repurpose"] += 20
        elif defective_count <= 2:
            scores["Remanufacture"] += 25
            scores["Repurpose"] += 15
        else:
            scores["Recycle"] += 25
        
        # 3. Score basé sur l'âge (15% du poids)
        if age_months <= 24:
            scores["Reuse"] += 15
            scores["Repurpose"] += 10
        elif age_months <= 48:
            scores["Repurpose"] += 15
            scores["Remanufacture"] += 10
        else:
            scores["Recycle"] += 15
            scores["Remanufacture"] += 10
        
        # 4. Score basé sur la chimie (10% du poids)
        if chemistry == "LFP":
            scores["Reuse"] += 10  # LFP plus durable
            scores["Repurpose"] += 8
        elif chemistry == "NMC811" or chemistry == "NCA":
            scores["Recycle"] += 10  # Matériaux plus précieux à recycler
        
        # 5. Score basé sur la demande marché (10% du poids)
        if market_demand == "high":
            scores["Reuse"] += 10
            scores["Repurpose"] += 8
        elif market_demand == "low":
            scores["Recycle"] += 10
        else:
            scores["Remanufacture"] += 5
            scores["Repurpose"] += 5
        
        # Déterminer la recommandation
        recommendation = max(scores, key=scores.get)
        confidence = scores[recommendation]
        
        # Générer le raisonnement
        reasons = []
        if avg_soh < 60:
            reasons.append(f"SOH moyen faible ({avg_soh:.1f}%)")
        if defective_count > 0:
            reasons.append(f"{defective_count} module(s) défaillant(s)")
        if age_months > 36:
            reasons.append(f"Batterie âgée ({age_months} mois)")
        if chemistry == "LFP":
            reasons.append("Chimie LFP favorable au réemploi")
        if market_demand == "high":
            reasons.append("Forte demande marché")
        
        reasoning = ", ".join(reasons) if reasons else "Paramètres dans les normes"
        
        return DecisionRecommendation(
            batteryId=battery_id,
            recommendation=DecisionType(recommendation),
            confidence=confidence,
            scores=scores,
            reasoning=reasoning
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))