// Main function to equip iron leggings
async function equipIronLeggings(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');
  const leggingsId = mcData.itemsByName["iron_leggings"].id;
  const ingotId = mcData.itemsByName["iron_ingot"].id;
  const rawIronId = mcData.itemsByName["raw_iron"].id;
  const coalId = mcData.itemsByName["coal"].id;
  const tableItemId = mcData.itemsByName["crafting_table"].id;
  const tableBlockId = mcData.blocksByName["crafting_table"].id;

  // 1️⃣ Check if leggings are already equipped
  const equippedLeggings = bot.inventory.slots.filter(slot => slot && slot.type === "armor" && slot.slot === 2 // slot 2 = legs in Mineflayer
  )[0];
  if (equippedLeggings && equippedLeggings.type === "armor" && equippedLeggings.name === "iron_leggings") {
    await bot.chat("✅ Iron leggings are already equipped.");
    return;
  }

  // 2️⃣ Ensure we have iron leggings in inventory
  let leggingsItem = bot.inventory.findInventoryItem(leggingsId);
  if (!leggingsItem) {
    await bot.chat("🔨 I don't have iron leggings yet, preparing to craft them.");

    // ---- 2a. Ensure enough iron ingots (7 needed) ----
    let ingotCount = bot.inventory.count(ingotId);
    const neededIngot = 7;
    if (ingotCount < neededIngot) {
      const missing = neededIngot - ingotCount;
      await bot.chat(`🪨 Need ${missing} more iron ingot(s). Smelting raw iron...`);
      // Smelt raw iron one by one until we have enough ingots
      while (bot.inventory.count(ingotId) < neededIngot) {
        // Check we have raw iron and coal
        if (!bot.inventory.findInventoryItem(rawIronId) || !bot.inventory.findInventoryItem(coalId)) {
          await bot.chat("❌ Not enough raw iron or coal to smelt more ingots.");
          return;
        }
        await smeltItem(bot, "raw_iron", "coal", 1);
        await bot.chat(`✅ Smelted 1 iron ingot. Total now: ${bot.inventory.count(ingotId)}`);
      }
    }

    // ---- 2b. Ensure a placed crafting table exists ----
    let placedTable = bot.findBlock({
      matching: tableBlockId,
      maxDistance: 32
    });
    if (!placedTable) {
      await bot.chat("🪵 No placed crafting table nearby, placing one.");
      // Ensure we have the crafting table item
      const tableItem = bot.inventory.findInventoryItem(tableItemId);
      if (!tableItem) {
        await bot.chat("❌ I don't have a crafting table item to place.");
        return;
      }
      // Choose a free spot next to the bot (one block east)
      const placePos = bot.entity.position.floored().offset(1, 0, 0);
      await placeItem(bot, "crafting_table", placePos);
      await bot.chat(`✅ Crafting table placed at ${placePos}`);
    } else {
      await bot.chat(`✅ Found placed crafting table at ${placedTable.position}`);
    }

    // ---- 2c. Craft the leggings ----
    await bot.chat("🛠️ Crafting iron leggings...");
    try {
      await craftItem(bot, "iron_leggings", 1);
      await bot.chat("✅ Iron leggings crafted.");
    } catch (err) {
      await bot.chat(`❌ Failed to craft iron leggings: ${err.message}`);
      return;
    }

    // Refresh reference to the newly crafted item
    leggingsItem = bot.inventory.findInventoryItem(leggingsId);
    if (!leggingsItem) {
      await bot.chat("❌ Something went wrong, leggings not found after crafting.");
      return;
    }
  } else {
    await bot.chat("✅ Iron leggings already in inventory.");
  }

  // 3️⃣ Equip the leggings
  try {
    await bot.equip(leggingsItem, "legs");
    await bot.chat("🛡️ Iron leggings equipped successfully!");
  } catch (err) {
    await bot.chat(`❌ Failed to equip iron leggings: ${err.message}`);
  }
}