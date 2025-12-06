"""
Knowledge Graph Manager for Voyager Agent
Manages Neo4j database for minecraft game knowledge and learned experiences
"""

from neo4j import GraphDatabase
import json
import os


class KnowledgeGraphManager:
    """
    Manages Neo4j knowledge graph for reducing hallucinations and providing context
    """
    
    def __init__(self, neo4j_uri, neo4j_user, neo4j_password, ckpt_dir="ckpt"):
        """
        Initialize connection to Neo4j Aura
        
        Args:
            neo4j_uri: Your Neo4j Aura connection URI (e.g., neo4j+s://xxxxx.databases.neo4j.io)
            neo4j_user: Username (usually 'neo4j')
            neo4j_password: Your Neo4j Aura password
            ckpt_dir: Checkpoint directory for persistent storage
        """
        self.driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
        self.ckpt_dir = ckpt_dir
        
        # Verify connection
        self._verify_connection()
        
        # Initialize schema and seed data
        self._initialize_schema()
    
    def _verify_connection(self):
        """Test Neo4j connection"""
        try:
            with self.driver.session() as session:
                result = session.run("RETURN 1 as test")
                print(f"\033[35m✓ Successfully connected to Neo4j\033[0m")
        except Exception as e:
            print(f"\033[31m✗ Failed to connect to Neo4j: {e}\033[0m")
            raise
    
    def _initialize_schema(self):
        """Create indexes and constraints for better performance"""
        with self.driver.session() as session:
            # Create indexes on frequently queried properties
            session.run("CREATE INDEX item_name IF NOT EXISTS FOR (i:Item) ON (i.name)")
            session.run("CREATE INDEX mob_name IF NOT EXISTS FOR (m:Mob) ON (m.name)")
            session.run("CREATE INDEX tool_name IF NOT EXISTS FOR (t:Tool) ON (t.name)")
            session.run("CREATE INDEX skill_name IF NOT EXISTS FOR (s:Skill) ON (s.name)")
            print(f"\033[35m✓ Neo4j schema initialized\033[0m")
    
    def load_minecraft_seed_data(self, seed_data_path=None):
        """
        Load initial Minecraft knowledge from seed data
        This populates basic crafting recipes, mob drops, etc.
        """
        if seed_data_path is None:
            seed_data_path = os.path.join(os.path.dirname(__file__), "seed_data.json")
        
        if not os.path.exists(seed_data_path):
            print(f"\033[33m⚠ No seed data found at {seed_data_path}, starting with empty graph\033[0m")
            return
        
        with open(seed_data_path, 'r') as f:
            seed_data = json.load(f)
        
        with self.driver.session() as session:
            # Load items
            for item in seed_data.get('items', []):
                session.run("""
                    MERGE (i:Item {name: $name})
                    SET i.type = $type,
                        i.stackable = $stackable
                """, name=item['name'], type=item.get('type', 'unknown'), 
                   stackable=item.get('stackable', True))
            
            # Load crafting relationships
            for recipe in seed_data.get('recipes', []):
                session.run("""
                    MATCH (result:Item {name: $result})
                    MATCH (ingredient:Item {name: $ingredient})
                    MERGE (result)-[r:REQUIRES {quantity: $quantity}]->(ingredient)
                """, result=recipe['result'], ingredient=recipe['ingredient'],
                   quantity=recipe.get('quantity', 1))
            
            print(f"\033[35m✓ Loaded seed data into knowledge graph\033[0m")
    
    # ==================== QUERY METHODS (Read Operations) ====================
    
    def get_achievable_tasks(self, inventory, skills=None, biome=None):
        """
        Query for tasks that are currently achievable given inventory and skills
        
        Returns:
            List of achievable task descriptions
        """
        # Example query - you'll expand this based on your needs
        with self.driver.session() as session:
            result = session.run("""
                MATCH (item:Item)
                WHERE NOT item.name IN $inventory_items
                RETURN item.name as task_item
                LIMIT 10
            """, inventory_items=list(inventory.keys()) if inventory else [])
            
            tasks = [f"Acquire {record['task_item']}" for record in result]
            return tasks
    
    def get_task_prerequisites(self, task_name):
        """
        Get what's needed to accomplish a specific task
        
        Returns:
            Dictionary with requirements and context
        """
        # Parse task to extract item name
        # This is simplified - you'd want more robust parsing
        item_name = task_name.replace("craft ", "").replace("acquire ", "").strip()
        
        with self.driver.session() as session:
            result = session.run("""
                MATCH (item:Item {name: $item_name})
                OPTIONAL MATCH (item)-[r:REQUIRES]->(ingredient:Item)
                RETURN item.name as item,
                       collect({name: ingredient.name, quantity: r.quantity}) as requirements
            """, item_name=item_name)
            
            record = result.single()
            if record:
                return {
                    "item": record["item"],
                    "requirements": record["requirements"]
                }
            return None
    
    def get_item_dependencies(self, item_name, depth=3):
        """
        Get full dependency chain for an item (e.g., fishing_rod -> string -> spider)
        
        Returns:
            Nested dependency structure
        """
        with self.driver.session() as session:
            result = session.run(f"""
                MATCH path = (item:Item {{name: $item_name}})-[:REQUIRES*1..{depth}]->(dependency)
                RETURN path
            """, item_name=item_name)
            
            dependencies = []
            for record in result:
                dependencies.append(str(record["path"]))
            
            return dependencies
    
    def validate_task_feasibility(self, task_description, current_inventory):
        """
        Check if a proposed task is actually feasible given current state
        
        Returns:
            (is_feasible: bool, missing_items: list)
        """
        # Extract item from task description
        # This needs more sophisticated parsing in production
        item_name = self._extract_item_from_task(task_description)
        
        prereqs = self.get_task_prerequisites(item_name)
        if not prereqs:
            return True, []  # Unknown task, assume feasible for now
        
        missing = []
        for req in prereqs.get('requirements', []):
            if req['name'] not in current_inventory:
                missing.append(req['name'])
        
        return len(missing) == 0, missing
    
    # ==================== UPDATE METHODS (Write Operations) ====================
    
    def record_task_outcome(self, task, success, inventory_before, inventory_after):
        """
        Learn from task execution to build empirical knowledge
        """
        if not success:
            return  # Only learn from successful tasks for now
        
        # Identify new items acquired
        new_items = set(inventory_after.keys()) - set(inventory_before.keys())
        
        with self.driver.session() as session:
            for item in new_items:
                # Record that this task produces this item
                session.run("""
                    MERGE (t:Task {name: $task})
                    MERGE (i:Item {name: $item})
                    MERGE (t)-[r:PRODUCES]->(i)
                    SET r.confidence = coalesce(r.confidence, 0) + 0.1,
                        r.last_observed = datetime()
                """, task=task, item=item)
    
    def add_discovered_relationship(self, source, relationship, target, metadata=None):
        """
        Add a newly discovered relationship to the graph
        """
        with self.driver.session() as session:
            session.run(f"""
                MERGE (s {{name: $source}})
                MERGE (t {{name: $target}})
                MERGE (s)-[r:{relationship}]->(t)
                SET r += $metadata
            """, source=source, target=target, metadata=metadata or {})
    
    # ==================== UTILITY METHODS ====================
    
    def _extract_item_from_task(self, task_description):
        """Extract item name from task description"""
        # Simple extraction - improve this based on your task format
        common_verbs = ['craft', 'acquire', 'get', 'obtain', 'mine', 'kill', 'make']
        task_lower = task_description.lower()
        
        for verb in common_verbs:
            if verb in task_lower:
                return task_lower.split(verb)[-1].strip()
        
        return task_description.strip()
    
    def close(self):
        """Close Neo4j connection"""
        if self.driver:
            self.driver.close()
            print(f"\033[35m✓ Closed Neo4j connection\033[0m")
    
    def __del__(self):
        """Cleanup on deletion"""
        self.close()
