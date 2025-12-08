// Main function to equip iron boots
async function equipIronBoots(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const bootsInfo = mcData.itemsByName['iron_boots'];
  if (!bootsInfo) {
    await bot.chat('❌ Could not find item data for iron boots.');
    return;
  }

  // Check if boots are already equipped
  // Mineflayer stores armor in bot.inventory.slots[5] (boots slot) – but we can just try to equip anyway
  const equippedBoots = bot.inventory.slots[5];
  if (equippedBoots && equippedBoots.type === bootsInfo.id) {
    await bot.chat('✅ Iron boots are already equipped.');
    return;
  }

  // Find iron boots in inventory
  const bootsItem = bot.inventory.findInventoryItem(bootsInfo.id);
  if (!bootsItem) {
    await bot.chat('❌ I have no iron boots in my inventory to equip.');
    return;
  }

  // Equip the boots
  try {
    await bot.equip(bootsItem, 'feet');
    await bot.chat('✅ Iron boots equipped successfully.');
  } catch (err) {
    await bot.chat(`❌ Failed to equip iron boots: ${err.message}`);
  }
}