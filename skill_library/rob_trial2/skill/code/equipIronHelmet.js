async function equipIronHelmet(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const helmetInfo = mcData.itemsByName['iron_helmet'];
  if (!helmetInfo) {
    await bot.chat('❌ Could not find iron helmet data.');
    return;
  }

  // Locate the helmet in the inventory
  const helmetItem = bot.inventory.findInventoryItem(helmetInfo.id);
  if (!helmetItem) {
    await bot.chat('❌ I do not have an iron helmet in my inventory to equip.');
    return;
  }

  // Equip the helmet to the head slot
  try {
    await bot.equip(helmetItem, 'head');
    await bot.chat('✅ Iron helmet equipped!');
  } catch (err) {
    await bot.chat(`❌ Failed to equip iron helmet: ${err.message}`);
  }
}