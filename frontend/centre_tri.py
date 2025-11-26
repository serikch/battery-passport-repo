"""
Interface Centre de Tri - Battery Passport
Mobile : Scan réception → Vérification → Décision (Recycle/Reuse/Remanufacture/Repurpose)

Lancer avec : streamlit run frontend/centre_tri.py --server.port 8503
"""

import streamlit as st
import requests
from datetime import datetime
from config import API_BASE_URL

# ============================================
# CONFIGURATION
# ============================================

st.set_page_config(
    page_title="♻️ Centre de Tri - Battery Passport",
    page_icon="♻️",
    layout="centered",  # Mobile-friendly
    initial_sidebar_state="collapsed"
)

# ============================================
# STYLES CSS (Mobile-optimized)
# ============================================

st.markdown("""
<style>
    .main { padding: 0.5rem; }
    
    .reception-card {
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        border-radius: 15px;
        padding: 20px;
        color: white;
        text-align: center;
        margin: 10px 0;
    }
    
    .decision-card {
        border-radius: 15px;
        padding: 25px;
        text-align: center;
        margin: 10px 0;
        color: white;
        font-size: 1.2em;
    }
    
    .decision-recycle {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }
    
    .decision-reuse {
        background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
    }
    
    .decision-remanufacture {
        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }
    
    .decision-repurpose {
        background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }
    
    .score-bar {
        background: #ecf0f1;
        border-radius: 10px;
        height: 30px;
        margin: 5px 0;
        overflow: hidden;
    }
    
    .score-fill {
        height: 100%;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
    }
    
    .status-check {
        font-size: 3em;
        text-align: center;
    }
    
    .warning-box {
        background: #fff3cd;
        border: 2px solid #ffc107;
        border-radius: 10px;
        padding: 15px;
        margin: 10px 0;
    }
    
    .success-box {
        background: #d4edda;
        border: 2px solid #28a745;
        border-radius: 10px;
        padding: 15px;
        margin: 10px 0;
    }
</style>
""", unsafe_allow_html=True)

# ============================================
# FONCTIONS API
# ============================================

def get_battery(battery_id: str):
    """Récupère les infos d'une batterie"""
    try:
        response = requests.get(f"{API_BASE_URL}/battery/{battery_id}/full")
        return response.json() if response.status_code == 200 else None
    except:
        return None

def get_decision(battery_id: str, market_demand: str = "normal"):
    """Récupère la recommandation de décision"""
    try:
        response = requests.post(
            f"{API_BASE_URL}/modules/battery/{battery_id}/decision",
            params={"market_demand": market_demand}
        )
        return response.json() if response.status_code == 200 else None
    except:
        return None

def confirm_reception(battery_id: str, center_name: str):
    """Confirme la réception de la batterie"""
    try:
        response = requests.post(
            f"{API_BASE_URL}/notifications/confirm-reception/{battery_id}",
            params={"center_name": center_name}
        )
        return response.status_code == 200, response.json()
    except Exception as e:
        return False, str(e)

def change_status(battery_id: str, new_status: str):
    """Change le statut après décision"""
    try:
        response = requests.put(
            f"{API_BASE_URL}/battery/{battery_id}/status",
            json={"newStatus": new_status, "reason": f"Décision centre de tri: {new_status}"}
        )
        return response.status_code == 200, response.json()
    except Exception as e:
        return False, str(e)

def get_waste_batteries():
    """Liste les batteries en statut Waste"""
    try:
        response = requests.get(f"{API_BASE_URL}/battery/", params={"status": "Waste"})
        if response.status_code == 200:
            return [b for b in response.json() if b.get("status") == "Waste"]
        return []
    except:
        return []

# ============================================
# PAGE PRINCIPALE
# ============================================

st.title("♻️ Centre de Tri")
st.markdown("**Battery Passport** - Réception et décision")

st.divider()

# ============================================
# SECTION 1 : SCAN / SÉLECTION
# ============================================

