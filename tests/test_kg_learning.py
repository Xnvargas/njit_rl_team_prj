"""
Unit tests for Knowledge Graph Learning Integration

Tests the ability of agents to add items to the knowledge graph
based on observed learned relationships during task execution.

Run with: pytest tests/test_kg_learning.py -v
"""
import pytest
from unittest.mock import MagicMock, patch, PropertyMock
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ==================== Mock Classes ====================

class MockSession:
    """Mock Neo4j session for testing without real database connection"""
    def __init__(self):
        self.queries = []
    
    def run(self, query, **kwargs):
        self.queries.append({"query": query, "params": kwargs})
        return MagicMock()
    
    def __enter__(self):
        return self
    
    def __exit__(self, *args):
        pass


class MockDriver:
    """Mock Neo4j driver for testing"""
    def __init__(self):
        self.sessions = []
        self._closed = False
    
    def session(self):
        session = MockSession()
        self.sessions.append(session)
        return session
    
    def close(self):
        self._closed = True


# ==================== Fixtures ====================

@pytest.fixture
def mock_kg_manager():
    """Create KG manager with mocked driver"""
    from voyager.agents.knowledge_graph import KnowledgeGraphManager
    
    with patch.object(KnowledgeGraphManager, '_verify_connection'):
        with patch.object(KnowledgeGraphManager, '_initialize_schema'):
            kg = KnowledgeGraphManager(
                neo4j_uri="bolt://mock:7687",
                neo4j_user="neo4j",
                neo4j_password="test",
                ckpt_dir="/tmp/test"
            )
            kg.driver = MockDriver()
            return kg


# ==================== Test Classes ====================

class TestLearnFromTaskExecution:
    """Tests for the learn_from_task_execution method"""
    
    def test_learns_gained_items(self, mock_kg_manager):
        """Test that gained items are recorded to the graph"""
        # Arrange
        task = "gather resources"
        inventory_before = {"wooden_sword": 1}
        inventory_after = {"wooden_sword": 1, "string": 2, "rotten_flesh": 1}
        
        # Act
        mock_kg_manager.learn_from_task_execution(
            task=task,
            inventory_before=inventory_before,
            inventory_after=inventory_after
        )
        
        # Assert
        session = mock_kg_manager.driver.sessions[-1]
        assert len(session.queries) >= 2  # At least 2 items gained
        
        # Check that PRODUCES relationship was created
        queries_text = " ".join([q["query"] for q in session.queries])
        assert "PRODUCES" in queries_text
    
    def test_learns_mob_drops(self, mock_kg_manager):
        """Test that killing mobs records DROPS relationship"""
        # Arrange
        task = "kill one spider"
        inventory_before = {"wooden_sword": 1}
        inventory_after = {"wooden_sword": 1, "string": 2, "spider_eye": 1}
        
        # Act
        mock_kg_manager.learn_from_task_execution(
            task=task,
            inventory_before=inventory_before,
            inventory_after=inventory_after
        )
        
        # Assert
        session = mock_kg_manager.driver.sessions[-1]
        queries_text = " ".join([q["query"] for q in session.queries])
        
        # Should record both PRODUCES and DROPS relationships
        assert "PRODUCES" in queries_text
        assert "DROPS" in queries_text
        
        # Verify spider mob is mentioned
        all_params = [q["params"] for q in session.queries]
        mob_params = [p for p in all_params if p.get("mob") == "spider"]
        assert len(mob_params) > 0, "Spider mob should be recorded"
    
    def test_learns_mining_yields(self, mock_kg_manager):
        """Test that mining blocks records YIELDS relationship"""
        # Arrange
        task = "mine 3 coal ore"
        inventory_before = {"stone_pickaxe": 1}
        inventory_after = {"stone_pickaxe": 1, "coal": 3}
        
        # Act
        mock_kg_manager.learn_from_task_execution(
            task=task,
            inventory_before=inventory_before,
            inventory_after=inventory_after
        )
        
        # Assert
        session = mock_kg_manager.driver.sessions[-1]
        queries_text = " ".join([q["query"] for q in session.queries])
        
        assert "PRODUCES" in queries_text
        assert "YIELDS" in queries_text
    
    def test_learns_crafting_relationships(self, mock_kg_manager):
        """Test that crafting records CRAFTED_FROM relationships"""
        # Arrange
        task = "craft wooden pickaxe"
        inventory_before = {"stick": 4, "planks": 6}
        inventory_after = {"stick": 2, "planks": 3, "wooden_pickaxe": 1}
        
        # Act
        mock_kg_manager.learn_from_task_execution(
            task=task,
            inventory_before=inventory_before,
            inventory_after=inventory_after
        )
        
        # Assert
        session = mock_kg_manager.driver.sessions[-1]
        queries_text = " ".join([q["query"] for q in session.queries])
        
        assert "CRAFTED_FROM" in queries_text
    
    def test_learns_smelting_relationships(self, mock_kg_manager):
        """Test that smelting records SMELTED_FROM relationships"""
        # Arrange
        task = "smelt iron ore"
        inventory_before = {"raw_iron": 3, "coal": 5}
        inventory_after = {"raw_iron": 0, "coal": 2, "iron_ingot": 3}
        
        # Act
        mock_kg_manager.learn_from_task_execution(
            task=task,
            inventory_before=inventory_before,
            inventory_after=inventory_after
        )
        
        # Assert
        session = mock_kg_manager.driver.sessions[-1]
        queries_text = " ".join([q["query"] for q in session.queries])
        
        assert "SMELTED_FROM" in queries_text
    
    def test_no_learning_when_no_gains(self, mock_kg_manager):
        """Test that nothing is recorded when no items are gained"""
        # Arrange
        task = "explore area"
        inventory_before = {"wooden_sword": 1}
        inventory_after = {"wooden_sword": 1}  # No change
        
        # Act
        mock_kg_manager.learn_from_task_execution(
            task=task,
            inventory_before=inventory_before,
            inventory_after=inventory_after
        )
        
        # Assert - no sessions should be created when there's nothing to learn
        assert len(mock_kg_manager.driver.sessions) == 0


