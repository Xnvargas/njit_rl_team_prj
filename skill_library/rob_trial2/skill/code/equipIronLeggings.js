// Main function to ensure iron leggings are equipped
async function equipIronLeggings(bot) {
  const mcData = require('minecraft-data')(bot.version);

  // Helper to count items in inventory
  const countItem = name => {
    const info = mcData.itemsByName[name];
    if (!info) return 0;
    const invItem = bot.inventory.findInventoryItem(info.id);
    return invItem ? invItem.count : 0;
  };

  // 1. Look for iron leggings in inventory
  let leggingsItem = bot.inventory.findInventoryItem(mcData.itemsByName.iron_leggings.id);

  // 2. If not found, try to craft them
  if (!leggingsItem) {
    await bot.chat('🔨 I have no iron leggings, attempting to craft them...');

    // a. Need at least 8 iron ingots
    if (countItem('iron_ingot') < 8) {
      await bot.chat('❌ Not enough iron ingots (need 8) to craft leggings.');
      return;
    }

    // b. Ensure we have a crafting table (either placed or in inventory)
    let tableBlock = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32
    });
    if (!tableBlock) {
      // No placed table, check inventory
      const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
      if (!tableItem) {
        await bot.chat('❌ No crafting table available to craft leggings.');
        return;
      }
      // Place the crafting table next to the bot
      const placePos = bot.entity.position.offset(1, 0, 0);
      await bot.chat('📦 Placing a crafting table...');
      await placeItem(bot, 'crafting_table', placePos);
      // Small pause for the block to appear
      await bot.waitForTicks(5);
    }

    // c. Craft the leggings
    await bot.chat('🪚 Crafting iron leggings...');
    await craftItem(bot, 'iron_leggings', 1);

    // d. Refresh reference to the newly crafted item
    leggingsItem = bot.inventory.findInventoryItem(mcData.itemsByName.iron_leggings.id);
    if (!leggingsItem) {
      await bot.chat('❌ Crafting failed – iron leggings still missing.');
      return;
    }
  }

  // 3. Equip the leggings to the legs slot
  try {
    await bot.equip(leggingsItem, 'legs');
    await bot.chat('✅ Iron leggings equipped successfully!');
  } catch (err) {
    await bot.chat(`❌ Failed to equip leggings: ${err.message}`);
  }
}