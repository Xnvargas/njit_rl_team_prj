// main function to eat one cod
async function eatOneCod(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Item
  } = require('prismarine-item')(bot.version); // not strictly needed but kept for completeness

  // helper: count items by name in inventory
  const countItem = name => {
    const info = mcData.itemsByName[name];
    if (!info) return 0;
    const stack = bot.inventory.findInventoryItem(info.id);
    return stack ? stack.count : 0;
  };
  await bot.chat('🔎 Checking for cod in inventory...');
  const codInfo = mcData.itemsByName['cod'];
  if (!codInfo) {
    await bot.chat('❌ Could not find cod item data.');
    return;
  }

  // Do we have at least one cod?
  if (countItem('cod') < 1) {
    await bot.chat('❌ No cod in inventory, cannot eat.');
    return;
  }

  // Get the cod stack
  const codStack = bot.inventory.findInventoryItem(codInfo.id);
  if (!codStack) {
    await bot.chat('❌ Unexpected error: cod stack not found.');
    return;
  }

  // Equip cod to hand
  await bot.chat('🍴 Equipping cod to hand...');
  await bot.equip(codStack, 'hand');

  // Eat the cod
  await bot.chat('🥣 Eating one cod...');
  try {
    await bot.consume(); // consumes the item in hand
    await bot.chat('✅ Successfully ate one cod.');
  } catch (err) {
    await bot.chat(`❌ Failed to eat cod: ${err.message}`);
  }
}