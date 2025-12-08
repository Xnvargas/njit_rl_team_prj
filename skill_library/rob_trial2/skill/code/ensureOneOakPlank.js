// Main function to ensure the bot has at least one oak plank
async function ensureOneOakPlank(bot) {
  const mcData = require('minecraft-data')(bot.version);

  // Helper: count items of a given name in inventory
  const countItem = name => {
    const itemInfo = mcData.itemsByName[name];
    const invItem = bot.inventory.findInventoryItem(itemInfo.id);
    return invItem ? invItem.count : 0;
  };

  // 1. Check if we already have oak planks
  if (countItem('oak_planks') >= 1) {
    await bot.chat('✅ I already have oak planks in my inventory.');
    return;
  }

  // 2. Need to obtain a plank – first make sure we have an oak log
  if (countItem('oak_log') < 1) {
    // Try to find a log nearby
    let logBlock = bot.findBlock({
      matching: mcData.blocksByName['oak_log'].id,
      maxDistance: 32
    });

    // If not found, explore randomly until we locate one
    if (!logBlock) {
      const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
      const randomDir = directions[Math.floor(Math.random() * directions.length)];
      await bot.chat('Searching for an oak log...');
      logBlock = await exploreUntil(bot, randomDir, 60, () => {
        return bot.findBlock({
          matching: mcData.blocksByName['oak_log'].id,
          maxDistance: 32
        });
      });
    }
    if (!logBlock) {
      await bot.chat('❌ Could not find any oak log to craft planks.');
      return;
    }

    // Mine one oak log
    await bot.chat('Mining an oak log...');
    await mineBlock(bot, 'oak_log', 1);
    await bot.waitForTicks(5); // let inventory update
  }

  // 3. Ensure we have a crafting table
  if (countItem('crafting_table') < 1) {
    // Try to craft a crafting table from planks (needs a table, so we skip if impossible)
    await bot.chat('❌ No crafting table in inventory and cannot craft one without a table.');
    return;
  }

  // 4. Place the crafting table near the bot (if not already placed)
  const tablePos = bot.entity.position.offset(1, 0, 0);
  await placeItem(bot, 'crafting_table', tablePos);

  // 5. Craft one oak plank (the recipe yields 4 planks, but we request 1)
  await bot.chat('Crafting oak planks...');
  await craftItem(bot, 'oak_planks', 1);

  // 6. Final check
  if (countItem('oak_planks') >= 1) {
    await bot.chat('✅ Successfully crafted at least one oak plank.');
  } else {
    await bot.chat('❌ Failed to craft oak planks.');
  }
}