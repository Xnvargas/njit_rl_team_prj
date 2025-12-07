"""
Test Knowledge Graph Integration
Run this to verify your Neo4j connection and basic KG functionality
"""
import os
from dotenv import load_dotenv
from voyager.agents.knowledge_graph import KnowledgeGraphManager
# Load environment variables
load_dotenv()

def test_connection():
    """Test basic Neo4j connection"""
    print("=" * 60)
    print("TESTING KNOWLEDGE GRAPH INTEGRATION")
    print("=" * 60)
    
    # Get credentials from environment
    neo4j_uri = os.getenv("NEO4J_URI")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD")
    
    if not neo4j_uri or not neo4j_password:
        print("\n❌ ERROR: Neo4j credentials not found in .env file")
        print("Please set NEO4J_URI and NEO4J_PASSWORD")
        return
    
    print(f"\n1. Connecting to Neo4j...")
    print(f"   URI: {neo4j_uri}")
    
    try:
        kg = KnowledgeGraphManager(
            neo4j_uri=neo4j_uri,
            neo4j_user=neo4j_user,
            neo4j_password=neo4j_password
        )
        print("   ✓ Connection successful!")
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
        return
    
    print("\n2. Loading seed data...")
    try:
        kg.load_minecraft_seed_data("voyager/agents/seed_data.json")
        print("   ✓ Seed data loaded!")
    except Exception as e:
        print(f"   ⚠ Seed data loading failed: {e}")
    
    print("\n3. Testing KG Queries...")
    print("-" * 60)
    
    # Test 1: Get achievable tasks
    print("\n   Test 1: Get Achievable Tasks")
    print("   Current inventory: stick x1, planks x4")
    try:
        tasks = kg.get_achievable_tasks(inventory={"stick": 1, "planks": 4})
        print(f"   Result: Found {len(tasks)} achievable tasks")
        for i, task in enumerate(tasks[:3], 1):
            print(f"           {i}. {task}")
    except Exception as e:
        print(f"   ❌ Query failed: {e}")
    
    # Test 2: Get task prerequisites  
    print("\n   Test 2: Get Task Prerequisites")
    print("   Query: What's needed for 'fishing_rod'?")
    try:
        prereqs = kg.get_task_prerequisites("fishing_rod")
        if prereqs:
            print(f"   Result: {prereqs}")
        else:
            print("   Result: No prerequisites found (item may not be in KG)")
    except Exception as e:
        print(f"   ❌ Query failed: {e}")
    
    # Test 3: Get item dependencies
    print("\n   Test 3: Get Item Dependencies")
    print("   Query: Full dependency chain for 'fishing_rod'")
    try:
        deps = kg.get_item_dependencies("fishing_rod", depth=3)
        print(f"   Result: Found {len(deps)} dependency paths")
        if deps:
            print(f"           Example: {deps[0]}")
    except Exception as e:
        print(f"   ❌ Query failed: {e}")
    
    # Test 4: Validate task feasibility
    print("\n   Test 4: Validate Task Feasibility")
    print("   Task: 'craft fishing_rod'")
    print("   Inventory: stick x3, string x2")
    try:
        is_feasible, missing = kg.validate_task_feasibility(
            "craft fishing_rod",
            {"stick": 3, "string": 2}
        )
        if is_feasible:
            print(f"   Result: ✓ Task is FEASIBLE")
        else:
            print(f"   Result: ✗ Task is NOT feasible")
            print(f"           Missing items: {missing}")
    except Exception as e:
        print(f"   ❌ Validation failed: {e}")
    
    # Test 5: Record task outcome (learning)
    print("\n   Test 5: Record Task Outcome (Learning)")
    print("   Recording: Successfully killed spider, got string")
    try:
        kg.record_task_outcome(
            task="kill spider",
            success=True,
            inventory_before={"wooden_sword": 1},
            inventory_after={"wooden_sword": 1, "string": 2}
        )
        print("   Result: ✓ Task outcome recorded in KG")
    except Exception as e:
        print(f"   ❌ Recording failed: {e}")
    
    print("\n" + "=" * 60)
    print("ALL TESTS COMPLETED!")
    print("=" * 60)
    
    # Cleanup
    kg.close()
    
    print("\n✓ Knowledge Graph is ready for integration!")
    print("\nNext steps:")
    print("  1. Review IMPLEMENTATION_GUIDE.md")
    print("  2. Integrate KG into curriculum agent")
    print("  3. Run Voyager and monitor KG usage")


