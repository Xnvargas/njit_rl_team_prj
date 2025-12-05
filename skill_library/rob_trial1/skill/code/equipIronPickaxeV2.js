// Main function to equip an iron pickaxe
async function equipIronPickaxe(bot) {
  // Load Minecraft data for the bot's version
  const mcData = require('minecraft-data')(bot.version);

  // Helper to count items (optional, not strictly needed here)
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // Check if we have an iron pickaxe
  if (countItem('iron_pickaxe') === 0) {
    bot.chat('I do not have an iron pickaxe in my inventory.');
    return;
  }

  // Find the iron pickaxe item object
  const ironPickaxe = bot.inventory.findInventoryItem(mcData.itemsByName.iron_pickaxe.id);
  if (!ironPickaxe) {
    bot.chat('Could not locate the iron pickaxe item.');
    return;
  }

  // Attempt to equip it to the hand
  try {
    await bot.equip(ironPickaxe, 'hand');
    bot.chat('Iron pickaxe equipped!');
  } catch (err) {
    bot.chat(`Failed to equip iron pickaxe: ${err.message}`);
  }
}