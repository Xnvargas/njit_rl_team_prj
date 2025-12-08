// main function
async function mineOneWoodLog(bot) {
  // announce start
  await bot.chat("Starting to mine a wood log...");

  // helper: try to mine a specific log type, returns true if we now have it
  async function tryMineLog(logName) {
    // attempt to collect one block of this log type
    await mineBlock(bot, logName, 1);
    // check inventory for the log we just tried to mine
    const item = mcData.itemsByName[logName];
    const found = bot.inventory.findInventoryItem(item.id);
    return !!found;
  }

  // list of log names we are allowed to mine
  const logNames = ["oak_log", "jungle_log", "birch_log", "spruce_log", "acacia_log", "dark_oak_log", "mangrove_log"];

  // try each log type until we succeed
  for (const name of logNames) {
    const success = await tryMineLog(name);
    if (success) {
      await bot.chat(`Mined one ${name.replace('_log', '')} log!`);
      return;
    }
  }

  // If we reach here, none of the nearby logs were found.
  // Wander randomly until a log appears, then mine it.
  await bot.chat("Couldn't find a log nearby, exploring...");

  // random direction vectors limited to -1,0,1 for each axis
  const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
  const randomDir = directions[Math.floor(Math.random() * directions.length)];

  // explore until we find any log block
  const foundBlock = await exploreUntil(bot, randomDir, 60, () => {
    for (const name of logNames) {
      const block = bot.findBlock({
        matching: mcData.blocksByName[name].id,
        maxDistance: 32
      });
      if (block) return block;
    }
    return null;
  });
  if (foundBlock) {
    // Determine which log we found and mine it
    const logName = Object.keys(mcData.blocksByName).find(key => mcData.blocksByName[key].id === foundBlock.type);
    await mineBlock(bot, logName, 1);
    await bot.chat(`Mined one ${logName.replace('_log', '')} log after exploring!`);
  } else {
    await bot.chat("Failed to find any log within the exploration time.");
  }
}