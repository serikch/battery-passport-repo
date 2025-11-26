"""
Interface Propriétaire Battery Passport
Desktop : Notifications → Validation → Changement Statut

Lancer avec : streamlit run frontend/proprietaire.py --server.port 8502
"""

import streamlit as st
import requests
from datetime import datetime

# ============================================
# CONFIGURATION
# ============================================

API_BASE_URL = "http://localhost:8000"

st.set_page_config(
    page_title="🏢 Propriétaire BP - Battery Passport",
    page_icon="🏢",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================
# STYLES CSS
# ============================================

st.markdown("""
<style>
    .notification-card {
        background: white;
        border-radius: 10px;
        padding: 20px;
        margin: 10px 0;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        border-left: 5px solid #3498db;
    }
    
    .notification-card.urgent {
        border-left-color: #e74c3c;
        background: #fff5f5;
    }
    
    .notification-card.normal {
        border-left-color: #f39c12;
    }
    
    .stat-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 15px;
        padding: 20px;
        color: white;
        text-align: center;
    }
    
    .battery-row {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 15px;
        margin: 5px 0;
    }
    
    .status-badge {
        padding: 5px 15px;
        border-radius: 20px;
        font-weight: bold;
        display: inline-block;
    }
    
    .status-original { background: #3498db; color: white; }
    .status-waste { background: #e74c3c; color: white; }
    .status-reused { background: #2ecc71; color: white; }
    .status-repurposed { background: #9b59b6; color: white; }
</style>
""", unsafe_allow_html=True)

# ============================================
# FONCTIONS API
# ============================================

def get_stats():
    """Récupère les statistiques globales"""
    try:
        response = requests.get(f"{API_BASE_URL}/stats")
        return response.json() if response.status_code == 200 else {}
    except:
        return {}

def get_all_batteries():
    """Liste toutes les batteries"""
    try:
        response = requests.get(f"{API_BASE_URL}/battery/")
        return response.json() if response.status_code == 200 else []
    except:
        return []

def get_notifications(unread_only=False):
    """Récupère les notifications"""
    try:
        params = {"unread_only": unread_only}
        response = requests.get(f"{API_BASE_URL}/notifications/", params=params)
        return response.json() if response.status_code == 200 else []
    except:
        return []

def get_unread_count():
    """Compte les notifications non lues"""
    try:
        response = requests.get(f"{API_BASE_URL}/notifications/unread/count")
        return response.json().get("unreadCount", 0) if response.status_code == 200 else 0
    except:
        return 0

def mark_as_read(notification_id: str):
    """Marque une notification comme lue"""
    try:
        response = requests.put(f"{API_BASE_URL}/notifications/{notification_id}/read")
        return response.status_code == 200
    except:
        return False

def change_battery_status(battery_id: str, new_status: str, reason: str = ""):
    """Change le statut d'une batterie"""
    try:
        response = requests.put(
            f"{API_BASE_URL}/battery/{battery_id}/status",
            json={"newStatus": new_status, "reason": reason}
        )
        return response.status_code == 200, response.json()
    except Exception as e:
        return False, str(e)

def process_notification(notification_id: str, new_status: str):
    """Traite une notification et change le statut"""
    try:
        response = requests.put(
            f"{API_BASE_URL}/notifications/{notification_id}/process",
            json={"newStatus": new_status}
        )
        return response.status_code == 200, response.json()
    except Exception as e:
        return False, str(e)

def get_defective_batteries():
    """Récupère les batteries avec modules défaillants"""
    try:
        response = requests.get(f"{API_BASE_URL}/battery/defective/list")
        return response.json() if response.status_code == 200 else []
    except:
        return []

def get_alerts():
    """Récupère toutes les alertes"""
    try:
        response = requests.get(f"{API_BASE_URL}/modules/alerts")
        return response.json() if response.status_code == 200 else []
    except:
        return []

# ============================================
# PAGE PRINCIPALE
# ============================================

st.title("🏢 Interface Propriétaire Battery Passport")
st.markdown("**Gestion des statuts et notifications**")

# ============================================
# SIDEBAR - NAVIGATION
# ============================================

with st.sidebar:
    st.header("📋 Navigation")
    
    # Compteur notifications
    unread_count = get_unread_count()
    if unread_count > 0:
        st.error(f"🔔 {unread_count} notification(s) non lue(s)")
    
    page = st.radio(
        "Section",
        ["📊 Dashboard", "🔔 Notifications", "🔋 Batteries", "⚠️ Alertes"],
        index=0
    )
    
    st.divider()
    
    # Rafraîchissement
    if st.button("🔄 Rafraîchir", use_container_width=True):
        st.rerun()
    
    st.divider()
    st.caption(f"API: {API_BASE_URL}")
    st.caption(f"Maj: {datetime.now().strftime('%H:%M:%S')}")

# ============================================
# PAGE : DASHBOARD
# ============================================

if page == "📊 Dashboard":
    st.header("📊 Dashboard")
    
    # Stats
    stats = get_stats()
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("🔋 Total Batteries", stats.get("totalBatteries", 0))
    with col2:
        st.metric("📦 Total Modules", stats.get("totalModules", 0))
    with col3:
        st.metric("⚠️ Modules Défaillants", stats.get("defectiveModules", 0))
    with col4:
        st.metric("🔔 Notifications", get_unread_count())
    
    st.divider()
    
    # Répartition par statut
    st.subheader("📈 Répartition par Statut")
    
    by_status = stats.get("byStatus", {})
    if by_status:
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Original", by_status.get("Original", 0), delta=None)
        with col2:
            st.metric("Waste", by_status.get("Waste", 0), delta=None, delta_color="inverse")
        with col3:
            st.metric("Reused", by_status.get("Reused", 0), delta=None)
        with col4:
            st.metric("Repurposed", by_status.get("Repurposed", 0), delta=None)
    
    st.divider()
    
    # Alertes récentes
    st.subheader("🚨 Alertes Récentes")
    
    alerts = get_alerts()
    if alerts:
        for alert in alerts[:5]:
            st.warning(
                f"**{alert.get('batteryId')}** - Module {alert.get('moduleId')}: "
                f"Résistance {alert.get('resistance')}Ω > Max {alert.get('maxResistance')}Ω "
                f"({alert.get('overloadPercent')}% de surcharge)"
            )
    else:
        st.success("✅ Aucune alerte active")

# ============================================
# PAGE : NOTIFICATIONS
# ============================================

elif page == "🔔 Notifications":
    st.header("🔔 Notifications")
    
    # Filtres
    col1, col2 = st.columns([1, 3])
    with col1:
        show_unread_only = st.checkbox("Non lues uniquement", value=False)
    
    notifications = get_notifications(unread_only=show_unread_only)
    
    if notifications:
        for notif in notifications:
            urgency = notif.get("urgency", "normal")
            card_class = "urgent" if urgency == "high" else "normal"
            read_status = "✓ Lu" if notif.get("read") else "● Non lu"
            
            with st.container():
                st.markdown(f"""
                <div class="notification-card {card_class}">
                    <strong>🔔 {notif.get('batteryId', 'N/A')}</strong>
                    <span style="float:right; color: {'green' if notif.get('read') else 'red'};">{read_status}</span>
                    <p>{notif.get('message', '')}</p>
                    <small>
                        De: {notif.get('senderRole', '')} ({notif.get('senderName', '')}) |
                        Urgence: {urgency} |
                        Statut: {notif.get('status', 'pending')}
                    </small>
                </div>
                """, unsafe_allow_html=True)
                
                # Actions
                col1, col2, col3 = st.columns(3)
                
                notif_id = notif.get("notificationId", "")
                
                with col1:
                    if not notif.get("read"):
                        if st.button(f"✓ Marquer lu", key=f"read_{notif_id}"):
                            if mark_as_read(notif_id):
                                st.success("Marqué comme lu")
                                st.rerun()
                
                with col2:
                    if notif.get("status") == "pending":
                        if st.button(f"✅ Valider → Waste", key=f"validate_{notif_id}"):
                            success, result = process_notification(notif_id, "Waste")
                            if success:
                                st.success(f"Statut changé: {result.get('previousStatus')} → {result.get('newStatus')}")
                                st.rerun()
                            else:
                                st.error(f"Erreur: {result}")
                
                with col3:
                    if st.button(f"👁️ Voir batterie", key=f"view_{notif_id}"):
                        st.session_state["view_battery"] = notif.get("batteryId")
                
                st.divider()
    else:
        st.info("📭 Aucune notification")

# ============================================
# PAGE : BATTERIES
# ============================================

elif page == "🔋 Batteries":
    st.header("🔋 Gestion des Batteries")
    
    # Filtre par statut
    status_filter = st.selectbox(
        "Filtrer par statut",
        ["Tous", "Original", "Waste", "Reused", "Repurposed"]
    )
    
    batteries = get_all_batteries()
    
    # Appliquer le filtre
    if status_filter != "Tous":
        batteries = [b for b in batteries if b.get("status") == status_filter]
    
    if batteries:
        for battery in batteries:
            status = battery.get("status", "Unknown")
            status_class = f"status-{status.lower()}"
            
            with st.container():
                col1, col2, col3 = st.columns([3, 2, 2])
                
                with col1:
                    st.markdown(f"""
                    **🔋 {battery.get('batteryId')}**  
                    {battery.get('modelName', 'N/A')} - {battery.get('manufacturer', 'N/A')}
                    """)
                
                with col2:
                    st.markdown(f"<span class='status-badge {status_class}'>{status}</span>", unsafe_allow_html=True)
                
                with col3:
                    # Bouton changement de statut
                    with st.popover("⚡ Changer Statut"):
                        new_status = st.selectbox(
                            "Nouveau statut",
                            ["Original", "Waste", "Reused", "Repurposed"],
                            key=f"status_{battery.get('batteryId')}"
                        )
                        reason = st.text_input("Raison", key=f"reason_{battery.get('batteryId')}")
                        
                        if st.button("Confirmer", key=f"confirm_{battery.get('batteryId')}"):
                            success, result = change_battery_status(
                                battery.get('batteryId'),
                                new_status,
                                reason
                            )
                            if success:
                                st.success(f"✅ Statut changé!")
                                st.rerun()
                            else:
                                st.error(f"❌ Erreur: {result}")
                
                st.divider()
    else:
        st.info("Aucune batterie trouvée")

# ============================================
# PAGE : ALERTES
# ============================================

elif page == "⚠️ Alertes":
    st.header("⚠️ Alertes - Modules Défaillants")
    
    alerts = get_alerts()
    defective = get_defective_batteries()
    
    if alerts:
        st.error(f"🚨 {len(alerts)} module(s) défaillant(s) détecté(s)")
        
        # Tableau des alertes
        st.subheader("📋 Détail des Alertes")
        
        for alert in alerts:
            with st.container():
                col1, col2, col3, col4 = st.columns(4)
                
                with col1:
                    st.markdown(f"**🔋 {alert.get('batteryId')}**")
                with col2:
                    st.markdown(f"Module: **{alert.get('moduleId')}**")
                with col3:
                    st.markdown(f"Résistance: **{alert.get('resistance')}Ω** / Max: {alert.get('maxResistance')}Ω")
                with col4:
                    overload = alert.get('overloadPercent', 0)
                    if overload > 200:
                        st.error(f"⚠️ {overload}%")
                    else:
                        st.warning(f"⚡ {overload}%")
                
                st.divider()
        
        # Actions groupées
        st.subheader("🔧 Actions Groupées")
        
        if st.button("📧 Notifier tous les propriétaires", type="primary"):
            st.info("Fonctionnalité à implémenter: envoi email/notification groupée")
        
    else:
        st.success("✅ Aucune alerte - Tous les modules sont dans les normes")

# ============================================
# MODAL : VOIR BATTERIE
# ============================================

if "view_battery" in st.session_state and st.session_state["view_battery"]:
    battery_id = st.session_state["view_battery"]
    
    with st.sidebar:
        st.divider()
        st.subheader(f"🔋 {battery_id}")
        
        try:
            response = requests.get(f"{API_BASE_URL}/battery/{battery_id}/full")
            if response.status_code == 200:
                battery = response.json()
                st.json(battery)
        except:
            st.error("Erreur chargement")
        
        if st.button("Fermer"):
            del st.session_state["view_battery"]
            st.rerun()