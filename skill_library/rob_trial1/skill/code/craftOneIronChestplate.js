// main function to craft one iron chestplate
async function craftOneIronChestplate(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ----- helpers -----
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // random horizontal direction for exploration
  function randomDirection() {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  // ----- 1. Ensure enough iron ingots -----
  if (countItem('iron_ingot') < 5) {
    const needed = 5 - countItem('iron_ingot');
    bot.chat(`Need ${needed} more iron ingots, smelting raw iron...`);
    // smelt raw iron using any fuel we have (coal or stick)
    const fuel = countItem('coal') > 0 ? 'coal' : countItem('stick') > 0 ? 'stick' : null;
    if (!fuel) {
      bot.chat('No fuel available to smelt iron.');
      return;
    }
    await smeltItem(bot, 'raw_iron', fuel, needed);
  }

  // ----- 2. Ensure we have 4 wooden planks (any type) -----
  const plankNames = ['oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 'acacia_planks', 'dark_oak_planks', 'crimson_planks', 'warped_planks'];
  let totalPlanks = 0;
  for (const name of plankNames) totalPlanks += countItem(name);
  if (totalPlanks < 4) {
    // need to obtain more logs and craft planks
    bot.chat('Not enough planks, mining a log to craft more planks...');
    // try to find any log block nearby
    const logBlock = bot.findBlock({
      matching: b => b.name.endsWith('_log'),
      maxDistance: 32
    });
    if (!logBlock) {
      // explore until a log is found
      await exploreUntil(bot, randomDirection(), 60, () => {
        const blk = bot.findBlock({
          matching: b => b.name.endsWith('_log'),
          maxDistance: 32
        });
        return blk ? blk : null;
      });
    }
    // mine one log of any type
    const logName = bot.findBlock({
      matching: b => b.name.endsWith('_log'),
      maxDistance: 32
    })?.name;
    if (logName) {
      await mineBlock(bot, logName, 1);
    } else {
      bot.chat('Failed to locate a log to mine.');
      return;
    }
    // craft planks (4 planks per log)
    const anyPlank = plankNames.find(n => countItem(n) > 0) || 'oak_planks';
    await craftItem(bot, anyPlank, 1); // this will give 4 planks
  }

  // ----- 3. Ensure we have a crafting table item -----
  if (countItem('crafting_table') === 0) {
    bot.chat('No crafting table in inventory, crafting one from 4 planks...');
    // find any 4 planks in inventory
    const plankId = plankNames.map(n => mcData.itemsByName[n]?.id).find(id => id && bot.inventory.count(id) >= 4);
    if (!plankId) {
      bot.chat('Unable to find 4 planks to craft a crafting table.');
      return;
    }
    // Use the 2x2 inventory crafting grid (no table needed)
    const craftingTableItem = mcData.itemsByName.crafting_table.id;
    const recipe = bot.recipesFor(craftingTableItem, null, 1, null)[0];
    if (!recipe) {
      bot.chat('Could not find a recipe for crafting table.');
      return;
    }
    await bot.craft(recipe, 1, null); // allowed for this special case
    bot.chat('Crafted a crafting table.');
  }

  // ----- 4. Place the crafting table near the bot -----
  const craftingTableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!craftingTableBlock) {
    // place it at a free air block adjacent to the bot
    const placePos = bot.entity.position.offset(1, 0, 0);
    bot.chat(`Placing crafting table at ${placePos}`);
    await placeItem(bot, 'crafting_table', placePos);
  } else {
    bot.chat('Crafting table already placed nearby.');
  }

  // ----- 5. Craft the iron chestplate -----
  bot.chat('Crafting iron chestplate...');
  await craftItem(bot, 'iron_chestplate', 1);
  if (countItem('iron_chestplate') >= 1) {
    bot.chat('Successfully crafted an iron chestplate!');
  } else {
    bot.chat('Failed to craft the iron chestplate.');
  }
}