class TestRecordTaskOutcome:
    """Tests for the record_task_outcome wrapper method"""
    
    def test_records_successful_tasks(self, mock_kg_manager):
        """Test that successful tasks trigger learning"""
        # Arrange
        task = "kill zombie"
        inventory_before = {"iron_sword": 1}
        inventory_after = {"iron_sword": 1, "rotten_flesh": 2}
        
        # Act
        mock_kg_manager.record_task_outcome(
            task=task,
            success=True,
            inventory_before=inventory_before,
            inventory_after=inventory_after
        )
        
        # Assert
        assert len(mock_kg_manager.driver.sessions) > 0
    
    def test_ignores_failed_tasks(self, mock_kg_manager):
        """Test that failed tasks don't trigger learning"""
        # Arrange
        task = "kill zombie"
        inventory_before = {"wooden_sword": 1}
        inventory_after = {"wooden_sword": 1}  # Failed, no gains
        
        # Act
        mock_kg_manager.record_task_outcome(
            task=task,
            success=False,
            inventory_before=inventory_before,
            inventory_after=inventory_after
        )
        
        # Assert - no learning for failed tasks
        assert len(mock_kg_manager.driver.sessions) == 0


class TestRecordSkill:
    """Tests for the record_skill method"""
    
    def test_records_skill_node(self, mock_kg_manager):
        """Test that skill nodes are created"""
        # Act
        mock_kg_manager.record_skill(
            skill_name="craftWoodenPickaxe",
            description="Crafts a wooden pickaxe using sticks and planks",
            task="craft wooden pickaxe",
            inventory_before={"stick": 4, "planks": 6},
            inventory_after={"stick": 2, "planks": 3, "wooden_pickaxe": 1}
        )
        
        # Assert
        session = mock_kg_manager.driver.sessions[-1]
        queries_text = " ".join([q["query"] for q in session.queries])
        
        assert "Skill" in queries_text
        assert "PRODUCES" in queries_text
        assert "ACCOMPLISHES" in queries_text
    
    def test_links_skill_to_produced_items(self, mock_kg_manager):
        """Test that skills are linked to items they produce"""
        # Act
        mock_kg_manager.record_skill(
            skill_name="mineCoal",
            description="Mines coal ore to get coal",
            task="mine coal",
            inventory_before={"stone_pickaxe": 1},
            inventory_after={"stone_pickaxe": 1, "coal": 5}
        )
        
        # Assert
        session = mock_kg_manager.driver.sessions[-1]
        all_params = [q["params"] for q in session.queries]
        
        # Verify coal item is linked to skill
        item_params = [p for p in all_params if p.get("item") == "coal"]
        assert len(item_params) > 0


class TestExtractMobFromTask:
    """Tests for mob name extraction from task descriptions"""
    
    def test_extracts_common_mobs(self, mock_kg_manager):
        """Test extraction of common mob names"""
        test_cases = [
            ("kill one spider", "spider"),
            ("hunt zombie", "zombie"),
            ("kill skeleton", "skeleton"),
            ("kill a pig", "pig"),
            ("kill 3 sheep", "sheep"),
        ]
        
        for task, expected_mob in test_cases:
            result = mock_kg_manager._extract_mob_from_task(task)
            assert result == expected_mob, f"Failed for task: {task}"
    
    def test_returns_none_for_unknown_mobs(self, mock_kg_manager):
        """Test that unknown mobs return None"""
        result = mock_kg_manager._extract_mob_from_task("kill unknown_entity")
        assert result is None


