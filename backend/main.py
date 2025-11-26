"""
Battery Passport API - Point d'entrée FastAPI
Serveur principal pour le hackathon ESILV x Capgemini
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Import des routers (à décommenter quand créés)
from routers import batteries, modules, notifications

# Import de la connexion DB
from database import db


# ============================================
# LIFESPAN - Gestion connexion DB
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gère le cycle de vie de l'application"""
    # Startup
    print("🚀 Démarrage Battery Passport API...")
    print("✅ Connexion Neo4j établie")
    yield
    # Shutdown
    print("🛑 Arrêt de l'API...")
    db.close()


# ============================================
# APPLICATION FASTAPI
# ============================================

app = FastAPI(
    title="Battery Passport API",
    description="""
    ## API pour le hackathon Battery Passport - ESILV x Capgemini
    
    ### Fonctionnalités:
    - 🔋 **Batteries** : CRUD sur les passeports de batteries
    - 📊 **Modules** : Télémétrie et diagnostic (Défi #1)
    - 🔔 **Notifications** : Workflow garagiste → propriétaire → centre de tri
    - 🎯 **Décision** : Algorithme d'aide à la décision (Défi #3)
    
    ### Rôles:
    - **Garagiste** : Scan QR, diagnostic, signalement
    - **Propriétaire BP** : Gestion statuts, notifications
    - **Centre de tri** : Réception, décision recyclage
    """,
    version="1.0.0",
    contact={
        "name": "Équipe Battery Passport",
        "email": "team@batterypassport.dev"
    },
    license_info={
        "name": "MIT",
    },
    lifespan=lifespan
)


# ============================================
# CORS - Autoriser les frontends
# ============================================

origins = [
    "http://localhost:8501",      # Streamlit Garagiste
    "http://localhost:8502",      # Streamlit Propriétaire
    "http://localhost:8503",      # Streamlit Centre de tri
    "http://localhost:3000",      # React (si utilisé)
    "http://127.0.0.1:8501",
    "http://127.0.0.1:8502",
    "http://127.0.0.1:8503",
    os.getenv("FRONTEND_URL", "http://localhost:8501"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# STATIC FILES (QR Codes)
# ============================================

# Créer le dossier si nécessaire
os.makedirs("static/qrcodes", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")


# ============================================
# ROUTERS
# ============================================

app.include_router(
    batteries.router,
    prefix="/battery",
    tags=["🔋 Batteries"]
)

app.include_router(
    modules.router,
    prefix="/modules",
    tags=["📊 Modules & Télémétrie"]
)

app.include_router(
    notifications.router,
    prefix="/notifications",
    tags=["🔔 Notifications"]
)


# ============================================
# ROUTES RACINE
# ============================================

@app.get("/", tags=["🏠 Root"])
async def root():
    """Page d'accueil de l'API"""
    return {
        "message": "🔋 Battery Passport API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "endpoints": {
            "batteries": "/battery",
            "modules": "/modules", 
            "notifications": "/notifications"
        }
    }


@app.get("/health", tags=["🏠 Root"])
async def health_check():
    """Vérification santé de l'API et connexion Neo4j"""
    try:
        # Test requête Neo4j
        result = db.execute_query("RETURN 1 AS test")
        neo4j_status = "connected" if result else "error"
    except Exception as e:
        neo4j_status = f"error: {str(e)}"
    
    return {
        "status": "healthy" if neo4j_status == "connected" else "degraded",
        "api": "running",
        "neo4j": neo4j_status
    }


@app.get("/stats", tags=["🏠 Root"])
async def get_stats():
    """Statistiques globales de la base de données"""
    try:
        # Compter les batteries par statut
        query = """
        MATCH (b:BatteryInstance)
        RETURN b.status AS status, count(*) AS count
        """
        status_counts = db.execute_query(query)
        
        # Compter les modules défaillants
        defective_query = """
        MATCH (b:BatteryInstance)-[:HAS_MODULE]->(m:Module)
        WHERE m.internalResistance > m.maxResistance
        RETURN count(m) AS defectiveCount
        """
        defective = db.execute_query(defective_query)
        
        # Total batteries et modules
        totals_query = """
        MATCH (b:BatteryInstance)
        OPTIONAL MATCH (b)-[:HAS_MODULE]->(m:Module)
        RETURN count(DISTINCT b) AS totalBatteries, count(m) AS totalModules
        """
        totals = db.execute_query(totals_query)
        
        return {
            "totalBatteries": totals[0]["totalBatteries"] if totals else 0,
            "totalModules": totals[0]["totalModules"] if totals else 0,
            "defectiveModules": defective[0]["defectiveCount"] if defective else 0,
            "byStatus": {item["status"]: item["count"] for item in status_counts}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# EXCEPTION HANDLERS
# ============================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc)
        }
    )


# ============================================
# LANCEMENT SERVEUR
# ============================================

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    
    print(f"""
    ╔══════════════════════════════════════════╗
    ║     🔋 Battery Passport API              ║
    ║     Hackathon ESILV x Capgemini          ║
    ╠══════════════════════════════════════════╣
    ║  Server: http://{host}:{port}              ║
    ║  Docs:   http://{host}:{port}/docs         ║
    ╚══════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True  # Hot reload en développement
    )