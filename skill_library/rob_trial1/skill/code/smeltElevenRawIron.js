// main function to smelt exactly 11 raw iron
async function smeltElevenRawIron(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helper utilities ----------
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }
  function randomDirection() {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  // ---------- 1. make sure a furnace block exists ----------
  let furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 5
  });
  if (!furnaceBlock) {
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
    bot.chat('Furnace already placed nearby.');
  }

  // ---------- 2. ensure we have at least 11 fuel items ----------
  const fuelNames = ['coal', 'stick', 'oak_log'];
  function totalFuel() {
    return fuelNames.reduce((sum, n) => sum + countItem(n), 0);
  }
  while (totalFuel() < 11) {
    // try to craft sticks from planks or logs
    if (countItem('oak_log') > 0) {
      // craft planks first
      bot.chat('Crafting oak planks from oak log...');
      await craftItem(bot, 'oak_planks', 1); // 1 recipe = 4 planks
    }
    if (countItem('oak_planks') >= 2) {
      bot.chat('Crafting sticks from oak planks...');
      await craftItem(bot, 'stick', 1); // 1 recipe = 4 sticks
    } else {
      // no logs/planks left, cannot make more fuel
      bot.chat('Not enough material to craft more fuel.');
      break;
    }
  }
  if (totalFuel() < 11) {
    bot.chat(`Only have ${totalFuel()} fuel items, need 11. Aborting.`);
    return;
  }

  // ---------- 3. smelt 11 raw iron ----------
  const needed = 11;
  let smelted = 0;
  while (smelted < needed) {
    if (countItem('raw_iron') === 0) {
      bot.chat('Ran out of raw iron before finishing.');
      break;
    }

    // pick a fuel that we still have
    let fuelName = null;
    for (const f of fuelNames) {
      if (countItem(f) > 0) {
        fuelName = f;
        break;
      }
    }
    if (!fuelName) {
      bot.chat('Out of fuel while smelting.');
      break;
    }
    bot.chat(`Smelting raw iron #${smelted + 1} using ${fuelName}...`);
    await smeltItem(bot, 'raw_iron', fuelName, 1);
    smelted++;
  }

  // ---------- 4. report result ----------
  const ingotCount = countItem('iron_ingot');
  if (ingotCount >= needed) {
    bot.chat(`Successfully smelted ${needed} iron ingots (now have ${ingotCount}).`);
  } else {
    bot.chat(`Finished smelting loop but only have ${ingotCount} iron ingots.`);
  }
}