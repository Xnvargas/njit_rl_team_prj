// Main function to eat a loaf of bread
async function eatBread(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const breadId = mcData.itemsByName.bread.id;

  // 1️⃣ Find bread in inventory
  const breadItem = bot.inventory.findInventoryItem(breadId);
  if (!breadItem) {
    await bot.chat("❌ I don't have any bread in my inventory to eat.");
    return;
  }

  // 2️⃣ Equip bread to the hand
  try {
    await bot.equip(breadItem, "hand");
    await bot.chat("✅ Bread equipped, preparing to eat...");
  } catch (err) {
    await bot.chat(`❌ Failed to equip bread: ${err.message}`);
    return;
  }

  // 3️⃣ Eat the bread
  try {
    await bot.consume(); // this will wait until the eating animation finishes
    await bot.chat("✅ I have eaten the bread and restored my hunger.");
  } catch (err) {
    await bot.chat(`❌ Failed to eat bread: ${err.message}`);
  }
}