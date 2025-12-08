// -----------------------------------------------------------------------------
// Helper: pick a random direction vector (components -1,0,1, not all zero)
// -----------------------------------------------------------------------------
function randomDirection() {
  const choices = [-1, 0, 1];
  let vec;
  do {
    vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
  } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
  return vec;
}

// -----------------------------------------------------------------------------
// Helper: find a free air block directly above a solid block within radius
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Helper: find a free air block directly above a solid block within radius
// -----------------------------------------------------------------------------
async function findFreeSpot(bot, radius = 3) {
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
// Main function: smelt 5 raw copper using sticks as fuel
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Main function: smelt 5 raw copper using sticks as fuel
// -----------------------------------------------------------------------------
async function smeltFiveRawCopper(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // 1️⃣ Verify we have enough raw copper
  const rawCopperId = mcData.itemsByName["raw_copper"].id;
  let rawCopperCount = bot.inventory.count(rawCopperId);
  if (rawCopperCount < 5) {
    await bot.chat(`❌ I only have ${rawCopperCount} raw copper – need 5 to smelt.`);
    return;
  }
  await bot.chat(`✅ I have ${rawCopperCount} raw copper, will smelt 5 of them.`);

  // 2️⃣ Ensure a placed furnace exists
  const furnaceBlockId = mcData.blocksByName["furnace"].id;
  let furnaceBlock = bot.findBlock({
    matching: furnaceBlockId,
    maxDistance: 32
  });
  if (!furnaceBlock) {
    await bot.chat("🔨 No furnace placed nearby – looking for a spot to place one.");

    // 2a️⃣ Find a free placement spot
    let placePos = await findFreeSpot(bot, 3);
    if (!placePos) {
      await bot.chat("🚶 Exploring for a suitable spot for the furnace...");
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const p = findFreeSpot(bot, 3);
        return p ? true : null;
      });
      if (!found) {
        await bot.chat("❌ Could not find a free spot to place the furnace.");
        return;
      }
      placePos = await findFreeSpot(bot, 3);
    }

    // 2b️⃣ Place the furnace
    await bot.chat(`📦 Placing furnace at ${placePos}`);
    await placeItem(bot, "furnace", placePos);
    furnaceBlock = bot.blockAt(placePos);
    if (!furnaceBlock) {
      await bot.chat("❌ Failed to place the furnace.");
      return;
    }
  } else {
    await bot.chat(`✅ Found a furnace at ${furnaceBlock.position}`);
  }

  // 3️⃣ Ensure we have enough fuel (sticks)
  const stickId = mcData.itemsByName["stick"].id;
  const stickCount = bot.inventory.count(stickId);
  if (stickCount < 5) {
    await bot.chat(`❌ Not enough sticks for fuel (have ${stickCount}, need 5).`);
    return;
  }
  await bot.chat(`✅ Fuel check passed – ${stickCount} sticks available.`);

  // 4️⃣ Move next to the furnace
  await bot.pathfinder.goto(new GoalNear(furnaceBlock.position.x, furnaceBlock.position.y, furnaceBlock.position.z, 1));

  // 5️⃣ Smelt 5 raw copper using sticks as fuel
  await bot.chat("🔥 Starting smelting of 5 raw copper...");
  try {
    await smeltItem(bot, "raw_copper", "stick", 5);
    await bot.chat("✅ Finished smelting! I now have copper ingots.");
  } catch (err) {
    await bot.chat(`❌ Smelting failed: ${err.message}`);
  }
}