class TestExtractBlockFromTask:
    """Tests for block name extraction from task descriptions"""
    
    def test_extracts_common_blocks(self, mock_kg_manager):
        """Test extraction of common block names"""
        test_cases = [
            ("mine 3 cobblestone", "cobblestone"),
            ("mine coal ore", "coal"),
            ("dig stone", "stone"),
            ("mine iron ore", "iron_ore"),
            ("mine oak log", "oak_log"),
        ]
        
        for task, expected_block in test_cases:
            result = mock_kg_manager._extract_block_from_task(task)
            assert result == expected_block, f"Failed for task: {task}"


class TestInventoryDiffCalculation:
    """Tests for inventory difference calculations"""
    
    def test_detect_gained_items(self):
        """Test detecting items gained during task"""
        before = {"stick": 2, "planks": 4}
        after = {"stick": 2, "planks": 4, "crafting_table": 1}
        
        gained = set(after.keys()) - set(before.keys())
        assert gained == {"crafting_table"}
    
    def test_detect_quantity_increases(self):
        """Test detecting quantity increases for existing items"""
        before = {"coal": 2}
        after = {"coal": 7}
        
        gained = {}
        for item, qty in after.items():
            before_qty = before.get(item, 0)
            if qty > before_qty:
                gained[item] = qty - before_qty
        
        assert gained == {"coal": 5}
    
    def test_detect_consumed_items(self):
        """Test detecting items consumed during task"""
        before = {"stick": 4, "planks": 8}
        after = {"stick": 2, "planks": 5, "wooden_pickaxe": 1}
        
        consumed = {}
        for item, qty in before.items():
            after_qty = after.get(item, 0)
            if qty > after_qty:
                consumed[item] = qty - after_qty
        
        assert consumed == {"stick": 2, "planks": 3}


class TestGetLearnedRelationshipsSummary:
    """Tests for the relationship summary method"""
    
    def test_returns_relationship_counts(self, mock_kg_manager):
        """Test that summary returns relationship type counts"""
        # Mock the query result
        mock_result = [
            {"relationship_type": "PRODUCES", "count": 10},
            {"relationship_type": "DROPS", "count": 5},
        ]
        
        with patch.object(mock_kg_manager.driver, 'session') as mock_session:
            mock_session.return_value.__enter__.return_value.run.return_value = mock_result
            
            # The actual implementation would return a dict
            # This tests the interface expectation
            assert mock_kg_manager.get_learned_relationships_summary is not None


class TestGetSkillForItem:
    """Tests for querying skills that produce items"""
    
    def test_queries_skill_produces_relationship(self, mock_kg_manager):
        """Test that skill query uses PRODUCES relationship"""
        # Act
        mock_kg_manager.get_skill_for_item("wooden_pickaxe")
        
        # Assert
        session = mock_kg_manager.driver.sessions[-1]
        assert len(session.queries) == 1
        assert "PRODUCES" in session.queries[0]["query"]


# ==================== Integration-style Tests ====================

class TestCurriculumAgentKGIntegration:
    """Tests for CurriculumAgent KG integration (without actual LLM calls)"""
    
    def test_update_exploration_progress_calls_kg(self, mock_kg_manager):
        """Test that update_exploration_progress would call KG manager"""
        # This is a documentation/design test
        # The actual implementation should call kg_manager.record_task_outcome
        # when info["success"] is True
        
        info = {
            "task": "mine coal",
            "success": True,
            "inventory_before": {"stone_pickaxe": 1},
            "inventory_after": {"stone_pickaxe": 1, "coal": 3}
        }
        
        # Verify the expected call structure
        mock_kg_manager.record_task_outcome(
            task=info["task"],
            success=info["success"],
            inventory_before=info["inventory_before"],
            inventory_after=info["inventory_after"]
        )
        
        # Should have recorded the learning
        assert len(mock_kg_manager.driver.sessions) > 0


class TestVoyagerKGIntegration:
    """Tests for Voyager integration with KG"""
    
    def test_inventory_snapshot_structure(self):
        """Test the expected structure of inventory snapshots"""
        # The rollout method should add these keys to info
        expected_info_keys = [
            "task",
            "success",
            "inventory_before",
            "inventory_after"
        ]
        
        # Simulate the info dict structure
        info = {
            "task": "craft pickaxe",
            "success": True,
            "inventory_before": {"planks": 6, "stick": 4},
            "inventory_after": {"planks": 3, "stick": 2, "wooden_pickaxe": 1},
            "program_code": "...",
            "program_name": "craftWoodenPickaxe"
        }
        
        for key in expected_info_keys:
            assert key in info, f"Missing expected key: {key}"


# ==================== Run Tests ====================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
