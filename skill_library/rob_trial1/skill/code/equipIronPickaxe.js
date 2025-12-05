// main function to equip an iron pickaxe
async function equipIronPickaxe(bot) {
  const mcData = require('minecraft-data')(bot.version);

  // Find the iron pickaxe in the inventory
  const ironPickaxeItem = bot.inventory.findInventoryItem(mcData.itemsByName.iron_pickaxe.id);
  if (!ironPickaxeItem) {
    bot.chat('I do not have an iron pickaxe in my inventory.');
    return;
  }

  // Equip it to the hand
  try {
    await bot.equip(ironPickaxeItem, 'hand');
    bot.chat('Iron pickaxe equipped!');
  } catch (err) {
    bot.chat(`Failed to equip iron pickaxe: ${err.message}`);
  }
}