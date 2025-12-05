// main function to ensure the bot has at least 2 sticks
async function ensureTwoSticks(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // helper to count items in inventory
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // 1. Already have enough sticks?
  if (countItem('stick') >= 2) {
    bot.chat('I already have at least 2 sticks.');
    return;
  }

  // 2. Make sure we have at least 2 oak planks
  if (countItem('oak_planks') < 2) {
    // 2a. Need oak logs to craft planks
    if (countItem('oak_log') === 0) {
      bot.chat('I need an oak log to craft planks, searching for one...');
      // try to find a log block nearby
      let logBlock = bot.findBlock({
        matching: mcData.blocksByName.oak_log.id,
        maxDistance: 32
      });

      // if not found, explore randomly until we locate one
      if (!logBlock) {
        // pick a random direction vector (components -1,0,1, not all zero)
        const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
        const randomDir = dirs[Math.floor(Math.random() * dirs.length)];
        await exploreUntil(bot, randomDir, 60, () => {
          const blk = bot.findBlock({
            matching: mcData.blocksByName.oak_log.id,
            maxDistance: 32
          });
          return blk ? blk : null;
        });
        logBlock = bot.findBlock({
          matching: mcData.blocksByName.oak_log.id,
          maxDistance: 32
        });
      }
      if (!logBlock) {
        bot.chat('Could not find any oak log block.');
        return;
      }

      // mine one oak log
      bot.chat('Found oak log, mining one...');
      await mineBlock(bot, 'oak_log', 1);
    }

    // 2b. Now we have at least one oak log, craft planks
    if (countItem('oak_log') > 0) {
      bot.chat('Crafting oak planks from oak log...');
      // one execution of the recipe yields 4 planks
      await craftItem(bot, 'oak_planks', 1);
    }

    // verify we now have enough planks
    if (countItem('oak_planks') < 2) {
      bot.chat('Failed to obtain enough oak planks.');
      return;
    }
  }

  // 3. Ensure a crafting table block is placed nearby
  // 3a. Look for an existing table within 5 blocks
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 5
  });
  if (!tableBlock) {
    // 3b. Need a crafting table item in inventory
    if (countItem('crafting_table') === 0) {
      bot.chat('I need a crafting table item, crafting one...');
      await craftItem(bot, 'crafting_table', 1);
    }

    // 3c. Place the table at a free adjacent position
    const placePos = bot.entity.position.offset(1, 0, 0);
    bot.chat('Placing the crafting table...');
    await placeItem(bot, 'crafting_table', placePos);
    bot.chat('Crafting table placed.');
    // update reference
    tableBlock = bot.blockAt(placePos);
  }

  // 4. Craft sticks at the table (one recipe gives 4 sticks)
  bot.chat('Crafting sticks...');
  await craftItem(bot, 'stick', 1); // produces 4 sticks

  // 5. Verify we now have at least 2 sticks
  if (countItem('stick') >= 2) {
    bot.chat('Successfully crafted sticks. I now have at least 2 sticks.');
  } else {
    bot.chat('Failed to craft sticks.');
  }
}