// main function to craft one iron helmet
async function craftIronHelmet(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // ---------- 1. ensure a furnace is placed ----------
  let furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 32
  });
  if (!furnaceBlock) {
    // need a furnace item in inventory
    if (countItem('furnace') === 0) {
      bot.chat('I have no furnace item to place.');
      return;
    }
    const placePos = bot.entity.position.offset(1, 0, 0);
    bot.chat('Placing a furnace...');
    await placeItem(bot, 'furnace', placePos);
    furnaceBlock = bot.blockAt(placePos);
    bot.chat('Furnace placed.');
  } else {
    bot.chat('Furnace already nearby.');
  }

  // ---------- 2. smelt raw iron into iron ingots ----------
  const neededIngots = 5;
  if (countItem('iron_ingot') < neededIngots) {
    const rawIronCount = countItem('raw_iron');
    const coalCount = countItem('coal');
    const toSmelt = Math.min(neededIngots - countItem('iron_ingot'), rawIronCount);
    if (toSmelt <= 0) {
      bot.chat('Not enough raw iron to smelt.');
      return;
    }
    if (coalCount < toSmelt) {
      bot.chat('Not enough coal for smelting.');
      return;
    }
    bot.chat(`Smelting ${toSmelt} raw iron into iron ingots...`);
    await smeltItem(bot, 'raw_iron', 'coal', toSmelt);
    bot.chat('Smelting completed.');
  } else {
    bot.chat('Enough iron ingots already in inventory.');
  }

  // ---------- 3. ensure a crafting table is placed ----------
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!tableBlock) {
    if (countItem('crafting_table') === 0) {
      bot.chat('I have no crafting table item to place.');
      return;
    }
    const placePos = bot.entity.position.offset(2, 0, 0);
    bot.chat('Placing a crafting table...');
    await placeItem(bot, 'crafting_table', placePos);
    tableBlock = bot.blockAt(placePos);
    bot.chat('Crafting table placed.');
  } else {
    bot.chat('Crafting table already nearby.');
  }

  // ---------- 4. craft the iron helmet ----------
  if (countItem('iron_ingot') < neededIngots) {
    bot.chat('Still not enough iron ingots after smelting.');
    return;
  }
  bot.chat('Crafting an iron helmet...');
  await craftItem(bot, 'iron_helmet', 1);
  if (countItem('iron_helmet') >= 1) {
    bot.chat('Successfully crafted an iron helmet!');
  } else {
    bot.chat('Failed to craft the iron helmet.');
  }
}