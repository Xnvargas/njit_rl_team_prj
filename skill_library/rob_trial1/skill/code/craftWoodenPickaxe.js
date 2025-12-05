// main function to craft one wooden pickaxe
async function craftWoodenPickaxe(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helper ---------- //
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // total number of planks (any wood type)
  function countAllPlanks() {
    const plankNames = ['oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 'acacia_planks', 'dark_oak_planks', 'crimson_planks', 'warped_planks'];
    return plankNames.reduce((sum, n) => sum + countItem(n), 0);
  }

  // find any log block (any wood type) within 32 blocks
  function findAnyLogBlock() {
    const logNames = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'crimson_stem', 'warped_stem'];
    for (const name of logNames) {
      const block = bot.findBlock({
        matching: mcData.blocksByName[name].id,
        maxDistance: 32
      });
      if (block) return {
        block,
        name
      };
    }
    return null;
  }

  // ---------- 1. place crafting table if needed ---------- //
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 5
  });
  if (!tableBlock) {
    bot.chat('Placing a crafting table...');
    // ensure we have a crafting table item
    if (countItem('crafting_table') === 0) {
      // need to craft one (requires 4 planks)
      if (countAllPlanks() < 4) {
        // try to get more planks from a log
        const logInfo = findAnyLogBlock() || (await (async () => {
          // explore randomly until a log appears
          const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
          const dir = dirs[Math.floor(Math.random() * dirs.length)];
          await exploreUntil(bot, dir, 60, () => {
            const blk = findAnyLogBlock();
            return blk ? blk.block : null;
          });
          return findAnyLogBlock();
        })());
        if (!logInfo) {
          bot.chat('Cannot find any log to craft planks for a crafting table.');
          return;
        }
        await mineBlock(bot, logInfo.name, 1);
      }
      await craftItem(bot, 'crafting_table', 1);
    }

    // place the table at a free adjacent block
    const placePos = bot.entity.position.offset(1, 0, 0);
    await placeItem(bot, 'crafting_table', placePos);
    tableBlock = bot.blockAt(placePos);
    bot.chat('Crafting table placed.');
  } else {
    bot.chat('Crafting table already placed nearby.');
  }

  // ---------- 2. ensure we have at least 3 planks ---------- //
  while (countAllPlanks() < 3) {
    bot.chat('Not enough planks, searching for a log...');
    let logInfo = findAnyLogBlock();
    if (!logInfo) {
      // explore randomly until a log appears
      const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      await exploreUntil(bot, dir, 60, () => {
        const blk = findAnyLogBlock();
        return blk ? blk.block : null;
      });
      logInfo = findAnyLogBlock();
    }
    if (!logInfo) {
      bot.chat('Could not find any log to make planks.');
      return;
    }

    // mine the log
    await mineBlock(bot, logInfo.name, 1);
    // craft planks from that log
    const plankName = logInfo.name.replace('_log', '_planks').replace('_stem', '_planks'); // for crimson/warped
    bot.chat(`Crafting ${plankName} from ${logInfo.name}...`);
    await craftItem(bot, plankName, 1);
  }
  bot.chat('Enough planks are available.');

  // ---------- 3. ensure we have at least 2 sticks ---------- //
  if (countItem('stick') < 2) {
    bot.chat('Not enough sticks, crafting sticks...');
    await craftItem(bot, 'stick', 1); // yields 4 sticks
  } else {
    bot.chat('Sufficient sticks already in inventory.');
  }

  // ---------- 4. craft the wooden pickaxe ---------- //
  bot.chat('Crafting a wooden pickaxe...');
  await craftItem(bot, 'wooden_pickaxe', 1);
  bot.chat('Wooden pickaxe crafted!');
}