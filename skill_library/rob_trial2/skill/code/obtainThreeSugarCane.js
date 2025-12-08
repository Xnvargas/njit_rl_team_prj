// main function to obtain at least 3 sugar cane
async function obtainThreeSugarCane(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // helper: count how many items of a given name are in the inventory
  const countItem = name => {
    const info = mcData.itemsByName[name];
    if (!info) return 0;
    const stack = bot.inventory.findInventoryItem(info.id);
    return stack ? stack.count : 0;
  };

  // directions for random exploration (horizontal only)
  const exploreDirections = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];

  // main loop: keep harvesting until we have 3 sugar cane items
  while (countItem('sugar_cane') < 3) {
    const needed = 3 - countItem('sugar_cane');
    await bot.chat(`Need ${needed} more sugar cane. Searching...`);

    // try to find a sugar cane block nearby
    let caneBlock = bot.findBlock({
      matching: mcData.blocksByName.sugar_cane.id,
      maxDistance: 32
    });

    // if none found, explore in a random direction until one appears
    if (!caneBlock) {
      const randomDir = exploreDirections[Math.floor(Math.random() * exploreDirections.length)];
      await bot.chat('Exploring for sugar cane...');
      caneBlock = await exploreUntil(bot, randomDir, 60, () => {
        return bot.findBlock({
          matching: mcData.blocksByName.sugar_cane.id,
          maxDistance: 32
        });
      });
      if (!caneBlock) {
        await bot.chat('❌ Could not locate any sugar cane after exploring.');
        return; // give up – nothing to harvest
      }
    }

    // harvest the found sugar cane blocks (up to the amount we still need)
    await bot.chat(`Found sugar cane at ${caneBlock.position}. Harvesting...`);
    await mineBlock(bot, 'sugar_cane', needed);
    // give the bot a moment to update its inventory
    await bot.waitForTicks(5);
  }
  await bot.chat('✅ I now have at least 3 sugar cane!');
}