st.subheader("📱 Scanner la batterie")

# Input batterie
col1, col2 = st.columns([3, 1])

with col1:
    battery_id_input = st.text_input(
        "ID Batterie",
        placeholder="BP-2024-LG-002",
        label_visibility="collapsed"
    )

with col2:
    scan_btn = st.button("🔍", use_container_width=True)

# Liste des batteries Waste en attente
waste_batteries = get_waste_batteries()
if waste_batteries:
    st.caption(f"📦 {len(waste_batteries)} batterie(s) en attente de traitement")
    selected = st.selectbox(
        "Batteries en attente (Waste)",
        [""] + [f"{b.get('batteryId')} - {b.get('modelName')}" for b in waste_batteries],
        label_visibility="collapsed"
    )
    if selected:
        battery_id_input = selected.split(" - ")[0]

# Recherche
if scan_btn or battery_id_input:
    if battery_id_input:
        st.session_state["scanned_battery"] = battery_id_input.strip()

# ============================================
# SECTION 2 : RÉCEPTION
# ============================================

if "scanned_battery" in st.session_state and st.session_state["scanned_battery"]:
    battery_id = st.session_state["scanned_battery"]
    battery = get_battery(battery_id)
    
    if battery:
        st.divider()
        
        # ============================================
        # VÉRIFICATION STATUT
        # ============================================
        
        st.subheader("✅ Vérification")
        
        current_status = battery.get("status", "Unknown")
        
        if current_status == "Waste":
            st.markdown("""
            <div class="success-box">
                <div class="status-check">✅</div>
                <h3>Statut confirmé: WASTE</h3>
                <p>La batterie peut être traitée</p>
            </div>
            """, unsafe_allow_html=True)
            
            # Infos batterie
            with st.expander("📋 Détails batterie", expanded=True):
                col1, col2 = st.columns(2)
                with col1:
                    st.markdown(f"**ID:** {battery.get('batteryId')}")
                    st.markdown(f"**Modèle:** {battery.get('modelName')}")
                    st.markdown(f"**Fabricant:** {battery.get('manufacturer')}")
                with col2:
                    st.markdown(f"**Chimie:** {battery.get('composition')}")
                    st.markdown(f"**Masse:** {battery.get('massKg')} kg")
                    st.markdown(f"**Modules:** {len(battery.get('modules', []))}")
            
            # Confirmer réception
            if "reception_confirmed" not in st.session_state:
                st.session_state["reception_confirmed"] = False
            
            if not st.session_state["reception_confirmed"]:
                center_name = st.text_input("Nom du centre", value="Centre de Tri EcoRecycle")
                
                if st.button("📥 Confirmer la réception", type="primary", use_container_width=True):
                    success, result = confirm_reception(battery_id, center_name)
                    if success:
                        st.session_state["reception_confirmed"] = True
                        st.success("✅ Réception confirmée!")
                        st.rerun()
                    else:
                        st.error(f"Erreur: {result}")
            else:
                st.markdown("""
                <div class="reception-card">
                    <h2>📥 Réception Confirmée</h2>
                    <p>La batterie est prête pour analyse</p>
                </div>
                """, unsafe_allow_html=True)
                
                # ============================================
                # SECTION 3 : DÉCISION
                # ============================================
                
                st.divider()
                st.subheader("🎯 Aide à la Décision")
                
                # Paramètre demande marché
                market_demand = st.select_slider(
                    "Demande du marché",
                    options=["low", "normal", "high"],
                    value="normal"
                )
                
                if st.button("🔮 Obtenir la recommandation", use_container_width=True):
                    with st.spinner("Analyse en cours..."):
                        decision = get_decision(battery_id, market_demand)
                    
                    if decision:
                        st.session_state["decision"] = decision
                
                # Afficher la décision
                if "decision" in st.session_state:
                    decision = st.session_state["decision"]
                    
                    recommendation = decision.get("recommendation", "Unknown")
                    confidence = decision.get("confidence", 0)
                    scores = decision.get("scores", {})
                    reasoning = decision.get("reasoning", "")
                    
                    # Carte recommandation
                    decision_class = f"decision-{recommendation.lower()}"
                    emoji_map = {
                        "Recycle": "♻️",
                        "Reuse": "🔄",
                        "Remanufacture": "🔧",
                        "Repurpose": "🔀"
                    }
                    
                    st.markdown(f"""
                    <div class="decision-card {decision_class}">
                        <h1>{emoji_map.get(recommendation, '📦')} {recommendation.upper()}</h1>
                        <p>Confiance: {confidence:.0f}%</p>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    # Raison
                    st.info(f"💡 **Raison:** {reasoning}")
                    
                    # Scores détaillés
                    with st.expander("📊 Scores détaillés"):
                        for option, score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
                            color_map = {
                                "Recycle": "#e74c3c",
                                "Reuse": "#2ecc71",
                                "Remanufacture": "#3498db",
                                "Repurpose": "#9b59b6"
                            }
                            color = color_map.get(option, "#95a5a6")
                            
                            st.markdown(f"""
                            <div class="score-bar">
                                <div class="score-fill" style="width: {score}%; background: {color};">
                                    {option}: {score:.0f}%
                                </div>
                            </div>
                            """, unsafe_allow_html=True)
                    
                    # ============================================
                    # SECTION 4 : VALIDATION DÉCISION
                    # ============================================
                    
                    st.divider()
                    st.subheader("✔️ Valider la décision")
                    
                    # Choix final (peut différer de la recommandation)
                    final_decision = st.radio(
                        "Décision finale",
                        ["Recycle", "Reuse", "Remanufacture", "Repurpose"],
                        index=["Recycle", "Reuse", "Remanufacture", "Repurpose"].index(recommendation),
                        horizontal=True
                    )
                    
                    # Mapping vers statut
                    status_map = {
                        "Recycle": "Waste",  # Reste en Waste pour recyclage
                        "Reuse": "Reused",
                        "Remanufacture": "Reused",  # Ou créer un statut spécifique
                        "Repurpose": "Repurposed"
                    }
                    
                    new_status = status_map.get(final_decision, "Waste")
                    
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        if st.button("✅ Confirmer", type="primary", use_container_width=True):
                            # Si Recycle, on garde Waste mais on pourrait créer un Event
                            if final_decision != "Recycle":
                                success, result = change_status(battery_id, new_status)
                                if success:
                                    st.success(f"✅ Décision enregistrée: {final_decision}")
                                    st.balloons()
                                else:
                                    st.error(f"Erreur: {result}")
                            else:
                                st.success("✅ Batterie envoyée au recyclage")
                                st.balloons()
                    
                    with col2:
                        if st.button("🔄 Nouvelle analyse", use_container_width=True):
                            if "decision" in st.session_state:
                                del st.session_state["decision"]
                            st.rerun()
        
        else:
            # Statut incorrect
            st.markdown(f"""
            <div class="warning-box">
                <div class="status-check">⚠️</div>
                <h3>Statut incorrect: {current_status}</h3>
                <p>Cette batterie n'est pas en statut "Waste".</p>
                <p>Veuillez contacter le Propriétaire BP pour vérification.</p>
            </div>
            """, unsafe_allow_html=True)
            
            with st.expander("📋 Détails"):
                st.json(battery)
    
    else:
        st.error(f"❌ Batterie '{battery_id}' non trouvée")

# ============================================
# RESET
# ============================================

st.divider()

if st.button("🔄 Nouvelle batterie", use_container_width=True):
    for key in ["scanned_battery", "reception_confirmed", "decision"]:
        if key in st.session_state:
            del st.session_state[key]
    st.rerun()

# ============================================
# FOOTER
# ============================================

st.divider()
st.caption(f"♻️ Centre de Tri - Battery Passport | {datetime.now().strftime('%H:%M:%S')}")