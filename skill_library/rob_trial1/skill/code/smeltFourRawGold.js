// Main function: smelt 4 raw gold into gold ingots
async function smeltFourRawGold(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helper to count items ----------
  const countItem = name => {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  };

  // ---------- 1. Check we have enough raw gold ----------
  const rawGoldNeeded = 4;
  if (countItem('raw_gold') < rawGoldNeeded) {
    bot.chat(`❌ I need ${rawGoldNeeded} raw gold but only have ${countItem('raw_gold')}.`);
    return;
  }

  // ---------- 2. Check we have enough fuel (coal) ----------
  const fuelName = 'coal';
  if (countItem(fuelName) < rawGoldNeeded) {
    bot.chat(`❌ I need ${rawGoldNeeded} ${fuelName} for fuel but only have ${countItem(fuelName)}.`);
    return;
  }

  // ---------- 3. Find or place a furnace ----------
  let furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 32
  });
  if (!furnaceBlock) {
    // Need to place a furnace from inventory
    const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id);
    if (!furnaceItem) {
      bot.chat('❌ No furnace item in inventory to place.');
      return;
    }

    // Find a suitable position next to the bot
    const placePos = bot.entity.position.floored().offset(1, 0, 0);
    bot.chat(`Placing furnace at ${placePos}`);
    await placeItem(bot, 'furnace', placePos);
    furnaceBlock = bot.blockAt(placePos);
    if (!furnaceBlock || furnaceBlock.name !== 'furnace') {
      bot.chat('❌ Failed to place the furnace.');
      return;
    }
  } else {
    bot.chat('✅ Found a furnace nearby.');
  }

  // ---------- 4. Smelt the raw gold ----------
  bot.chat(`⛏️ Smelting ${rawGoldNeeded} raw gold using ${fuelName}...`);
  await smeltItem(bot, 'raw_gold', fuelName, rawGoldNeeded);
  bot.chat('✅ Smelting complete! Check your inventory for gold ingots.');
}