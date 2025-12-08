// main function: smelt 5 iron ore (raw_iron -> iron_ingot)
async function smeltFiveIronOre(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // -----------------------------------------------------------------
  // Helper: random direction vector with components -1,0,1 (not all 0)
  // -----------------------------------------------------------------
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }

  // -----------------------------------------------------------------
  // Helper: find a free air block directly above a solid block within 3 blocks
  // -----------------------------------------------------------------
  async function findPlacementSpot() {
    const botPos = bot.entity.position.floored();
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const solidPos = botPos.offset(dx, 0, dz);
        const solidBlock = bot.blockAt(solidPos);
        if (!solidBlock || solidBlock.name === "air") continue; // need solid support
        const abovePos = solidPos.offset(0, 1, 0);
        const aboveBlock = bot.blockAt(abovePos);
        if (aboveBlock && aboveBlock.name === "air") return abovePos;
      }
    }
    return null;
  }

  // -----------------------------------------------------------------
  // 1️⃣ Ensure we have at least 5 raw_iron
  // -----------------------------------------------------------------
  const rawIronId = mcData.itemsByName["raw_iron"].id;
  let rawIronCount = bot.inventory.count(rawIronId);
  const TARGET_RAW = 5;
  if (rawIronCount < TARGET_RAW) {
    const need = TARGET_RAW - rawIronCount;
    await bot.chat(`Need ${need} more raw iron. Searching for iron ore...`);

    // Try to locate ore nearby
    let oreBlock = bot.findBlock({
      matching: mcData.blocksByName["iron_ore"].id,
      maxDistance: 32
    });

    // If not found, explore until one appears
    if (!oreBlock) {
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const blk = bot.findBlock({
          matching: mcData.blocksByName["iron_ore"].id,
          maxDistance: 32
        });
        return blk ? true : null;
      });
      if (!found) {
        await bot.chat("❌ Could not locate any iron ore after exploring.");
        return;
      }
    }

    // Mine the required amount (may mine a few extra, that's fine)
    await bot.chat(`Mining ${need} iron ore block(s)...`);
    await mineBlock(bot, "iron_ore", need);
    await bot.waitForTicks(10); // let inventory update
    rawIronCount = bot.inventory.count(rawIronId);
    await bot.chat(`Now have ${rawIronCount} raw iron.`);
    if (rawIronCount < TARGET_RAW) {
      await bot.chat("❌ Still not enough raw iron after mining.");
      return;
    }
  } else {
    await bot.chat(`Already have ${rawIronCount} raw iron.`);
  }

  // -----------------------------------------------------------------
  // 2️⃣ Ensure a furnace is placed
  // -----------------------------------------------------------------
  let furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName["furnace"].id,
    maxDistance: 32
  });
  if (!furnaceBlock) {
    await bot.chat("No placed furnace found. Trying to place one from inventory...");

    // Need a furnace item
    const furnaceItemId = mcData.itemsByName["furnace"].id;
    const furnaceItem = bot.inventory.findInventoryItem(furnaceItemId);
    if (!furnaceItem) {
      await bot.chat("❌ No furnace item in inventory, cannot continue.");
      return;
    }

    // Find a free spot
    let placePos = await findPlacementSpot();
    if (!placePos) {
      await bot.chat("❌ Could not find a suitable spot to place a furnace.");
      return;
    }
    await placeItem(bot, "furnace", placePos);
    await bot.chat(`Furnace placed at ${placePos}`);
    furnaceBlock = bot.blockAt(placePos);
  } else {
    await bot.chat("Found a placed furnace nearby.");
  }

  // -----------------------------------------------------------------
  // 3️⃣ Ensure we have fuel (prefer coal, fallback to sticks)
  // -----------------------------------------------------------------
  let fuelName = "coal";
  let fuelId = mcData.itemsByName[fuelName].id;
  let fuelCount = bot.inventory.count(fuelId);
  if (fuelCount < 1) {
    // try sticks as fallback
    fuelName = "stick";
    fuelId = mcData.itemsByName[fuelName].id;
    fuelCount = bot.inventory.count(fuelId);
    if (fuelCount < 1) {
      await bot.chat("❌ No coal or sticks for fuel. Cannot smelt.");
      return;
    }
  }
  await bot.chat(`Fuel check passed (${fuelName} x${fuelCount}).`);

  // -----------------------------------------------------------------
  // 4️⃣ Smelt the raw iron
  // -----------------------------------------------------------------
  const toSmelt = Math.min(TARGET_RAW, rawIronCount);
  await bot.chat(`Smelting ${toSmelt} raw iron using ${fuelName}...`);
  await smeltItem(bot, "raw_iron", fuelName, toSmelt);
  await bot.chat("Smelting completed.");

  // -----------------------------------------------------------------
  // 5️⃣ Report final ingot count
  // -----------------------------------------------------------------
  const ingotId = mcData.itemsByName["iron_ingot"].id;
  const finalIngotCount = bot.inventory.count(ingotId);
  await bot.chat(`✅ I now have ${finalIngotCount} iron ingot(s). Task complete.`);
}