// main function to equip an iron helmet
async function equipIronHelmet(bot) {
  // Load Minecraft data for the current version
  const mcData = require('minecraft-data')(bot.version);

  // Find the iron helmet in the bot's inventory
  const helmetItem = bot.inventory.findInventoryItem(mcData.itemsByName.iron_helmet.id);

  // If we don't have one, inform the user and stop
  if (!helmetItem) {
    bot.chat('I do not have an iron helmet in my inventory.');
    return;
  }

  // Equip the helmet to the head slot
  bot.chat('Equipping iron helmet...');
  await bot.equip(helmetItem, 'head');
  bot.chat('Iron helmet equipped!');
}