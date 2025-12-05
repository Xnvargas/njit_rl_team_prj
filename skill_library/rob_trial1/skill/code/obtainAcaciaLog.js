// main function to obtain one acacia log
async function obtainAcaciaLog(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // helper: how many of a given item are in inventory
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // 1. already have the log?
  if (countItem('acacia_log') >= 1) {
    bot.chat('I already have an acacia log.');
    return;
  }

  // 2. try to find a log block nearby
  let logBlock = bot.findBlock({
    matching: mcData.blocksByName.acacia_log.id,
    maxDistance: 32
  });

  // 3. if not found, explore randomly until we locate one
  if (!logBlock) {
    // possible direction vectors (components -1,0,1, not all zero)
    const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    bot.chat('Acacia log not nearby, exploring...');
    await exploreUntil(bot, randomDir, 60, () => {
      const blk = bot.findBlock({
        matching: mcData.blocksByName.acacia_log.id,
        maxDistance: 32
      });
      return blk ? blk : null; // stop when found
    });

    // try again after exploration
    logBlock = bot.findBlock({
      matching: mcData.blocksByName.acacia_log.id,
      maxDistance: 32
    });
  }

  // 4. still not found?
  if (!logBlock) {
    bot.chat('Could not find any acacia log block.');
    return;
  }

  // 5. mine exactly one acacia log
  bot.chat(`Found an acacia log at ${logBlock.position}. Mining one...`);
  await mineBlock(bot, 'acacia_log', 1);

  // 6. verify we now have the log
  if (countItem('acacia_log') >= 1) {
    bot.chat('Successfully obtained an acacia log.');
  } else {
    bot.chat('Failed to obtain an acacia log after mining.');
  }
}