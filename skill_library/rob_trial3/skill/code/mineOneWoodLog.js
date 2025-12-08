// main function to mine a single wood log
async function mineOneWoodLog(bot) {
  const logNames = ["oak_log", "birch_log", "spruce_log", "jungle_log", "acacia_log", "dark_oak_log", "mangrove_log"];

  // 1) Check if we already have a log in inventory
  for (const name of logNames) {
    const item = bot.inventory.findInventoryItem(mcData.itemsByName[name].id);
    if (item) {
      await bot.chat(`I already have a ${name} in my inventory.`);
      return;
    }
  }

  // 2) Try to find a log nearby (within 32 blocks)
  let foundLog = null;
  for (const name of logNames) {
    const block = bot.findBlock({
      matching: mcData.blocksByName[name].id,
      maxDistance: 32
    });
    if (block) {
      foundLog = name;
      break;
    }
  }

  // 3) If a log was found, mine it directly
  if (foundLog) {
    await bot.chat(`Found a ${foundLog} nearby, mining it now.`);
    await mineBlock(bot, foundLog, 1);
    await bot.chat(`Mined 1 ${foundLog}.`);
    return;
  }

  // 4) No log nearby – explore until we find one
  await bot.chat("No log nearby, exploring to find a log...");

  // Helper to pick a random direction vector with components -1, 0, or 1 (not all zero)
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }
  const logFoundName = await exploreUntil(bot, randomDirection(), 60, () => {
    for (const name of logNames) {
      const blk = bot.findBlock({
        matching: mcData.blocksByName[name].id,
        maxDistance: 32
      });
      if (blk) return name; // stop exploration, return the log name
    }
    return null; // keep exploring
  });
  if (!logFoundName) {
    await bot.chat("Failed to find any log after exploring.");
    return;
  }

  // 5) Mine the discovered log
  await bot.chat(`Found a ${logFoundName} while exploring, mining it now.`);
  await mineBlock(bot, logFoundName, 1);
  await bot.chat(`Mined 1 ${logFoundName}.`);
}