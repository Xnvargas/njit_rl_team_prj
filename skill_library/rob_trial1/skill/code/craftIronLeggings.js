// main function to craft iron leggings (ensuring enough iron ingots)
async function craftIronLeggings(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // helper: count items in inventory
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // 1️⃣ Ensure we have at least 7 iron ingots
  const REQUIRED_INGOTS = 7;
  let ingotCount = countItem('iron_ingot');
  if (ingotCount < REQUIRED_INGOTS) {
    const need = REQUIRED_INGOTS - ingotCount;
    bot.chat(`Need ${need} more iron ingot(s).`);

    // 2️⃣ Check we have enough raw iron
    const rawIronCount = countItem('raw_iron');
    if (rawIronCount < need) {
      bot.chat(`Not enough raw iron (${rawIronCount}) to smelt ${need} ingot(s).`);
      return;
    }

    // 3️⃣ Choose fuel (coal preferred)
    let fuelName = null;
    if (countItem('coal') > 0) fuelName = 'coal';else if (countItem('stick') > 0) fuelName = 'stick';
    if (!fuelName) {
      bot.chat('No fuel (coal or stick) available. Cannot smelt iron.');
      return;
    }

    // 4️⃣ Ensure a furnace is placed nearby
    let furnaceBlock = bot.findBlock({
      matching: mcData.blocksByName.furnace.id,
      maxDistance: 5
    });
    if (!furnaceBlock) {
      bot.chat('No furnace nearby, trying to place one.');
      if (countItem('furnace') === 0) {
        bot.chat('No furnace item in inventory, cannot place furnace.');
        return;
      }
      // place furnace at a free adjacent block
      const placePos = bot.entity.position.offset(1, 0, 0);
      await placeItem(bot, 'furnace', placePos);
      furnaceBlock = bot.blockAt(placePos);
      bot.chat('Furnace placed.');
    } else {
      bot.chat('Furnace already within reach.');
    }

    // 5️⃣ Smelt the missing ingots
    bot.chat(`Smelting ${need} raw iron using ${fuelName}...`);
    await smeltItem(bot, 'raw_iron', fuelName, need);
    ingotCount = countItem('iron_ingot');
    bot.chat(`Now have ${ingotCount} iron ingot(s).`);
    if (ingotCount < REQUIRED_INGOTS) {
      bot.chat('Smelting did not produce enough ingots. Aborting.');
      return;
    }
  } else {
    bot.chat(`Already have ${ingotCount} iron ingot(s).`);
  }

  // 6️⃣ Ensure a crafting table is nearby
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 5
  });
  if (!tableBlock) {
    bot.chat('No crafting table nearby, attempting to place one.');
    if (countItem('crafting_table') === 0) {
      bot.chat('No crafting table item in inventory. Cannot craft leggings.');
      return;
    }
    const placePos = bot.entity.position.offset(1, 0, 0);
    await placeItem(bot, 'crafting_table', placePos);
    tableBlock = bot.blockAt(placePos);
    bot.chat('Crafting table placed.');
  } else {
    bot.chat('Crafting table already within reach.');
  }

  // 7️⃣ Craft the iron leggings
  bot.chat('Crafting iron leggings...');
  await craftItem(bot, 'iron_leggings', 1);
  bot.chat('Crafting attempt finished.');

  // 8️⃣ Verify result
  if (countItem('iron_leggings') >= 1) {
    bot.chat('Successfully obtained iron leggings.');
  } else {
    bot.chat('Failed to craft iron leggings.');
  }
}