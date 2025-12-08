// Helper: find a free air block directly above a solid block within a given radius
async function findFreePlacementSpot(bot, radius = 3) {
  const {
    Vec3
  } = require('vec3');
  const botPos = bot.entity.position.floored();
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const solidPos = botPos.offset(dx, dy, dz);
        const solidBlock = bot.blockAt(solidPos);
        if (!solidBlock || solidBlock.name === 'air') continue; // need solid ground
        const abovePos = solidPos.offset(0, 1, 0);
        const aboveBlock = bot.blockAt(abovePos);
        if (aboveBlock && aboveBlock.name === 'air') return abovePos;
      }
    }
  }
  return null;
}

// Main function: craft one compass

// Main function: craft one compass
async function craftCompass(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;
  const {
    Vec3
  } = require('vec3');

  // 1️⃣ Check if compass already in inventory
  const compassId = mcData.itemsByName.compass.id;
  if (bot.inventory.findInventoryItem(compassId)) {
    await bot.chat('✅ I already have a compass.');
    return;
  }

  // 2️⃣ Verify required materials
  const ironIngotId = mcData.itemsByName.iron_ingot.id;
  const redstoneId = mcData.itemsByName.redstone.id;
  const ironCount = bot.inventory.count(ironIngotId);
  const redstoneCount = bot.inventory.count(redstoneId);
  if (ironCount < 4 || redstoneCount < 1) {
    await bot.chat(`❌ Missing materials: need 4 iron ingots (${ironCount}) and 1 redstone (${redstoneCount}).`);
    return;
  }
  await bot.chat(`🔧 Materials OK – ${ironCount} iron ingots, ${redstoneCount} redstone.`);

  // 3️⃣ Ensure a placed crafting table exists
  const tableBlockId = mcData.blocksByName.crafting_table.id;
  let tableBlock = bot.findBlock({
    matching: tableBlockId,
    maxDistance: 32
  });
  if (!tableBlock) {
    await bot.chat('🪵 No placed crafting table nearby – placing one.');

    // Ensure we have a crafting table item
    const tableItemId = mcData.itemsByName.crafting_table.id;
    const tableItem = bot.inventory.findInventoryItem(tableItemId);
    if (!tableItem) {
      await bot.chat('❌ I do not have a crafting table item to place.');
      return;
    }

    // Find a free spot
    let placePos = await findFreePlacementSpot(bot, 3);
    if (!placePos) {
      // Explore until we find a suitable spot
      await bot.chat('Exploring for a suitable spot to place the crafting table...');
      const found = await exploreUntil(bot, new Vec3([-1, 0, 1][Math.floor(Math.random() * 3)], [-1, 0, 1][Math.floor(Math.random() * 3)], [-1, 0, 1][Math.floor(Math.random() * 3)]), 60, () => {
        const p = findFreePlacementSpot(bot, 3);
        return p ? true : null;
      });
      if (!found) {
        await bot.chat('❌ Could not locate a free spot for the crafting table.');
        return;
      }
      placePos = await findFreePlacementSpot(bot, 3);
    }
    await placeItem(bot, 'crafting_table', placePos);
    await bot.chat(`✅ Placed crafting table at ${placePos}`);
    tableBlock = bot.blockAt(placePos);
  } else {
    await bot.chat(`✅ Found placed crafting table at ${tableBlock.position}`);
  }

  // 4️⃣ Move next to the crafting table
  await bot.pathfinder.goto(new GoalNear(tableBlock.position.x, tableBlock.position.y, tableBlock.position.z, 1));

  // 5️⃣ Craft the compass
  await bot.chat('🛠️ Crafting a compass...');
  try {
    await craftItem(bot, 'compass', 1);
    await bot.chat('✅ Compass crafted successfully!');
  } catch (err) {
    await bot.chat(`❌ Failed to craft compass: ${err.message}`);
    return;
  }

  // 6️⃣ Verify result
  if (bot.inventory.findInventoryItem(compassId)) {
    await bot.chat('🧭 I now have a compass in my inventory.');
  } else {
    await bot.chat('⚠️ Compass not found after crafting.');
  }
}