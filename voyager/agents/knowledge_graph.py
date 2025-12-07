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
        Learn from task execution to build empirical knowledge.
        Records basic task → item relationships.
        """
        if not success:
            return  # Only learn from successful tasks for now
        
        # Use enhanced learning method
        self.learn_from_task_execution(task, inventory_before, inventory_after)
    
    def learn_from_task_execution(self, task, inventory_before, inventory_after, events=None):
        """
        Enhanced learning that extracts multiple relationship types from task execution.
        
        Learns:
        - Task → PRODUCES → Item (what items a task gives)
        - Mob → DROPS → Item (what mobs drop)
        - Block → YIELDS → Item (what blocks yield when mined)
        - Item → CRAFTED_FROM → Item (crafting relationships)
        
        Args:
            task: The task description (e.g., "kill spider", "mine coal")
            inventory_before: Inventory dict before task execution
            inventory_after: Inventory dict after task execution
            events: Optional event list for additional context
        """
        if not inventory_after:
            return
        
        inventory_before = inventory_before or {}
        
        # Identify gained items (new items or quantity increases)
        gained_items = {}
        for item, qty in inventory_after.items():
            before_qty = inventory_before.get(item, 0)
            if qty > before_qty:
                gained_items[item] = qty - before_qty
        
        # Identify consumed items
        consumed_items = {}
        for item, qty in inventory_before.items():
            after_qty = inventory_after.get(item, 0)
            if qty > after_qty:
                consumed_items[item] = qty - after_qty
        
        if not gained_items:
            return  # Nothing new learned
        
        task_lower = task.lower()
        
        with self.driver.session() as session:
            for item, quantity in gained_items.items():
                # Record general task → item relationship
                session.run("""
                    MERGE (t:Task {name: $task})
                    MERGE (i:Item {name: $item})
                    MERGE (t)-[r:PRODUCES]->(i)
                    SET r.confidence = coalesce(r.confidence, 0) + 0.1,
                        r.quantity_observed = coalesce(r.quantity_observed, 0) + $quantity,
                        r.times_observed = coalesce(r.times_observed, 0) + 1,
                        r.last_observed = datetime()
                """, task=task, item=item, quantity=quantity)
                
                # Learn specific relationships based on task type
                if "kill" in task_lower or "hunt" in task_lower:
                    mob_name = self._extract_mob_from_task(task)
                    if mob_name:
                        session.run("""
                            MERGE (m:Mob {name: $mob})
                            MERGE (i:Item {name: $item})
                            MERGE (m)-[r:DROPS]->(i)
                            SET r.confidence = coalesce(r.confidence, 0) + 0.1,
                                r.times_observed = coalesce(r.times_observed, 0) + 1,
                                r.avg_quantity = coalesce(r.avg_quantity, 0) * 0.9 + $quantity * 0.1,
                                r.last_observed = datetime()
                        """, mob=mob_name, item=item, quantity=quantity)
                        print(f"\033[36m[KG] Learned: {mob_name} DROPS {item}\033[0m")
                
                elif "mine" in task_lower or "dig" in task_lower:
                    block_name = self._extract_block_from_task(task)
                    if block_name:
                        session.run("""
                            MERGE (b:Block {name: $block})
                            MERGE (i:Item {name: $item})
                            MERGE (b)-[r:YIELDS]->(i)
                            SET r.confidence = coalesce(r.confidence, 0) + 0.1,
                                r.times_observed = coalesce(r.times_observed, 0) + 1,
                                r.last_observed = datetime()
                        """, block=block_name, item=item)
                        print(f"\033[36m[KG] Learned: {block_name} YIELDS {item}\033[0m")
                
                elif "craft" in task_lower or "make" in task_lower:
                    # Record what was consumed to craft this item
                    for consumed, cons_qty in consumed_items.items():
                        session.run("""
                            MERGE (result:Item {name: $result})
                            MERGE (ingredient:Item {name: $ingredient})
                            MERGE (result)-[r:CRAFTED_FROM]->(ingredient)
                            SET r.quantity = $quantity,
                                r.confidence = coalesce(r.confidence, 0) + 0.1,
                                r.times_observed = coalesce(r.times_observed, 0) + 1,
                                r.last_observed = datetime()
                        """, result=item, ingredient=consumed, quantity=cons_qty)
                        print(f"\033[36m[KG] Learned: {item} CRAFTED_FROM {consumed} (qty: {cons_qty})\033[0m")
                
                elif "smelt" in task_lower or "cook" in task_lower:
                    # Record smelting relationships
                    for consumed, cons_qty in consumed_items.items():
                        if consumed not in ['coal', 'charcoal']:  # Skip fuel
                            session.run("""
                                MERGE (result:Item {name: $result})
                                MERGE (input:Item {name: $input})
                                MERGE (result)-[r:SMELTED_FROM]->(input)
                                SET r.confidence = coalesce(r.confidence, 0) + 0.1,
                                    r.times_observed = coalesce(r.times_observed, 0) + 1,
                                    r.last_observed = datetime()
                            """, result=item, input=consumed)
                            print(f"\033[36m[KG] Learned: {item} SMELTED_FROM {consumed}\033[0m")
    
    def _extract_mob_from_task(self, task):
        """Extract mob name from task like 'kill one spider'"""
        task_lower = task.lower()
        # Common Minecraft mobs
        mobs = [
            'spider', 'zombie', 'skeleton', 'creeper', 'pig', 'cow', 'sheep', 
            'chicken', 'enderman', 'slime', 'witch', 'blaze', 'ghast',
            'piglin', 'hoglin', 'drowned', 'phantom', 'pillager', 'ravager',
            'silverfish', 'cave_spider', 'bee', 'wolf', 'fox', 'rabbit',
            'squid', 'dolphin', 'turtle', 'cod', 'salmon', 'pufferfish'
        ]
        for mob in mobs:
            if mob.replace('_', ' ') in task_lower or mob in task_lower:
                return mob
        return None
    
    def _extract_block_from_task(self, task):
        """Extract block name from task like 'mine 3 cobblestone'"""
        task_lower = task.lower()
        # Common Minecraft blocks/ores
        blocks = [
            'stone', 'cobblestone', 'wood', 'log', 'oak_log', 'birch_log', 
            'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log',
            'dirt', 'grass', 'sand', 'gravel', 'clay',
            'coal', 'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore',
            'emerald_ore', 'lapis_ore', 'redstone_ore', 'copper_ore',
            'deepslate', 'granite', 'diorite', 'andesite',
            'obsidian', 'netherrack', 'end_stone'
        ]
        for block in blocks:
            if block.replace('_', ' ') in task_lower or block in task_lower:
                return block
        return None
    
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
    
    def record_skill(self, skill_name, description, task, inventory_before=None, inventory_after=None):
        """
        Record a learned skill and what it produces to the knowledge graph.
        
        Args:
            skill_name: Name of the skill function (e.g., "craftWoodenPickaxe")
            description: Auto-generated description of the skill
            task: The task this skill was created for
            inventory_before: Inventory before skill execution
            inventory_after: Inventory after skill execution
        """
        inventory_before = inventory_before or {}
        inventory_after = inventory_after or {}
        
        # Calculate items produced by this skill
        produced_items = []
        for item, qty in inventory_after.items():
            before_qty = inventory_before.get(item, 0)
            if qty > before_qty:
                produced_items.append(item)
        
        with self.driver.session() as session:
            # Create/update skill node
            session.run("""
                MERGE (s:Skill {name: $skill_name})
                SET s.description = $description,
                    s.source_task = $task,
                    s.times_used = coalesce(s.times_used, 0) + 1,
                    s.last_updated = datetime()
            """, skill_name=skill_name, description=description, task=task)
            
            # Link skill to items it produces
            for item in produced_items:
                session.run("""
                    MATCH (s:Skill {name: $skill_name})
                    MERGE (i:Item {name: $item})
                    MERGE (s)-[r:PRODUCES]->(i)
                    SET r.confidence = 1.0,
                        r.last_observed = datetime()
                """, skill_name=skill_name, item=item)
            
            # Link skill to task
            session.run("""
                MATCH (s:Skill {name: $skill_name})
                MERGE (t:Task {name: $task})
                MERGE (s)-[r:ACCOMPLISHES]->(t)
                SET r.last_used = datetime()
            """, skill_name=skill_name, task=task)
            
            if produced_items:
                print(f"\033[36m[KG] Recorded skill '{skill_name}' produces: {', '.join(produced_items)}\033[0m")
            else:
                print(f"\033[36m[KG] Recorded skill '{skill_name}' for task: {task}\033[0m")
    
    def get_skill_for_item(self, item_name):
        """
        Query for skills that can produce a specific item.
        
        Args:
            item_name: The item to find skills for
            
        Returns:
            List of skill names that produce this item
        """
        with self.driver.session() as session:
            result = session.run("""
                MATCH (s:Skill)-[:PRODUCES]->(i:Item {name: $item_name})
                RETURN s.name as skill_name, s.description as description
            """, item_name=item_name)
            
            return [{"name": r["skill_name"], "description": r["description"]} for r in result]
    
    def get_learned_relationships_summary(self):
        """
        Get a summary of all learned relationships for debugging/analysis.
        
        Returns:
            Dictionary with counts of different relationship types
        """
        with self.driver.session() as session:
            result = session.run("""
                MATCH ()-[r]->()
                RETURN type(r) as relationship_type, count(r) as count
                ORDER BY count DESC
            """)
            
            return {r["relationship_type"]: r["count"] for r in result}
    
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
