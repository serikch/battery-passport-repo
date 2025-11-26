"""
Interface Garagiste - Battery Passport
Tablette : Scan QR → Diagnostic → Signalement Waste

Lancer avec : streamlit run frontend/garagiste.py --server.port 8501
"""

import streamlit as st
import requests
import json
from datetime import datetime

# ============================================
# CONFIGURATION
# ============================================

API_BASE_URL = "http://localhost:8000"

st.set_page_config(
    page_title="🔧 Garagiste - Battery Passport",
    page_icon="🔧",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ============================================
# STYLES CSS
# ============================================

st.markdown("""
<style>
    /* Style général */
    .main { padding: 1rem; }
    
    /* Cards */
    .battery-card {
        background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
        border-radius: 15px;
        padding: 20px;
        color: white;
        margin-bottom: 20px;
    }
    
    /* Module jauge */
    .module-ok {
        background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
        border-radius: 10px;
        padding: 15px;
        text-align: center;
        color: white;
    }
    
    .module-warning {
        background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
        border-radius: 10px;
        padding: 15px;
        text-align: center;
        color: white;
    }
    
    .module-critical {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        border-radius: 10px;
        padding: 15px;
        text-align: center;
        color: white;
        animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
    }
    
    /* Status badges */
    .status-original { background: #3498db; color: white; padding: 5px 15px; border-radius: 20px; }
    .status-waste { background: #e74c3c; color: white; padding: 5px 15px; border-radius: 20px; }
    .status-reused { background: #2ecc71; color: white; padding: 5px 15px; border-radius: 20px; }
    
    /* Alerte */
    .alert-box {
        background: #ffebee;
        border-left: 5px solid #e74c3c;
        padding: 15px;
        border-radius: 5px;
        margin: 10px 0;
    }
</style>
""", unsafe_allow_html=True)

# ============================================
# FONCTIONS API
# ============================================

def get_battery(battery_id: str):
    """Récupère les infos complètes d'une batterie"""
    try:
        response = requests.get(f"{API_BASE_URL}/battery/{battery_id}/full")
        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        st.error(f"Erreur API: {e}")
        return None

def get_diagnostic(battery_id: str):
    """Récupère le diagnostic d'une batterie"""
    try:
        response = requests.get(f"{API_BASE_URL}/modules/battery/{battery_id}/diagnostic")
        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        st.error(f"Erreur API: {e}")
        return None

def report_waste(battery_id: str, reason: str, garage_name: str):
    """Signale une batterie comme Waste"""
    try:
        response = requests.post(
            f"{API_BASE_URL}/notifications/report-waste/{battery_id}",
            params={"reason": reason, "garage_name": garage_name}
        )
        return response.status_code == 200, response.json()
    except Exception as e:
        return False, str(e)

def get_all_batteries():
    """Liste toutes les batteries"""
    try:
        response = requests.get(f"{API_BASE_URL}/battery/")
        if response.status_code == 200:
            return response.json()
        return []
    except:
        return []

# ============================================
# COMPOSANTS UI
# ============================================

def render_module_gauge(module: dict):
    """Affiche une jauge pour un module"""
    is_defective = module.get("isDefective", False)
    resistance = module.get("internalResistance", 0)
    max_resistance = module.get("maxResistance", 1)
    soh = module.get("soh", 0)
    temp = module.get("temperature", 0)
    voltage = module.get("voltage", 0)
    
    # Calcul du ratio
    ratio = (resistance / max_resistance) * 100 if max_resistance > 0 else 0
    
    # Déterminer le style
    if is_defective:
        style_class = "module-critical"
        icon = "🔴"
    elif ratio > 80:
        style_class = "module-warning"
        icon = "🟡"
    else:
        style_class = "module-ok"
        icon = "🟢"
    
    st.markdown(f"""
    <div class="{style_class}">
        <h3>{icon} {module.get('moduleId', 'N/A')}</h3>
        <p><strong>Résistance:</strong> {resistance:.3f}Ω / {max_resistance:.3f}Ω</p>
        <p><strong>Ratio:</strong> {ratio:.0f}%</p>
        <p><strong>SOH:</strong> {soh}%</p>
        <p><strong>Temp:</strong> {temp}°C</p>
        <p><strong>Voltage:</strong> {voltage}V</p>
    </div>
    """, unsafe_allow_html=True)

def render_battery_card(battery: dict):
    """Affiche la carte d'info batterie"""
    status = battery.get("status", "Unknown")
    status_class = f"status-{status.lower()}"
    
    st.markdown(f"""
    <div class="battery-card">
        <h2>🔋 {battery.get('batteryId', 'N/A')}</h2>
        <p><strong>Passeport:</strong> {battery.get('batteryPassportId', 'N/A')}</p>
        <p><strong>Modèle:</strong> {battery.get('modelName', 'N/A')} ({battery.get('manufacturer', 'N/A')})</p>
        <p><strong>Type:</strong> {battery.get('batteryType', 'N/A')}</p>
        <p><strong>Chimie:</strong> {battery.get('composition', 'N/A')}</p>
        <p><strong>Masse:</strong> {battery.get('massKg', 'N/A')} kg</p>
        <p><strong>Date fabrication:</strong> {battery.get('manufacturingDate', 'N/A')}</p>
        <p><strong>Statut:</strong> <span class="{status_class}">{status}</span></p>
    </div>
    """, unsafe_allow_html=True)

# ============================================
# PAGE PRINCIPALE
# ============================================

st.title("🔧 Interface Garagiste")
st.markdown("**Battery Passport** - Diagnostic et signalement des batteries")

st.divider()

# ============================================
# SECTION : SCAN QR CODE / SÉLECTION
# ============================================

st.subheader("📱 Scanner ou Sélectionner une batterie")

col1, col2 = st.columns([2, 1])

with col1:
    # Simulation du scan QR (en vrai, on utiliserait la caméra)
    battery_id_input = st.text_input(
        "ID Batterie (ou scanner QR code)",
        placeholder="BP-2024-CATL-001",
        help="Entrez l'ID de la batterie ou scannez le QR code"
    )

with col2:
    # Dropdown avec les batteries existantes
    batteries = get_all_batteries()
    battery_options = [""] + [b.get("batteryId", "") for b in batteries]
    selected_battery = st.selectbox("Ou sélectionner:", battery_options)

# Déterminer l'ID à utiliser
battery_id = battery_id_input or selected_battery

if st.button("🔍 Rechercher", type="primary", use_container_width=True):
    if battery_id:
        st.session_state["current_battery_id"] = battery_id
    else:
        st.warning("Veuillez entrer ou sélectionner un ID de batterie")

# ============================================
# SECTION : AFFICHAGE BATTERIE
# ============================================

if "current_battery_id" in st.session_state and st.session_state["current_battery_id"]:
    battery_id = st.session_state["current_battery_id"]
    
    st.divider()
    
    # Charger les données
    battery = get_battery(battery_id)
    diagnostic = get_diagnostic(battery_id)
    
    if battery:
        # ============================================
        # INFOS BATTERIE
        # ============================================
        st.subheader("🔋 Informations Batterie")
        render_battery_card(battery)
        
        # ============================================
        # DIAGNOSTIC
        # ============================================
        if diagnostic:
            st.subheader("🩺 Diagnostic")
            
            diag_data = diagnostic.get("diagnostic", {})
            health_status = diag_data.get("healthStatus", "UNKNOWN")
            
            # Afficher le statut de santé
            if health_status == "CRITICAL":
                st.error(f"⚠️ **ÉTAT CRITIQUE** - {diagnostic.get('recommendation', '')}")
            elif health_status == "WARNING":
                st.warning(f"⚡ **ATTENTION** - {diagnostic.get('recommendation', '')}")
            elif health_status == "FAIR":
                st.info(f"📊 **ACCEPTABLE** - {diagnostic.get('recommendation', '')}")
            else:
                st.success(f"✅ **BON ÉTAT** - {diagnostic.get('recommendation', '')}")
            
            # Métriques
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("SOH Moyen", f"{diag_data.get('avgSoh', 0):.1f}%")
            with col2:
                st.metric("Modules Défaillants", f"{diag_data.get('defectiveModules', 0)}/{diag_data.get('totalModules', 0)}")
            with col3:
                st.metric("Temp. Moyenne", f"{diag_data.get('avgTemperature', 0):.1f}°C")
            with col4:
                st.metric("Voltage Moyen", f"{diag_data.get('avgVoltage', 0):.2f}V")
        
        # ============================================
        # MODULES (JAUGES)
        # ============================================
        st.subheader("📊 État des Modules")
        
        modules = battery.get("modules", [])
        if modules:
            cols = st.columns(len(modules))
            for i, module in enumerate(modules):
                with cols[i]:
                    render_module_gauge(module)
        
        # ============================================
        # ALERTE SI DÉFAILLANT
        # ============================================
        if battery.get("hasDefectiveModule"):
            st.divider()
            st.subheader("🚨 Alerte - Module(s) Défaillant(s)")
            
            st.markdown("""
            <div class="alert-box">
                <h4>⚠️ Batterie Hors d'Usage Détectée</h4>
                <p>Un ou plusieurs modules présentent une résistance interne supérieure au seuil maximal.</p>
                <p>Cette batterie doit être signalée au Propriétaire du Battery Passport pour changement de statut.</p>
            </div>
            """, unsafe_allow_html=True)
            
            # Formulaire de signalement
            with st.form("report_waste_form"):
                st.write("**Signaler cette batterie comme Waste:**")
                
                garage_name = st.text_input("Nom du garage", value="Garage Auto Plus")
                
                defective_modules = [m.get("moduleId") for m in modules if m.get("isDefective")]
                default_reason = f"Module(s) défaillant(s): {', '.join(defective_modules)} - Résistance interne critique"
                reason = st.text_area("Raison du signalement", value=default_reason)
                
                submitted = st.form_submit_button("🚨 Signaler au Propriétaire BP", type="primary", use_container_width=True)
                
                if submitted:
                    success, result = report_waste(battery_id, reason, garage_name)
                    if success:
                        st.success("✅ Notification envoyée au Propriétaire BP!")
                        st.json(result)
                    else:
                        st.error(f"❌ Erreur: {result}")
        
        # ============================================
        # QR CODE
        # ============================================
        st.divider()
        st.subheader("📱 QR Code Batterie")
        
        qr_url = f"{API_BASE_URL}/battery/{battery_id}/qrcode"
        st.image(qr_url, width=200)
        st.caption(f"Scan pour accéder au passeport: {battery_id}")
        
    else:
        st.error(f"❌ Batterie '{battery_id}' non trouvée")

# ============================================
# SIDEBAR - INFOS
# ============================================

with st.sidebar:
    st.header("ℹ️ Aide")
    st.markdown("""
    **Workflow Garagiste:**
    1. Scanner le QR code de la batterie
    2. Consulter le diagnostic
    3. Vérifier l'état des modules
    4. Si défaillant → Signaler au Propriétaire BP
    
    **Codes couleur modules:**
    - 🟢 OK (< 80% du max)
    - 🟡 Warning (80-100% du max)
    - 🔴 Critique (> 100% du max)
    """)
    
    st.divider()
    st.caption(f"API: {API_BASE_URL}")
    st.caption(f"Dernière maj: {datetime.now().strftime('%H:%M:%S')}")