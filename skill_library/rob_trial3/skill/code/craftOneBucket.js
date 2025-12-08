// Main function to craft 1 bucket
async function craftOneBucket(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;
  const {
    Vec3
  } = require('vec3');

  // Helper: find a free air block directly above a solid block within a radius
  async function findFreePlacementSpot(radius = 3) {
    const botPos = bot.entity.position.floored();
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -1; dy <= 2; dy++) {
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

  // 1️⃣ Check if we already have a bucket
  const bucketId = mcData.itemsByName['bucket'].id;
  if (bot.inventory.findInventoryItem(bucketId)) {
    await bot.chat('✅ I already have a bucket.');
    return;
  }

  // 2️⃣ Ensure we have at least 3 iron ingots
  const ironIngotId = mcData.itemsByName['iron_ingot'].id;
  const ironCount = bot.inventory.count(ironIngotId);
  if (ironCount < 3) {
    await bot.chat(`❌ Not enough iron ingots (have ${ironCount}, need 3).`);
    return;
  }

  // 3️⃣ Locate a placed crafting table
  const tableBlockId = mcData.blocksByName['crafting_table'].id;
  let tableBlock = bot.findBlock({
    matching: tableBlockId,
    maxDistance: 32
  });

  // 4️⃣ If none, place one
  if (!tableBlock) {
    await bot.chat('🪵 No placed crafting table nearby – placing one.');

    // 4a) Ensure we have a crafting table item
    const tableItemId = mcData.itemsByName['crafting_table'].id;
    const tableItem = bot.inventory.findInventoryItem(tableItemId);
    if (!tableItem) {
      await bot.chat('❌ I do not have a crafting table item to place.');
      return;
    }

    // 4b) Find a free spot
    let placePos = await findFreePlacementSpot(3);
    if (!placePos) {
      // Explore until a spot appears
      await bot.chat('🔎 Exploring for a suitable spot to place the crafting table...');
      const found = await exploreUntil(bot,
      // random direction vector
      new Vec3([-1, 0, 1][Math.floor(Math.random() * 3)], [-1, 0, 1][Math.floor(Math.random() * 3)], [-1, 0, 1][Math.floor(Math.random() * 3)]), 60, async () => {
        const pos = await findFreePlacementSpot(3);
        return pos ? true : null;
      });
      if (!found) {
        await bot.chat('❌ Could not find a free spot for the crafting table.');
        return;
      }
      placePos = await findFreePlacementSpot(3);
    }

    // 4c) Place the table
    await placeItem(bot, 'crafting_table', placePos);
    tableBlock = bot.blockAt(placePos);
    await bot.chat(`✅ Placed crafting table at ${placePos}`);
  } else {
    await bot.chat(`✅ Found placed crafting table at ${tableBlock.position}`);
  }

  // 5️⃣ Move next to the crafting table
  await bot.pathfinder.goto(new GoalNear(tableBlock.position.x, tableBlock.position.y, tableBlock.position.z, 1));

  // 6️⃣ Craft the bucket
  await bot.chat('🛠️ Crafting a bucket...');
  try {
    await craftItem(bot, 'bucket', 1);
    await bot.chat('✅ Bucket crafted!');
  } catch (err) {
    await bot.chat(`❌ Failed to craft bucket: ${err.message}`);
    return;
  }

  // 7️⃣ Verify
  if (bot.inventory.findInventoryItem(bucketId)) {
    await bot.chat('🪣 Bucket is now in my inventory.');
  } else {
    await bot.chat('⚠️ Bucket not found after crafting.');
  }
}