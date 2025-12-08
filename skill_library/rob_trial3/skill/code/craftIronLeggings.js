// Main function: craft iron leggings
async function craftIronLeggings(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // 1️⃣ Ensure we have enough iron ingots (7 needed)
  const ironIngotId = mcData.itemsByName.iron_ingot.id;
  const haveIngots = bot.inventory.count(ironIngotId);
  if (haveIngots < 7) {
    await bot.chat(`❌ I only have ${haveIngots} iron ingot(s); need 7 to craft leggings.`);
    return;
  }
  await bot.chat(`✅ Iron ingots OK: ${haveIngots}/7`);

  // 2️⃣ Find (or place) a crafting table
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });

  // Helper: find a free air spot above a solid block within a radius
  async function findFreePlacementSpot(radius = 3) {
    const botPos = bot.entity.position.floored();
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const solidPos = botPos.offset(dx, dy, dz);
          const solidBlock = bot.blockAt(solidPos);
          if (!solidBlock || solidBlock.name === "air") continue; // need solid
          const abovePos = solidPos.offset(0, 1, 0);
          const aboveBlock = bot.blockAt(abovePos);
          if (aboveBlock && aboveBlock.name === "air") return abovePos;
        }
      }
    }
    return null;
  }
  if (!tableBlock) {
    await bot.chat("No placed crafting table found – placing one.");
    // Ensure we have a crafting table item
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      await bot.chat("❌ I don't have a crafting table item in my inventory.");
      return;
    }
    const placePos = await findFreePlacementSpot(3);
    if (!placePos) {
      await bot.chat("❌ Couldn't find a free spot to place a crafting table.");
      return;
    }
    await placeItem(bot, "crafting_table", placePos);
    tableBlock = bot.blockAt(placePos);
    await bot.chat(`✅ Crafting table placed at ${placePos}`);
  } else {
    await bot.chat(`✅ Found a placed crafting table at ${tableBlock.position}`);
  }

  // 3️⃣ Move next to the crafting table
  await bot.pathfinder.goto(new GoalNear(tableBlock.position.x, tableBlock.position.y, tableBlock.position.z, 1));

  // 4️⃣ Craft iron leggings
  await bot.chat("Crafting iron leggings...");
  try {
    await craftItem(bot, "iron_leggings", 1);
    await bot.chat("✅ Iron leggings crafted!");
  } catch (err) {
    await bot.chat(`❌ Failed to craft iron leggings: ${err.message}`);
  }
}