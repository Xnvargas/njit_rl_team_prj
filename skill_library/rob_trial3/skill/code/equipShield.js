// Main function to equip a shield in the off‑hand
async function equipShield(bot) {
  const mcData = require('minecraft-data')(bot.version);

  // 1️⃣ Find the shield item in the inventory
  const shieldId = mcData.itemsByName.shield.id;
  const shieldItem = bot.inventory.findInventoryItem(shieldId);
  if (!shieldItem) {
    await bot.chat("❌ I don't have a shield in my inventory to equip.");
    return;
  }

  // 2️⃣ Equip the shield to the off‑hand slot
  try {
    await bot.equip(shieldItem, "off-hand");
    await bot.chat("✅ Shield equipped in off‑hand.");
  } catch (err) {
    await bot.chat(`❌ Failed to equip shield: ${err.message}`);
  }
}