// main function to smelt exactly 4 raw iron
async function smeltFourRawIron(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // pick a random direction vector (components -1,0,1, not all zero)
  function randomDirection() {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(0, 1, 0), new Vec3(0, -1, 0)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  // find a free adjacent air block around the bot
  async function findFreePlacePos() {
    for (let i = 0; i < 6; i++) {
      const offset = randomDirection();
      const pos = bot.entity.position.offset(offset.x, offset.y, offset.z);
      const block = bot.blockAt(pos);
      if (block && block.name === 'air') return pos;
    }
    return null; // none found
  }

  // ensure we have at least one piece of fuel (coal preferred, then stick)
  async function ensureFuel() {
    if (countItem('coal') > 0) return 'coal';
    if (countItem('stick') > 0) return 'stick';

    // try to craft sticks from planks
    const plankNames = ['oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 'acacia_planks', 'dark_oak_planks', 'crimson_planks', 'warped_planks'];
    const totalPlanks = plankNames.reduce((s, n) => s + countItem(n), 0);
    if (totalPlanks < 2) {
      // need logs to make planks
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
        await exploreUntil(bot, randomDirection(), 60, () => {
          for (const n of logNames) {
            const blk = bot.findBlock({
              matching: mcData.blocksByName[n].id,
              maxDistance: 32
            });
            if (blk) return blk;
          }
          return null;
        });
        // try again
        for (const n of logNames) {
          logBlock = bot.findBlock({
            matching: mcData.blocksByName[n].id,
            maxDistance: 32
          });
          if (logBlock) break;
        }
        if (!logBlock) {
          bot.chat('Cannot find any log to craft sticks for fuel.');
          return null;
        }
      }
      // mine one log and craft planks
      const logName = Object.keys(mcData.blocksByName).find(k => mcData.blocksByName[k].id === logBlock.type);
      await mineBlock(bot, logName, 1);
      // each log gives 4 planks; craft them (any plank type works)
      const anyPlank = logName.replace('_log', '_planks').replace('_stem', '_planks');
      await craftItem(bot, anyPlank, 1);
    }

    // now we should have planks → craft sticks
    await craftItem(bot, 'stick', 1); // yields 4 sticks
    return 'stick';
  }

  // ---------- 1. raw iron check ----------
  if (countItem('raw_iron') < 4) {
    bot.chat('I need at least 4 raw iron to smelt, but I don\'t have enough.');
    return;
  }

  // ---------- 2. locate or place furnace ----------
  let furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 32
  });
  if (!furnaceBlock) {
    bot.chat('No furnace nearby, attempting to place one...');
    if (countItem('furnace') === 0) {
      bot.chat('I have no furnace item to place.');
      return;
    }
    const placePos = await findFreePlacePos();
    if (!placePos) {
      bot.chat('Could not find a free spot adjacent to me to place a furnace.');
      return;
    }
    await placeItem(bot, 'furnace', placePos);
    // give the world a tick to register the new block
    await bot.waitForTicks(1);
    furnaceBlock = bot.findBlock({
      matching: mcData.blocksByName.furnace.id,
      maxDistance: 32
    });
    if (!furnaceBlock) {
      bot.chat('Failed to locate the furnace after placement.');
      return;
    }
    bot.chat('Furnace placed successfully.');
  } else {
    bot.chat('Found an existing furnace nearby.');
  }

  // ---------- 3. ensure we have fuel ----------
  const fuelName = await ensureFuel();
  if (!fuelName) {
    bot.chat('Unable to obtain any fuel for smelting.');
    return;
  }

  // ---------- 4. smelt 4 raw iron ----------
  bot.chat(`Smelting 4 raw iron using ${fuelName}...`);
  await smeltItem(bot, 'raw_iron', fuelName, 4);

  // ---------- 5. verification ----------
  const ingotCount = countItem('iron_ingot');
  if (ingotCount >= 4) {
    bot.chat(`Success! I now have ${ingotCount} iron ingot(s).`);
  } else {
    bot.chat(`Smelting finished but I only have ${ingotCount} iron ingot(s).`);
  }
}