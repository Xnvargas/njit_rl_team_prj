// main function
async function mineOneLog(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // 1. possible log block names
  const logNames = ["oak_log", "birch_log", "spruce_log", "jungle_log", "acacia_log", "dark_oak_log", "mangrove_log"];

  // helper to check if inventory already has a log
  function hasLogInInventory() {
    for (const name of logNames) {
      const item = bot.inventory.findInventoryItem(mcData.itemsByName[name]?.id);
      if (item) return true;
    }
    return false;
  }

  // 2. already have a log?
  if (hasLogInInventory()) {
    bot.chat("I already have a log in my inventory.");
    return;
  }

  // 3. try to find a log block nearby
  let targetLogName = null;
  let targetBlockPos = null;
  for (const name of logNames) {
    const block = bot.findBlock({
      matching: mcData.blocksByName[name].id,
      maxDistance: 32
    });
    if (block) {
      targetLogName = name;
      targetBlockPos = block.position;
      break;
    }
  }

  // 4. if not found, explore until we locate one
  if (!targetBlockPos) {
    // pick a random direction vector (components -1, 0, or 1, not all zero)
    const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    const found = await exploreUntil(bot, randomDir, 60, () => {
      for (const name of logNames) {
        const blk = bot.findBlock({
          matching: mcData.blocksByName[name].id,
          maxDistance: 32
        });
        if (blk) {
          targetLogName = name;
          targetBlockPos = blk.position;
          return blk; // stop exploration
        }
      }
      return null; // keep exploring
    });
    if (!found) {
      bot.chat("Couldn't find any log after exploring.");
      return;
    }
  }

  // 5. mine exactly one log of the discovered type
  bot.chat(`Found a ${targetLogName}, mining it...`);
  await mineBlock(bot, targetLogName, 1);

  // 6. verify we now have a log
  if (hasLogInInventory()) {
    bot.chat("Successfully mined a log.");
  } else {
    bot.chat("Failed to obtain a log after mining.");
  }
}