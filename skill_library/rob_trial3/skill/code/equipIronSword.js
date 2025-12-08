// main function to equip an iron sword
async function equipIronSword(bot) {
  // 1. Load Minecraft data for the bot's version
  const mcData = require('minecraft-data')(bot.version);

  // 2. Find the iron sword in the inventory
  const ironSwordId = mcData.itemsByName["iron_sword"].id;
  const swordItem = bot.inventory.findInventoryItem(ironSwordId);

  // 3. If not present, report and exit
  if (!swordItem) {
    await bot.chat("❌ I don't have an iron sword in my inventory.");
    return;
  }

  // 4. Equip the sword to the main hand
  try {
    await bot.equip(swordItem, "hand");
    await bot.chat("✅ Iron sword equipped in my hand.");
  } catch (err) {
    await bot.chat(`❌ Failed to equip iron sword: ${err.message}`);
  }
}