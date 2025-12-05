// main function to mine three cobblestone blocks
async function mineThreeCobblestone(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ----- helper to count items in inventory -----
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // ----- 1. ensure we have a wooden pickaxe -----
  if (countItem('wooden_pickaxe') === 0) {
    bot.chat('I need a wooden pickaxe, crafting one...');
    // need 3 planks and 2 sticks; we already have sticks, ensure planks
    if (countItem('oak_planks') < 3) {
      // try to craft planks from any log we might have
      const logNames = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'crimson_stem', 'warped_stem'];
      let logBlock = null;
      for (const n of logNames) {
        logBlock = bot.findBlock({
          matching: mcData.blocksByName[n].id,
          maxDistance: 32
        });
        if (logBlock) break;
      }
      if (!logBlock) {
        // explore until a log appears
        const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        await exploreUntil(bot, dir, 60, () => {
          for (const n of logNames) {
            const blk = bot.findBlock({
              matching: mcData.blocksByName[n].id,
              maxDistance: 32
            });
            if (blk) return blk;
          }
          return null;
        });
        // after exploration try again
        for (const n of logNames) {
          logBlock = bot.findBlock({
            matching: mcData.blocksByName[n].id,
            maxDistance: 32
          });
          if (logBlock) break;
        }
      }
      if (logBlock) {
        const logName = Object.keys(mcData.blocksByName).find(k => mcData.blocksByName[k].id === logBlock.type);
        await mineBlock(bot, logName, 1);
      } else {
        bot.chat('Could not find any log to make planks.');
        return;
      }
    }
    // now we have at least 3 planks, craft the pickaxe
    await craftItem(bot, 'wooden_pickaxe', 1);
  }

  // ----- 2. equip the pickaxe -----
  const pickaxeItem = bot.inventory.findInventoryItem(mcData.itemsByName.wooden_pickaxe.id);
  if (pickaxeItem) await bot.equip(pickaxeItem, 'hand');

  // ----- 3. locate stone -----
  let stoneBlock = bot.findBlock({
    matching: mcData.blocksByName.stone.id,
    maxDistance: 32
  });
  if (!stoneBlock) {
    bot.chat('No stone nearby, exploring...');
    const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    const found = await exploreUntil(bot, randomDir, 60, () => {
      const blk = bot.findBlock({
        matching: mcData.blocksByName.stone.id,
        maxDistance: 32
      });
      return blk ? blk : null;
    });
    if (!found) {
      bot.chat('Could not find stone after exploring.');
      return;
    }
    stoneBlock = bot.findBlock({
      matching: mcData.blocksByName.stone.id,
      maxDistance: 32
    });
  }

  // ----- 4. mine three stone blocks (producing cobblestone) -----
  bot.chat(`Found stone at ${stoneBlock.position}. Mining 3 blocks...`);
  await mineBlock(bot, 'stone', 3);

  // ----- 5. verify we have at least 3 cobblestone -----
  const cobbleCount = countItem('cobblestone');
  if (cobbleCount >= 3) {
    bot.chat(`Success! I now have ${cobbleCount} cobblestone.`);
  } else {
    bot.chat(`Failed to collect enough cobblestone. I only have ${cobbleCount}.`);
  }
}