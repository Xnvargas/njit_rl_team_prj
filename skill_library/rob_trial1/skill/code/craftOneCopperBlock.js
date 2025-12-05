// main function to craft one copper block
async function craftOneCopperBlock(bot) {
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

  // ---------- 1. ensure we have enough copper ingots ----------
  if (countItem('copper_ingot') < 9) {
    bot.chat('Not enough copper ingots, need to smelt raw copper.');
    // ensure we have raw copper
    if (countItem('raw_copper') === 0) {
      bot.chat('No raw copper to smelt. Cannot continue.');
      return;
    }

    // ---------- 1a. ensure a furnace block exists ----------
    let furnaceBlock = bot.findBlock({
      matching: mcData.blocksByName.furnace.id,
      maxDistance: 32
    });
    if (!furnaceBlock) {
      // we have a furnace item in inventory?
      if (!bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id)) {
        bot.chat('No furnace item to place.');
        return;
      }
      // place furnace at a free spot
      const placePos = bot.entity.position.offset(1, 0, 0);
      bot.chat('Placing furnace...');
      await placeItem(bot, 'furnace', placePos);
      furnaceBlock = bot.blockAt(placePos);
      if (!furnaceBlock || furnaceBlock.name !== 'furnace') {
        bot.chat('Failed to place furnace.');
        return;
      }
    }

    // ---------- 1b. smelt raw copper until we have 9 ingots ----------
    const needed = 9 - countItem('copper_ingot');
    const rawCount = countItem('raw_copper');
    const toSmelt = Math.min(needed, rawCount);
    if (toSmelt > 0) {
      // ensure we have some fuel (oak_planks or coal)
      const fuelName = countItem('oak_planks') > 0 ? 'oak_planks' : 'coal';
      if (countItem(fuelName) === 0) {
        bot.chat(`No fuel (${fuelName}) to smelt copper.`);
        return;
      }
      bot.chat(`Smelting ${toSmelt} raw copper using ${fuelName} as fuel...`);
      await smeltItem(bot, 'raw_copper', fuelName, toSmelt);
    }
  }

  // ---------- 2. ensure a crafting table block exists ----------
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 5
  });
  if (!tableBlock) {
    // we need a crafting table item
    if (!bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id)) {
      // craft one (needs 4 oak planks)
      if (countItem('oak_planks') < 4) {
        bot.chat('Not enough oak planks to craft a crafting table.');
        return;
      }
      bot.chat('Crafting a crafting table...');
      await craftItem(bot, 'crafting_table', 1);
    }

    // place the crafting table at a free adjacent block
    let placePos = null;
    for (let i = 0; i < 8; i++) {
      const offset = randomDirection();
      const candidate = bot.entity.position.offset(offset.x, offset.y, offset.z);
      const block = bot.blockAt(candidate);
      const below = bot.blockAt(candidate.offset(0, -1, 0));
      if (block && block.name === 'air' && below && below.name !== 'air') {
        placePos = candidate;
        break;
      }
    }

    // if still not found, explore a bit and try again
    if (!placePos) {
      await exploreUntil(bot, randomDirection(), 60, () => {
        const offset = randomDirection();
        const cand = bot.entity.position.offset(offset.x, offset.y, offset.z);
        const blk = bot.blockAt(cand);
        const below = bot.blockAt(cand.offset(0, -1, 0));
        if (blk && blk.name === 'air' && below && below.name !== 'air') {
          placePos = cand;
          return true;
        }
        return false;
      });
    }
    if (!placePos) {
      bot.chat('Could not find a free spot to place a crafting table.');
      return;
    }
    bot.chat(`Placing crafting table at ${placePos}`);
    await placeItem(bot, 'crafting_table', placePos);
    tableBlock = bot.blockAt(placePos);
    if (!tableBlock || tableBlock.name !== 'crafting_table') {
      bot.chat('Failed to place crafting table.');
      return;
    }
  }

  // ---------- 3. craft the copper block ----------
  if (countItem('copper_ingot') < 9) {
    bot.chat('Still not enough copper ingots after smelting.');
    return;
  }
  bot.chat('Crafting 1 copper block...');
  await craftItem(bot, 'copper_block', 1);

  // ---------- 4. verify ----------
  if (countItem('copper_block') >= 1) {
    bot.chat('Successfully crafted a copper block!');
  } else {
    bot.chat('Failed to craft the copper block.');
  }
}