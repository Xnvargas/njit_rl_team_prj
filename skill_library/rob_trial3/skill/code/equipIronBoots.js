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

// Main function: equip iron boots (crafting if necessary)

// Main function: equip iron boots (crafting if necessary)
async function equipIronBoots(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;
  const bootsId = mcData.itemsByName["iron_boots"].id;
  const ironIngotId = mcData.itemsByName["iron_ingot"].id;
  const rawIronId = mcData.itemsByName["raw_iron"].id;
  const coalId = mcData.itemsByName["coal"].id;
  const tableItemId = mcData.itemsByName["crafting_table"].id;
  const tableBlockId = mcData.blocksByName["crafting_table"].id;

  // 1️⃣ Check if boots are already equipped
  const equippedBoots = bot.inventory.slots.find(s => s && s.type === "armor" && s.slot === 3 // slot 3 = boots in Mineflayer
  );
  if (equippedBoots && equippedBoots.type === "armor" && equippedBoots.name === "iron_boots") {
    await bot.chat("✅ Iron boots are already equipped.");
    return;
  }

  // 2️⃣ Find iron boots in inventory
  let bootsItem = bot.inventory.findInventoryItem(bootsId);
  if (!bootsItem) {
    await bot.chat("🔨 I don't have iron boots yet, preparing to craft them.");

    // 2a️⃣ Ensure we have at least 4 iron ingots
    const neededIngot = 4;
    let ingotCount = bot.inventory.count(ironIngotId);
    if (ingotCount < neededIngot) {
      const missing = neededIngot - ingotCount;
      await bot.chat(`🪨 Need ${missing} more iron ingot(s). Smelting raw iron...`);
      while (bot.inventory.count(ironIngotId) < neededIngot) {
        if (!bot.inventory.findInventoryItem(rawIronId) || !bot.inventory.findInventoryItem(coalId)) {
          await bot.chat("❌ Not enough raw iron or coal to smelt more ingots.");
          return;
        }
        await smeltItem(bot, "raw_iron", "coal", 1);
        await bot.chat(`✅ Smelted 1 iron ingot (total ${bot.inventory.count(ironIngotId)}).`);
      }
    } else {
      await bot.chat(`✅ Iron ingots OK (${ingotCount}/${neededIngot}).`);
    }

    // 2b️⃣ Ensure a placed crafting table exists
    let placedTable = bot.findBlock({
      matching: tableBlockId,
      maxDistance: 32
    });
    if (!placedTable) {
      await bot.chat("🪵 No placed crafting table nearby – will place one.");

      // Ensure we have a crafting table item
      const tableItem = bot.inventory.findInventoryItem(tableItemId);
      if (!tableItem) {
        await bot.chat("❌ I don't have a crafting table item to place.");
        return;
      }

      // Find a free spot
      let placePos = await findFreePlacementSpot(bot, 3);
      if (!placePos) {
        await bot.chat("Exploring for a suitable spot to place the crafting table...");
        const found = await exploreUntil(bot, new Vec3(1, 0, 1), 60, () => {
          const p = findFreePlacementSpot(bot, 3);
          return p ? true : null;
        });
        if (!found) {
          await bot.chat("❌ Could not locate a free spot for the crafting table.");
          return;
        }
        placePos = await findFreePlacementSpot(bot, 3);
      }
      await bot.chat(`Placing crafting table at ${placePos}`);
      await placeItem(bot, "crafting_table", placePos);
      placedTable = bot.blockAt(placePos);
    } else {
      await bot.chat(`✅ Found placed crafting table at ${placedTable.position}`);
    }

    // Move next to the table so we can craft
    await bot.pathfinder.goto(new GoalNear(placedTable.position.x, placedTable.position.y, placedTable.position.z, 1));

    // 2c️⃣ Craft the iron boots
    await bot.chat("🛠️ Crafting iron boots...");
    try {
      await craftItem(bot, "iron_boots", 1);
      await bot.chat("✅ Iron boots crafted.");
    } catch (err) {
      await bot.chat(`❌ Failed to craft iron boots: ${err.message}`);
      return;
    }

    // Refresh reference to the newly crafted boots
    bootsItem = bot.inventory.findInventoryItem(bootsId);
    if (!bootsItem) {
      await bot.chat("❌ Something went wrong – boots not found after crafting.");
      return;
    }
  } else {
    await bot.chat("✅ Iron boots already in inventory.");
  }

  // 3️⃣ Equip the boots
  try {
    await bot.equip(bootsItem, "feet");
    await bot.chat("🛡️ Iron boots equipped successfully!");
  } catch (err) {
    await bot.chat(`❌ Failed to equip iron boots: ${err.message}`);
  }
}