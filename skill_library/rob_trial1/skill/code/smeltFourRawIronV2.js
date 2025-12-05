// main function to smelt four raw iron
async function smeltFourRawIron(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  const countItem = name => {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  };

  // Find a suitable position (air with at least one solid neighbor) near the bot
  const findPlacePosition = () => {
    const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1), new Vec3(0, 1, 0), new Vec3(0, -1, 0)];
    const base = bot.entity.position.floored();
    for (const off of offsets) {
      const pos = base.offset(off.x, off.y, off.z);
      const block = bot.blockAt(pos);
      if (!block || block.name !== 'air') continue; // need air to place into

      // at least one adjacent solid block
      const neighbor = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, -1, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
      for (const n of neighbor) {
        const nb = bot.blockAt(pos.plus(n));
        if (nb && nb.name !== 'air') return pos;
      }
    }
    return null;
  };

  // ---------- 1. Check raw iron ----------
  const neededIron = 4;
  const haveRawIron = countItem('raw_iron');
  if (haveRawIron < neededIron) {
    bot.chat(`❌ I only have ${haveRawIron} raw iron, need ${neededIron}.`);
    return;
  }

  // ---------- 2. Check fuel ----------
  let fuelName = null;
  if (countItem('coal') > 0) fuelName = 'coal';else if (countItem('stick') > 0) fuelName = 'stick';else {
    bot.chat('❌ No fuel (coal or stick) available for smelting.');
    return;
  }

  // ---------- 3. Ensure a furnace is placed ----------
  let furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 32
  });
  if (!furnaceBlock) {
    // need to place a furnace from inventory
    const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id);
    if (!furnaceItem) {
      bot.chat('❌ I have no furnace item to place.');
      return;
    }
    const placePos = findPlacePosition();
    if (!placePos) {
      bot.chat('❌ Could not find a suitable spot to place a furnace.');
      return;
    }
    bot.chat(`📦 Placing furnace at ${placePos}`);
    await placeItem(bot, 'furnace', placePos);
    furnaceBlock = bot.blockAt(placePos);
    if (!furnaceBlock || furnaceBlock.name !== 'furnace') {
      bot.chat('❌ Failed to place the furnace.');
      return;
    }
    bot.chat('✅ Furnace placed.');
  } else {
    bot.chat('✅ Furnace already nearby.');
  }

  // ---------- 4. Smelt the raw iron ----------
  bot.chat(`🔥 Smelting ${neededIron} raw iron using ${fuelName}...`);
  await smeltItem(bot, 'raw_iron', fuelName, neededIron);
  bot.chat('✅ Smelting finished.');

  // ---------- 5. Verify result ----------
  const ironIngots = countItem('iron_ingot');
  if (ironIngots >= neededIron) {
    bot.chat(`✅ I now have ${ironIngots} iron ingot(s).`);
  } else {
    bot.chat(`⚠️ Smelting incomplete: only ${ironIngots} iron ingot(s) present.`);
  }
}