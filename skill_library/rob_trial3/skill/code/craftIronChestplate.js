// -----------------------------------------------------------------------------
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
        if (aboveBlock && aboveBlock.name === "air") return abovePos;
      }
    }
  }
  return null;
}

// -----------------------------------------------------------------------------
// Main function: craft an iron chestplate

// -----------------------------------------------------------------------------
// Main function: craft an iron chestplate
async function craftIronChestplate(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // 1️⃣ Ensure we have enough iron ingots
  const ironIngotId = mcData.itemsByName["iron_ingot"].id;
  const haveIngots = bot.inventory.count(ironIngotId);
  if (haveIngots < 5) {
    await bot.chat(`❌ I only have ${haveIngots} iron ingots; need 5 to craft a chestplate.`);
    return;
  }
  await bot.chat(`✅ I have ${haveIngots} iron ingots, enough for a chestplate.`);

  // 2️⃣ Locate or place a crafting table
  const tableId = mcData.blocksByName["crafting_table"].id;
  let tableBlock = bot.findBlock({
    matching: tableId,
    maxDistance: 32
  });
  if (tableBlock) {
    await bot.chat(`✅ Found a placed crafting table at ${tableBlock.position}.`);
    // Move next to it (within 1 block)
    await bot.pathfinder.goto(new GoalNear(tableBlock.position.x, tableBlock.position.y, tableBlock.position.z, 1));
  } else {
    await bot.chat("🔨 No placed crafting table nearby – I will place one.");

    // Ensure we have a crafting table item in inventory
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName["crafting_table"].id);
    if (!tableItem) {
      await bot.chat("❌ I don't have a crafting table item to place.");
      return;
    }

    // Find a free spot to place it
    let placePos = await findFreePlacementSpot(bot, 3);
    // If not found, explore a bit and try again
    while (!placePos) {
      await bot.chat("Exploring for a suitable spot to place the crafting table...");
      await exploreUntil(bot, randomDirection(), 60, () => {
        const p = findFreePlacementSpot(bot, 3);
        return p ? true : null;
      });
      placePos = await findFreePlacementSpot(bot, 3);
      if (!placePos) break;
    }
    if (!placePos) {
      await bot.chat("❌ Could not find a free location to place the crafting table.");
      return;
    }

    // Place the table
    await placeItem(bot, "crafting_table", placePos);
    await bot.chat(`✅ Placed crafting table at ${placePos}.`);
    // Move next to it
    await bot.pathfinder.goto(new GoalNear(placePos.x, placePos.y, placePos.z, 1));
    tableBlock = bot.blockAt(placePos);
  }

  // 3️⃣ Craft the iron chestplate
  await bot.chat("🛠️ Crafting iron chestplate...");
  try {
    await craftItem(bot, "iron_chestplate", 1);
    await bot.chat("✅ Iron chestplate crafted successfully!");
  } catch (err) {
    await bot.chat(`❌ Failed to craft iron chestplate: ${err.message}`);
    return;
  }

  // 4️⃣ Optional: equip the chestplate (if desired)
  const chestplateItem = bot.inventory.findInventoryItem(mcData.itemsByName["iron_chestplate"].id);
  if (chestplateItem) {
    await bot.equip(chestplateItem, "torso");
    await bot.chat("🛡️ Iron chestplate equipped.");
  }
}

// Helper: random direction vector (components -1,0,1, not all zero)

// Helper: random direction vector (components -1,0,1, not all zero)
function randomDirection() {
  const choices = [-1, 0, 1];
  let vec;
  do {
    vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
  } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
  return vec;
}