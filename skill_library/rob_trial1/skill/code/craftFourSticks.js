// main function to craft at least 4 sticks
async function craftFourSticks(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // total planks of any wood type
  function countAllPlanks() {
    const plankNames = ['oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 'acacia_planks', 'dark_oak_planks', 'crimson_planks', 'warped_planks'];
    return plankNames.reduce((sum, n) => sum + countItem(n), 0);
  }

  // find any log block name we have in inventory
  function findLogInInventory() {
    const logNames = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'crimson_stem', 'warped_stem', 'mangrove_log'];
    for (const n of logNames) {
      if (countItem(n) > 0) return n;
    }
    return null;
  }

  // ---------- 1. ensure a crafting table block is placed ----------
  let craftingTableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 5
  });
  if (!craftingTableBlock) {
    // we have a crafting table item?
    if (countItem('crafting_table') === 0) {
      bot.chat('I need a crafting table but have none.');
      return;
    }
    // place it at a free adjacent block
    const placePos = bot.entity.position.offset(1, 0, 0);
    bot.chat('Placing a crafting table...');
    await placeItem(bot, 'crafting_table', placePos);
    craftingTableBlock = bot.blockAt(placePos);
    bot.chat('Crafting table placed.');
  } else {
    bot.chat('Crafting table already nearby.');
  }

  // ---------- 2. ensure we have at least 2 planks ----------
  if (countAllPlanks() < 2) {
    bot.chat('Not enough planks, trying to craft from logs...');
    const logName = findLogInInventory();
    if (!logName) {
      bot.chat('No logs in inventory to make planks.');
      return;
    }
    // each log yields 4 planks of its type
    const plankName = logName.replace('_log', '_planks').replace('_stem', '_planks');
    await craftItem(bot, plankName, 1); // 1 craft = 4 planks
    bot.chat(`Crafted ${plankName} from ${logName}.`);
  }

  // ---------- 3. craft sticks ----------
  // verify again we have at least 2 planks
  if (countAllPlanks() < 2) {
    bot.chat('Still not enough planks after attempting to craft them.');
    return;
  }
  bot.chat('Crafting sticks (4 sticks)...');
  await craftItem(bot, 'stick', 1); // yields 4 sticks
  bot.chat('Sticks crafted!');

  // ---------- 4. final verification ----------
  const sticks = countItem('stick');
  if (sticks >= 4) {
    bot.chat(`Success: I now have ${sticks} sticks.`);
  } else {
    bot.chat(`Unexpected: only ${sticks} sticks after crafting.`);
  }
}