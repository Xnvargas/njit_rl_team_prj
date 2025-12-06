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

if __name__ == "__main__":
    test_connection()