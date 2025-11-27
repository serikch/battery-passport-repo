"""
Connexion Neo4j - Singleton pattern
Gère la connexion à la base de données graphe
"""

import os
from contextlib import contextmanager
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

class Neo4jConnection:
    """Singleton pour gérer la connexion Neo4j"""
    
    _instance = None
    _driver = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._driver is None:
            uri = os.getenv("NEO4J_URI")
            user = os.getenv("NEO4J_USER")
            password = os.getenv("NEO4J_PASSWORD")
            
            try:
                self._driver = GraphDatabase.driver(uri, auth=(user, password))
                # Test de connexion
                self._driver.verify_connectivity()
                print(f"✅ Connecté à Neo4j: {uri}")
            except Exception as e:
                print(f"❌ Erreur connexion Neo4j: {e}")
                raise
    
    @property
    def driver(self):
        return self._driver
    
    def close(self):
        if self._driver:
            self._driver.close()
            print("🔌 Connexion Neo4j fermée")
    
    @contextmanager
    def session(self):
        """Context manager pour les sessions Neo4j"""
        session = self._driver.session()
        try:
            yield session
        finally:
            session.close()
    
    def execute_query(self, query: str, parameters: dict = None):
        """Exécute une requête Cypher et retourne les résultats"""
        with self.session() as session:
            result = session.run(query, parameters or {})
            return [record.data() for record in result]
    
    def execute_write(self, query: str, parameters: dict = None):
        """Exécute une requête d'écriture (CREATE, UPDATE, DELETE)"""
        with self.session() as session:
            result = session.run(query, parameters or {})
            summary = result.consume()
            return {
                "nodes_created": summary.counters.nodes_created,
                "nodes_deleted": summary.counters.nodes_deleted,
                "relationships_created": summary.counters.relationships_created,
                "properties_set": summary.counters.properties_set
            }


# Instance globale
db = Neo4jConnection()


# Fonctions utilitaires pour les requêtes courantes
def get_battery_by_id(battery_id: str):
    """Récupère une batterie par son ID avec toutes ses relations"""
    query = """
    MATCH (b:BatteryInstance {batteryId: $battery_id})
    OPTIONAL MATCH (b)-[:HAS_MODEL]->(m:Model)
    OPTIONAL MATCH (m)-[:MANUFACTURED_BY]->(c:Company)
    OPTIONAL MATCH (m)-[:HAS_TYPE]->(t:Type)
    OPTIONAL MATCH (m)-[:HAS_COMPOSITION]->(comp:Composition)
    OPTIONAL MATCH (b)-[:HAS_STATUS]->(s:Status)
    RETURN b, m, c, t, comp, s
    """
    results = db.execute_query(query, {"battery_id": battery_id})
    return results[0] if results else None


def get_battery_modules(battery_id: str):
    """Récupère tous les modules d'une batterie"""
    query = """
    MATCH (b:BatteryInstance {batteryId: $battery_id})-[:HAS_MODULE]->(m:Module)
    RETURN m.moduleId AS moduleId,
           m.internalResistance AS internalResistance,
           m.maxResistance AS maxResistance,
           m.voltage AS voltage,
           m.temperature AS temperature,
           m.soh AS soh,
           CASE WHEN m.internalResistance > m.maxResistance THEN true ELSE false END AS isDefective
    ORDER BY m.moduleId
    """
    return db.execute_query(query, {"battery_id": battery_id})


def update_battery_status(battery_id: str, new_status: str):
    """Change le statut d'une batterie"""
    query = """
    MATCH (b:BatteryInstance {batteryId: $battery_id})-[r:HAS_STATUS]->()
    DELETE r
    WITH b
    MATCH (s:Status {name: $new_status})
    CREATE (b)-[:HAS_STATUS]->(s)
    SET b.status = $new_status
    RETURN b.batteryId AS batteryId, b.status AS status
    """
    return db.execute_query(query, {"battery_id": battery_id, "new_status": new_status})


def get_all_batteries():
    """Liste toutes les batteries avec leur statut"""
    query = """
    MATCH (b:BatteryInstance)
    OPTIONAL MATCH (b)-[:HAS_STATUS]->(s:Status)
    OPTIONAL MATCH (b)-[:HAS_MODEL]->(m:Model)-[:MANUFACTURED_BY]->(c:Company)
    RETURN b.batteryId AS batteryId,
           b.batteryPassportId AS passportId,
           b.status AS status,
           m.name AS modelName,
           c.name AS manufacturer
    ORDER BY b.batteryId
    """
    return db.execute_query(query)


def get_defective_modules():
    """Trouve tous les modules défaillants (résistance > max)"""
    query = """
    MATCH (b:BatteryInstance)-[:HAS_MODULE]->(m:Module)
    WHERE m.internalResistance > m.maxResistance
    RETURN b.batteryId AS batteryId,
           m.moduleId AS moduleId,
           m.internalResistance AS resistance,
           m.maxResistance AS maxResistance
    """
    return db.execute_query(query)