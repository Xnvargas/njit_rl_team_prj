// main function to ensure the bot has at least 4 sticks
async function craftFourSticks(bot) {
  const mcData = require('minecraft-data')(bot.version);

  // helper: count items in inventory
  const countItem = name => {
    const item = mcData.itemsByName[name];
    const inv = bot.inventory.findInventoryItem(item.id);
    return inv ? inv.count : 0;
  };

  // 1. Make sure we have enough planks (need at least 2)
  const neededPlanks = 2;
  let plankCount = countItem('oak_planks');
  if (plankCount < neededPlanks) {
    // we need more planks → craft from oak logs
    const logsNeeded = Math.ceil((neededPlanks - plankCount) / 4);
    const logCount = countItem('oak_log');
    if (logCount < logsNeeded) {
      await bot.chat(`I don't have enough oak logs to make planks (need ${logsNeeded}, have ${logCount}).`);
      return;
    }

    // craft the planks using the 2×2 inventory grid
    await bot.chat(`Crafting ${logsNeeded * 4} oak planks from ${logsNeeded} oak logs...`);
    const plankItem = mcData.itemsByName['oak_planks'];
    const logItem = mcData.itemsByName['oak_log'];

    // ensure the logs are in the hotbar (required for bot.craft)
    const logInv = bot.inventory.findInventoryItem(logItem.id);
    await bot.equip(logInv, 'hand');

    // recipe: 1 oak log → 4 oak planks (no table needed)
    await bot.craft(bot.recipesFor(plankItem.id, null, 1, null)[0], logsNeeded, null);
    plankCount = countItem('oak_planks');
    await bot.chat(`Now have ${plankCount} oak planks.`);
  }

  // 2. Make sure we have at least 4 sticks
  const neededSticks = 4;
  let stickCount = countItem('stick');
  if (stickCount < neededSticks) {
    // each craft gives 4 sticks from 2 planks
    const craftsNeeded = Math.ceil((neededSticks - stickCount) / 4);
    const planksNeeded = craftsNeeded * 2;
    if (plankCount < planksNeeded) {
      await bot.chat(`Not enough planks to craft sticks (need ${planksNeeded}, have ${plankCount}).`);
      return;
    }
    await bot.chat(`Crafting ${craftsNeeded * 4} sticks from ${planksNeeded} planks...`);
    const stickItem = mcData.itemsByName['stick'];
    const plankItem = mcData.itemsByName['oak_planks'];

    // ensure planks are in the hotbar
    const plankInv = bot.inventory.findInventoryItem(plankItem.id);
    await bot.equip(plankInv, 'hand');

    // recipe: 2 planks → 4 sticks (no table needed)
    await bot.craft(bot.recipesFor(stickItem.id, null, 1, null)[0], craftsNeeded, null);
    stickCount = countItem('stick');
    await bot.chat(`Now have ${stickCount} sticks.`);
  }

  // final report
  if (stickCount >= neededSticks) {
    await bot.chat('✅ Successfully crafted at least 4 sticks!');
  } else {
    await bot.chat(`❌ Failed to craft enough sticks. I have ${stickCount}.`);
  }
}