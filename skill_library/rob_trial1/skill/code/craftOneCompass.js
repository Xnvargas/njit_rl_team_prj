// main function to craft one compass
async function craftOneCompass(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ----- helper to count items in inventory -----
  const countItem = name => {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  };

  // ----- 1. Ensure we have 4 iron ingots -----
  const neededIron = Math.max(0, 4 - countItem('iron_ingot'));
  if (neededIron > 0) {
    bot.chat(`🔨 Need ${neededIron} more iron ingot(s). Attempting to smelt from raw iron.`);
    // check we have enough raw iron
    if (countItem('raw_iron') < neededIron) {
      bot.chat('❌ Not enough raw iron to smelt the required ingots.');
      return;
    }
    // pick a fuel (coal > stick > none)
    let fuelName = null;
    if (countItem('coal') > 0) fuelName = 'coal';else if (countItem('stick') > 0) fuelName = 'stick';else {
      bot.chat('❌ No fuel (coal or stick) available for smelting.');
      return;
    }
    await smeltItem(bot, 'raw_iron', fuelName, neededIron);
    bot.chat(`✅ Smelted ${neededIron} iron ingot(s).`);
  } else {
    bot.chat('✅ Already have enough iron ingots.');
  }

  // ----- 2. Ensure we have at least 1 redstone dust -----
  if (countItem('redstone') < 1) {
    bot.chat('❌ No redstone dust in inventory – cannot craft a compass.');
    return;
  }

  // ----- 3. Ensure a crafting table is placed nearby -----
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!tableBlock) {
    // need to place one
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      bot.chat('❌ No crafting table item in inventory to place.');
      return;
    }

    // find a suitable air block adjacent to a solid block
    const basePos = bot.entity.position.floored();
    const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1), new Vec3(0, 1, 0)];
    let placePos = null;
    for (const off of offsets) {
      const pos = basePos.plus(off);
      const block = bot.blockAt(pos);
      if (!block || block.name !== 'air') continue;
      // ensure at least one neighbor is solid
      const neighborDirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, -1, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
      for (const nd of neighborDirs) {
        const nb = bot.blockAt(pos.plus(nd));
        if (nb && nb.name !== 'air') {
          placePos = pos;
          break;
        }
      }
      if (placePos) break;
    }
    if (!placePos) {
      bot.chat('❌ Could not find a suitable spot to place a crafting table.');
      return;
    }
    bot.chat(`📦 Placing crafting table at ${placePos}`);
    await placeItem(bot, 'crafting_table', placePos);
    tableBlock = bot.blockAt(placePos);
    if (!tableBlock || tableBlock.name !== 'crafting_table') {
      bot.chat('❌ Failed to place the crafting table.');
      return;
    }
    bot.chat('✅ Crafting table placed.');
  } else {
    bot.chat('✅ Crafting table already within reach.');
  }

  // ----- 4. Craft the compass -----
  bot.chat('🔨 Crafting a compass...');
  await craftItem(bot, 'compass', 1);
  bot.chat('✅ Crafting attempt finished.');

  // ----- 5. Verify result -----
  const compass = bot.inventory.findInventoryItem(mcData.itemsByName.compass.id);
  if (compass) {
    bot.chat('✅ Successfully crafted a compass!');
  } else {
    bot.chat('⚠️ Crafting failed – compass not found in inventory.');
  }
}