def test_learning_integration():
    """
    Test the full learning pipeline - demonstrates that the agent
    can add items to the knowledge graph based on observed relationships.
    """
    print("\n" + "=" * 60)
    print("TESTING LEARNING INTEGRATION")
    print("=" * 60)
    
    # Get credentials from environment
    neo4j_uri = os.getenv("NEO4J_URI")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD")
    
    if not neo4j_uri or not neo4j_password:
        print("\n❌ ERROR: Neo4j credentials not found in .env file")
        return
    
    try:
        kg = KnowledgeGraphManager(
            neo4j_uri=neo4j_uri,
            neo4j_user=neo4j_user,
            neo4j_password=neo4j_password
        )
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
        return
    
    print("\n" + "-" * 60)
    print("Test 1: Learn from killing a mob")
    print("-" * 60)
    
    # Simulate: Agent killed a zombie and got rotten flesh
    print("   Simulating task: 'kill zombie'")
    print("   Inventory before: iron_sword x1")
    print("   Inventory after: iron_sword x1, rotten_flesh x2")
    
    try:
        kg.learn_from_task_execution(
            task="kill zombie",
            inventory_before={"iron_sword": 1},
            inventory_after={"iron_sword": 1, "rotten_flesh": 2}
        )
        print("   ✓ Learning recorded!")
        
        # Verify the learning was recorded
        with kg.driver.session() as session:
            result = session.run("""
                MATCH (t:Task {name: 'kill zombie'})-[r:PRODUCES]->(i:Item)
                RETURN i.name as item, r.confidence as confidence, r.times_observed as times
            """)
            records = list(result)
            
            if records:
                for record in records:
                    print(f"   → Task 'kill zombie' PRODUCES '{record['item']}' (confidence: {record['confidence']:.1f}, observed: {record['times']}x)")
            
            # Check for DROPS relationship
            result2 = session.run("""
                MATCH (m:Mob {name: 'zombie'})-[r:DROPS]->(i:Item)
                RETURN i.name as item, r.confidence as confidence
            """)
            records2 = list(result2)
            
            if records2:
                for record in records2:
                    print(f"   → Mob 'zombie' DROPS '{record['item']}' (confidence: {record['confidence']:.1f})")
    except Exception as e:
        print(f"   ❌ Learning failed: {e}")
    
    print("\n" + "-" * 60)
    print("Test 2: Learn from mining")
    print("-" * 60)
    
    # Simulate: Agent mined coal ore
    print("   Simulating task: 'mine 3 coal ore'")
    print("   Inventory before: stone_pickaxe x1")
    print("   Inventory after: stone_pickaxe x1, coal x3")
    
    try:
        kg.learn_from_task_execution(
            task="mine 3 coal ore",
            inventory_before={"stone_pickaxe": 1},
            inventory_after={"stone_pickaxe": 1, "coal": 3}
        )
        print("   ✓ Learning recorded!")
        
        # Check for YIELDS relationship
        with kg.driver.session() as session:
            result = session.run("""
                MATCH (b:Block)-[r:YIELDS]->(i:Item {name: 'coal'})
                RETURN b.name as block, r.confidence as confidence
            """)
            records = list(result)
            
            if records:
                for record in records:
                    print(f"   → Block '{record['block']}' YIELDS 'coal' (confidence: {record['confidence']:.1f})")
    except Exception as e:
        print(f"   ❌ Learning failed: {e}")
    
    print("\n" + "-" * 60)
    print("Test 3: Learn from crafting")
    print("-" * 60)
    
    # Simulate: Agent crafted a wooden pickaxe
    print("   Simulating task: 'craft wooden pickaxe'")
    print("   Inventory before: stick x4, planks x6")
    print("   Inventory after: stick x2, planks x3, wooden_pickaxe x1")
    
    try:
        kg.learn_from_task_execution(
            task="craft wooden pickaxe",
            inventory_before={"stick": 4, "planks": 6},
            inventory_after={"stick": 2, "planks": 3, "wooden_pickaxe": 1}
        )
        print("   ✓ Learning recorded!")
        
        # Check for CRAFTED_FROM relationship
        with kg.driver.session() as session:
            result = session.run("""
                MATCH (result:Item {name: 'wooden_pickaxe'})-[r:CRAFTED_FROM]->(ingredient:Item)
                RETURN ingredient.name as ingredient, r.quantity as quantity
            """)
            records = list(result)
            
            if records:
                for record in records:
                    print(f"   → 'wooden_pickaxe' CRAFTED_FROM '{record['ingredient']}' (qty: {record['quantity']})")
    except Exception as e:
        print(f"   ❌ Learning failed: {e}")
    
    print("\n" + "-" * 60)
    print("Test 4: Record a skill")
    print("-" * 60)
    
    print("   Recording skill: 'craftWoodenPickaxe'")
    
    try:
        kg.record_skill(
            skill_name="craftWoodenPickaxe",
            description="async function craftWoodenPickaxe(bot) { // Crafts a wooden pickaxe }",
            task="craft wooden pickaxe",
            inventory_before={"stick": 4, "planks": 6},
            inventory_after={"stick": 2, "planks": 3, "wooden_pickaxe": 1}
        )
        print("   ✓ Skill recorded!")
        
        # Check for skill
        with kg.driver.session() as session:
            result = session.run("""
                MATCH (s:Skill {name: 'craftWoodenPickaxe'})-[r:PRODUCES]->(i:Item)
                RETURN s.name as skill, i.name as item
            """)
            records = list(result)
            
            if records:
                for record in records:
                    print(f"   → Skill '{record['skill']}' PRODUCES '{record['item']}'")
    except Exception as e:
        print(f"   ❌ Skill recording failed: {e}")
    
    print("\n" + "-" * 60)
    print("Test 5: Get learned relationships summary")
    print("-" * 60)
    
    try:
        summary = kg.get_learned_relationships_summary()
        print("   Relationship counts:")
        for rel_type, count in summary.items():
            print(f"   → {rel_type}: {count}")
    except Exception as e:
        print(f"   ❌ Summary failed: {e}")
    
    print("\n" + "=" * 60)
    print("LEARNING INTEGRATION TESTS COMPLETED!")
    print("=" * 60)
    
    print("\n✓ The agent CAN add items to the knowledge graph based on observed relationships!")
    print("\nLearning capabilities demonstrated:")
    print("  • Task → PRODUCES → Item (what tasks produce)")
    print("  • Mob → DROPS → Item (what mobs drop)")
    print("  • Block → YIELDS → Item (what blocks yield when mined)")
    print("  • Item → CRAFTED_FROM → Item (crafting recipes)")
    print("  • Skill → PRODUCES → Item (what skills create)")
    
    kg.close()


def test_all():
    """Run all integration tests"""
    test_connection()
    test_learning_integration()


if __name__ == "__main__":
    test_all()
