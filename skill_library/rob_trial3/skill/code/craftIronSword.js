// ------------------------------------------------------------
// Helper: pick a random direction vector (components -1,0,1, not all zero)
function randomDirection() {
  const choices = [-1, 0, 1];
  let vec;
  do {
    vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
  } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
  return vec;
}

// Helper: find a free air block directly above a solid block within a radius

// Helper: find a free air block directly above a solid block within a radius
async function findFreePlacementSpot(bot, radius = 3) {
  const botPos = bot.entity.position.floored();
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const solidPos = botPos.offset(dx, dy, dz);
        const solidBlock = bot.blockAt(solidPos);
        if (!solidBlock || solidBlock.name === "air") continue; // need solid ground
        const abovePos = solidPos.offset(0, 1, 0);
        const aboveBlock = bot.blockAt(abovePos);
        if (aboveBlock && aboveBlock.name === "air") {
          // ensure the block below the above block is solid (already checked)
          return abovePos;
        }
      }
    }
  }
  return null;
}

// ------------------------------------------------------------
// Main function: craft one iron sword

// ------------------------------------------------------------
// Main function: craft one iron sword
async function craftIronSword(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // 1️⃣ Verify required materials
  const ironIngotId = mcData.itemsByName["iron_ingot"].id;
  const stickId = mcData.itemsByName["stick"].id;
  const haveIron = bot.inventory.count(ironIngotId);
  const haveSticks = bot.inventory.count(stickId);
  if (haveIron < 2) {
    await bot.chat(`❌ Need 2 iron ingots, only have ${haveIron}.`);
    return;
  }
  if (haveSticks < 1) {
    await bot.chat(`❌ Need a stick, none in inventory.`);
    return;
  }
  await bot.chat(`✅ Materials OK (Iron: ${haveIron}, Sticks: ${haveSticks}).`);

  // 2️⃣ Ensure a placed crafting table
  async function ensureCraftingTable() {
    // Look for an already placed table
    const placed = bot.findBlock({
      matching: mcData.blocksByName["crafting_table"].id,
      maxDistance: 32
    });
    if (placed) {
      await bot.chat(`Found placed crafting table at ${placed.position}.`);
      await bot.pathfinder.goto(new GoalNear(placed.position.x, placed.position.y, placed.position.z, 1));
      return placed;
    }

    // No placed table – need to place one from inventory
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName["crafting_table"].id);
    if (!tableItem) {
      await bot.chat(`❌ No crafting table item in inventory to place.`);
      throw new Error("Missing crafting table item");
    }

    // Find a free spot nearby
    let placePos = await findFreePlacementSpot(bot, 3);
    // If not found, explore until we locate one
    while (!placePos) {
      await bot.chat("Exploring for a free spot to place the crafting table...");
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const p = findFreePlacementSpot(bot, 3);
        return p ? true : null;
      });
      if (!found) break;
      placePos = await findFreePlacementSpot(bot, 3);
    }
    if (!placePos) {
      await bot.chat("❌ Could not find a suitable location for the crafting table.");
      throw new Error("No placement spot");
    }

    // Place the table
    await bot.chat(`Placing crafting table at ${placePos}...`);
    await placeItem(bot, "crafting_table", placePos);
    // Move next to it
    await bot.pathfinder.goto(new GoalNear(placePos.x, placePos.y, placePos.z, 1));
    const placedBlock = bot.blockAt(placePos);
    await bot.chat("Crafting table placed.");
    return placedBlock;
  }
  try {
    await ensureCraftingTable();
  } catch (e) {
    await bot.chat(`❌ Failed to ensure crafting table: ${e.message}`);
    return;
  }

  // 3️⃣ Craft the iron sword
  await bot.chat("Crafting iron sword...");
  try {
    await craftItem(bot, "iron_sword", 1);
    await bot.chat("✅ Iron sword crafted!");
  } catch (err) {
    await bot.chat(`❌ Crafting failed: ${err.message}`);
    return;
  }

  // 4️⃣ Verify result
  const swordId = mcData.itemsByName["iron_sword"].id;
  const swordCount = bot.inventory.count(swordId);
  if (swordCount >= 1) {
    await bot.chat(`✅ Task complete: I now have ${swordCount} iron sword(s).`);
  } else {
    await bot.chat("❌ Task finished but no iron sword found in inventory.");
  }
}