// main function to craft 1 lightning rod
async function craftLightningRod(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // pick a random horizontal direction (components -1,0,1, not all zero)
  function randomDirection() {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  // ---------- 1. ensure enough copper ingots ----------
  const neededIngot = 3;
  if (countItem('copper_ingot') < neededIngot) {
    const missing = neededIngot - countItem('copper_ingot');
    bot.chat(`Need ${missing} more copper ingot(s). Trying to smelt raw copper.`);

    // ensure we have raw copper
    if (countItem('raw_copper') < missing) {
      bot.chat('Not enough raw copper to smelt. Cannot craft lightning rod.');
      return;
    }

    // ---------- 1a. ensure a furnace block exists ----------
    let furnaceBlock = bot.findBlock({
      matching: mcData.blocksByName.furnace.id,
      maxDistance: 32
    });
    if (!furnaceBlock) {
      const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id);
      if (!furnaceItem) {
        bot.chat('No furnace item to place.');
        return;
      }
      // find a free spot to place the furnace
      let placed = false;
      for (let attempt = 0; attempt < 5 && !placed; attempt++) {
        const dir = randomDirection();
        const pos = bot.entity.position.offset(dir.x, 0, dir.z);
        const target = bot.blockAt(pos);
        const below = bot.blockAt(pos.offset(0, -1, 0));
        if (target && target.name === 'air' && below && below.name !== 'air') {
          try {
            await placeItem(bot, 'furnace', pos);
            furnaceBlock = bot.blockAt(pos);
            if (furnaceBlock && furnaceBlock.name === 'furnace') placed = true;
          } catch (e) {
            // ignore and try another spot
          }
        }
      }
      if (!placed) {
        bot.chat('Failed to place a furnace.');
        return;
      }
    }

    // ---------- 1b. smelt raw copper ----------
    const fuelName = countItem('coal') > 0 ? 'coal' : countItem('oak_planks') > 0 ? 'oak_planks' : null;
    if (!fuelName) {
      bot.chat('No fuel (coal or oak planks) to smelt copper.');
      return;
    }
    await smeltItem(bot, 'raw_copper', fuelName, missing);
    bot.chat(`Smelted ${missing} raw copper into copper ingots.`);
  }

  // ---------- 2. ensure a crafting table block exists ----------
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!tableBlock) {
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      bot.chat('No crafting table item to place.');
      return;
    }
    // find a free spot near the bot
    let placed = false;
    for (let attempt = 0; attempt < 5 && !placed; attempt++) {
      const dir = randomDirection();
      const pos = bot.entity.position.offset(dir.x, 0, dir.z);
      const target = bot.blockAt(pos);
      const below = bot.blockAt(pos.offset(0, -1, 0));
      if (target && target.name === 'air' && below && below.name !== 'air') {
        try {
          await placeItem(bot, 'crafting_table', pos);
          tableBlock = bot.blockAt(pos);
          if (tableBlock && tableBlock.name === 'crafting_table') placed = true;
        } catch (e) {
          // ignore and try another spot
        }
      }
    }
    if (!placed) {
      bot.chat('Failed to place a crafting table.');
      return;
    }
    bot.chat('Placed a crafting table.');
  } else {
    bot.chat('Found an existing crafting table.');
  }

  // ---------- 3. craft the lightning rod ----------
  bot.chat('Crafting lightning rod...');
  await craftItem(bot, 'lightning_rod', 1);

  // ---------- 4. verify ----------
  if (countItem('lightning_rod') >= 1) {
    bot.chat('Successfully crafted a lightning rod!');
  } else {
    bot.chat('Crafting failed – no lightning rod in inventory.');
  }
}