// Main function: equip an iron sword to the bot's hand
async function equipIronSword(bot) {
  const mcData = require('minecraft-data')(bot.version);

  // 1️⃣ Find the iron sword in the inventory
  const swordId = mcData.itemsByName.iron_sword.id;
  const swordItem = bot.inventory.findInventoryItem(swordId);
  if (!swordItem) {
    await bot.chat("❌ I don't have an iron sword in my inventory to equip.");
    return;
  }

  // 2️⃣ Equip the sword to the main hand
  try {
    await bot.equip(swordItem, "hand");
    await bot.chat("✅ Iron sword equipped in my hand.");
  } catch (err) {
    await bot.chat(`❌ Failed to equip iron sword: ${err.message}`);
  }
}