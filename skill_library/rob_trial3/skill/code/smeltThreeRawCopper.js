/**
 * Returns a random direction vector whose components are -1, 0 or 1
 * (but not the zero vector).
 */
function randomDirection() {
  const choices = [-1, 0, 1];
  let v;
  do {
    v = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
  } while (v.x === 0 && v.y === 0 && v.z === 0);
  return v;
}

/**
 * Finds a free air block directly above a solid block within the given radius.
 * Returns a Vec3 or null.
 */

/**
 * Finds a free air block directly above a solid block within the given radius.
 * Returns a Vec3 or null.
 */
async function findFreePlacementSpot(bot, radius = 3) {
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

// ------------------------------------------------------------
// Main function
// ------------------------------------------------------------
/**
 * Smelts exactly three raw copper using a furnace and lava bucket as fuel.
 * The function is fully self‑contained and checks/collects everything it needs.
 */

// ------------------------------------------------------------
// Main function
// ------------------------------------------------------------
/**
 * Smelts exactly three raw copper using a furnace and lava bucket as fuel.
 * The function is fully self‑contained and checks/collects everything it needs.
 */
async function smeltThreeRawCopper(bot) {
  const mcData = require('minecraft-data')(bot.version);

  // ---------- 1. Check we have enough raw copper ----------
  const rawCopperId = mcData.itemsByName['raw_copper'].id;
  let rawCopperCount = bot.inventory.count(rawCopperId);
  if (rawCopperCount < 3) {
    await bot.chat(`❌ I only have ${rawCopperCount} raw copper – need at least 3.`);
    return;
  }
  await bot.chat(`✅ I have ${rawCopperCount} raw copper, ready to smelt 3.`);

  // ---------- 2. Ensure a furnace is placed ----------
  const furnaceBlockId = mcData.blocksByName['furnace'].id;
  let furnaceBlock = bot.findBlock({
    matching: furnaceBlockId,
    maxDistance: 32
  });
  if (!furnaceBlock) {
    await bot.chat('🔨 No furnace nearby – placing one.');
    // we need a furnace item in inventory
    const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName['furnace'].id);
    if (!furnaceItem) {
      await bot.chat('❌ I have no furnace item to place.');
      return;
    }
    // find a free spot
    let placePos = await findFreePlacementSpot(bot, 3);
    if (!placePos) {
      await bot.chat('Exploring for a suitable spot to place the furnace...');
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const p = findFreePlacementSpot(bot, 3);
        return p ? true : null;
      });
      if (!found) {
        await bot.chat('❌ Could not locate a free spot for the furnace.');
        return;
      }
      placePos = await findFreePlacementSpot(bot, 3);
    }
    await placeItem(bot, 'furnace', placePos);
    furnaceBlock = bot.blockAt(placePos);
    await bot.chat(`✅ Furnace placed at ${placePos}`);
  } else {
    await bot.chat(`✅ Found a furnace at ${furnaceBlock.position}`);
  }

  // ---------- 3. Ensure we have a lava bucket ----------
  const lavaBucketId = mcData.itemsByName['lava_bucket'].id;
  async function haveLavaBucket() {
    return !!bot.inventory.findInventoryItem(lavaBucketId);
  }
  async function fillLavaBucket() {
    // locate nearest lava block
    const lavaId = mcData.blocksByName['lava'].id;
    const lavaBlock = bot.findBlock({
      matching: lavaId,
      maxDistance: 32
    });
    if (!lavaBlock) {
      await bot.chat('❌ No lava block found nearby to fill a bucket.');
      return false;
    }
    // move next to the lava block
    await bot.pathfinder.goto(new GoalNear(lavaBlock.position.x, lavaBlock.position.y, lavaBlock.position.z, 1));
    // equip empty bucket
    const emptyBucket = bot.inventory.findInventoryItem(mcData.itemsByName['bucket'].id);
    if (!emptyBucket) {
      await bot.chat('❌ I have no empty bucket to fill.');
      return false;
    }
    await bot.equip(emptyBucket, 'hand');
    // look at the lava block and activate
    await bot.lookAt(lavaBlock.position);
    await bot.activateItem();
    // wait a tick for the inventory to update
    await bot.waitForTicks(1);
    return true;
  }

  // ---------- 4. Smelt three raw copper ----------
  for (let i = 0; i < 3; i++) {
    // make sure we have a lava bucket for this iteration
    if (!(await haveLavaBucket())) {
      await bot.chat(`🔄 Filling lava bucket (${i + 1}/3)...`);
      const filled = await fillLavaBucket();
      if (!filled) {
        await bot.chat('❌ Failed to obtain lava bucket – aborting smelting.');
        return;
      }
    }
    await bot.chat(`🔥 Smelting raw copper #${i + 1}...`);
    try {
      await smeltItem(bot, 'raw_copper', 'lava_bucket', 1);
    } catch (err) {
      await bot.chat(`❌ Smelting failed: ${err.message}`);
      return;
    }
    // after smelting the lava bucket becomes an empty bucket again,
    // which is fine – the next loop will refill it if needed.
  }

  // ---------- 5. Report result ----------
  const copperIngotId = mcData.itemsByName['copper_ingot'].id;
  const ingotCount = bot.inventory.count(copperIngotId);
  await bot.chat(`✅ Finished! I now have ${ingotCount} copper ingot(s).`);
}