// main function to smelt exactly 5 raw copper
async function smeltFiveRawCopper(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // Helper: pick a random direction vector (components -1,0,1, not all zero)
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }

  // 1️⃣ Check current raw copper amount
  const rawCopperId = mcData.itemsByName["raw_copper"].id;
  let rawCopperCount = bot.inventory.count(rawCopperId);
  if (rawCopperCount >= 5) {
    await bot.chat(`✅ I already have ${rawCopperCount} raw copper. Ready to smelt 5 of them.`);
  } else {
    await bot.chat(`❌ I only have ${rawCopperCount} raw copper, cannot fulfill the task.`);
    return;
  }

  // 2️⃣ Find a placed furnace block
  const furnaceBlockId = mcData.blocksByName["furnace"].id;
  let furnaceBlock = bot.findBlock({
    matching: furnaceBlockId,
    maxDistance: 32
  });

  // 3️⃣ If no furnace, place one
  if (!furnaceBlock) {
    await bot.chat("🔨 No furnace nearby, placing one.");

    // Ensure we have a furnace item in inventory
    const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName["furnace"].id);
    if (!furnaceItem) {
      await bot.chat("❌ I don't have a furnace item to place.");
      return;
    }

    // Find a free spot (air block above solid ground) within radius 3
    const botPos = bot.entity.position.floored();
    let placePos = null;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const groundPos = botPos.offset(dx, -1, dz);
        const groundBlock = bot.blockAt(groundPos);
        const abovePos = groundPos.offset(0, 1, 0);
        const aboveBlock = bot.blockAt(abovePos);
        if (groundBlock && groundBlock.name !== "air" && aboveBlock && aboveBlock.name === "air") {
          placePos = abovePos;
          break;
        }
      }
      if (placePos) break;
    }

    // If still not found, explore a bit to locate a suitable spot
    if (!placePos) {
      await bot.chat("Exploring for a suitable spot to place the furnace...");
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const botPos2 = bot.entity.position.floored();
        for (let dx = -3; dx <= 3; dx++) {
          for (let dz = -3; dz <= 3; dz++) {
            const groundPos = botPos2.offset(dx, -1, dz);
            const groundBlock = bot.blockAt(groundPos);
            const abovePos = groundPos.offset(0, 1, 0);
            const aboveBlock = bot.blockAt(abovePos);
            if (groundBlock && groundBlock.name !== "air" && aboveBlock && aboveBlock.name === "air") {
              return abovePos; // stop exploration
            }
          }
        }
        return null;
      });
      if (!found) {
        await bot.chat("❌ Could not find a place to put the furnace.");
        return;
      }
      placePos = found;
    }

    // Place the furnace
    await placeItem(bot, "furnace", placePos);
    furnaceBlock = bot.blockAt(placePos);
    await bot.chat(`✅ Furnace placed at ${placePos}`);
  } else {
    await bot.chat(`✅ Found an existing furnace at ${furnaceBlock.position}`);
  }

  // 4️⃣ Ensure we have enough fuel (coal) for 5 smelts
  const coalId = mcData.itemsByName["coal"].id;
  const neededFuel = 5;
  const coalCount = bot.inventory.count(coalId);
  if (coalCount < neededFuel) {
    await bot.chat(`❌ Not enough coal for smelting (need ${neededFuel}, have ${coalCount}).`);
    return;
  }

  // 5️⃣ Smelt the required amount
  const needed = 5;
  await bot.chat(`⛏️ Starting smelting of ${needed} raw copper...`);
  for (let i = 0; i < needed; i++) {
    await smeltItem(bot, "raw_copper", "coal", 1);
    await bot.chat(`✅ Smelted ${i + 1}/${needed}`);
  }

  // 6️⃣ Final check and report
  const copperIngotId = mcData.itemsByName["copper_ingot"].id;
  const ingotCount = bot.inventory.count(copperIngotId);
  await bot.chat(`✅ Finished! I now have ${ingotCount} copper ingot(s).`);
}