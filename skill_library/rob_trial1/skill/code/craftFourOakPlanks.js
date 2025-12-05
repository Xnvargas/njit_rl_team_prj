// main function to craft exactly 4 oak planks
async function craftFourOakPlanks(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // helper: pick a random direction vector (components -1, 0, 1, not all zero)
  function randomDirection() {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  // 1. Ensure we have at least one oak log in inventory
  const oakLogId = mcData.itemsByName.oak_log.id;
  let logCount = bot.inventory.count(oakLogId);
  if (logCount === 0) {
    bot.chat('No oak logs in inventory, searching for a log block...');
    // try to find a log block nearby
    let logBlock = bot.findBlock({
      matching: mcData.blocksByName.oak_log.id,
      maxDistance: 32
    });

    // if not found, explore until we locate one
    if (!logBlock) {
      await exploreUntil(bot, randomDirection(), 60, () => {
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
    bot.chat('Found oak log block, mining one...');
    await mineBlock(bot, 'oak_log', 1);
    logCount = bot.inventory.count(oakLogId);
  }

  // 2. Make sure we have enough logs (1 log → 4 planks)
  const neededLogs = 1; // one log is enough for four planks
  if (logCount < neededLogs) {
    const toMine = neededLogs - logCount;
    bot.chat(`Mining ${toMine} additional oak log(s)...`);
    await mineBlock(bot, 'oak_log', toMine);
  }

  // 3. Craft oak planks using the 2×2 inventory crafting grid
  const plankItem = mcData.itemsByName.oak_planks;
  const recipes = bot.recipesFor(plankItem.id, null, 1, null);
  if (recipes.length === 0) {
    bot.chat('No recipe found for oak planks.');
    return;
  }
  const recipe = recipes[0];
  // one recipe execution yields 4 planks
  await bot.craft(recipe, 1, null);
  bot.chat('Crafted oak planks from oak log(s).');

  // 4. Verify we now have at least 4 oak planks
  const plankCount = bot.inventory.count(plankItem.id);
  if (plankCount >= 4) {
    bot.chat(`Success! ${plankCount} oak planks now in inventory.`);
  } else {
    bot.chat(`Failed to craft enough planks. Only have ${plankCount}.`);
  }
}