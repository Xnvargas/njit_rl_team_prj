// Main function: smelt 5 raw iron (including placing furnace and gathering fuel if needed)
async function smeltFiveRawIron(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  const countItem = name => {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  };

  // Ensure we have at least 5 raw iron
  const rawIronCount = countItem('raw_iron');
  if (rawIronCount < 5) {
    bot.chat(`❌ I only have ${rawIronCount} raw iron, need at least 5.`);
    return;
  }
  bot.chat(`✅ I have ${rawIronCount} raw iron, proceeding to smelt 5.`);

  // ---------- 1. Ensure a furnace is placed ----------
  let furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 32
  });
  if (!furnaceBlock) {
    // Find a furnace item in inventory
    const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id);
    if (!furnaceItem) {
      bot.chat('❌ No furnace item in inventory to place.');
      return;
    }

    // Find a suitable position (air block with a solid neighbor)
    const basePos = bot.entity.position.floored();
    const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    let placePos = null;
    for (const off of offsets) {
      const pos = basePos.plus(off);
      const block = bot.blockAt(pos);
      if (block && block.name === 'air') {
        // check for at least one solid neighbor
        const neighborVectors = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, -1, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
        for (const n of neighborVectors) {
          const nb = bot.blockAt(pos.plus(n));
          if (nb && nb.name !== 'air') {
            placePos = pos;
            break;
          }
        }
      }
      if (placePos) break;
    }
    if (!placePos) {
      bot.chat('❌ Could not find a suitable spot to place a furnace.');
      return;
    }
    bot.chat(`🔧 Placing furnace at ${placePos}`);
    await placeItem(bot, 'furnace', placePos);
    furnaceBlock = bot.blockAt(placePos);
    if (!furnaceBlock || furnaceBlock.name !== 'furnace') {
      bot.chat('❌ Failed to place the furnace.');
      return;
    }
    bot.chat('✅ Furnace placed successfully.');
  } else {
    bot.chat('✅ Furnace already nearby.');
  }

  // ---------- 2. Ensure we have enough fuel (coal) ----------
  const coalNeeded = 5;
  let coalCount = countItem('coal');
  if (coalCount < coalNeeded) {
    const missing = coalNeeded - coalCount;
    bot.chat(`🔨 Need ${missing} more coal. Mining coal ore...`);
    // Mine enough coal ore blocks to obtain the missing coal
    await mineBlock(bot, 'coal_ore', missing);
    // Update count after mining
    coalCount = countItem('coal');
    if (coalCount < coalNeeded) {
      bot.chat(`❌ Still only have ${coalCount} coal after mining. Cannot continue.`);
      return;
    }
    bot.chat(`✅ Acquired ${coalCount} coal.`);
  } else {
    bot.chat(`✅ Sufficient coal (${coalCount}) available for smelting.`);
  }

  // ---------- 3. Smelt 5 raw iron ----------
  bot.chat('🔥 Starting smelting of 5 raw iron...');
  await smeltItem(bot, 'raw_iron', 'coal', 5);
  bot.chat('✅ Smelting finished.');

  // ---------- 4. Verify result ----------
  const ironIngotCount = countItem('iron_ingot');
  if (ironIngotCount >= 5) {
    bot.chat(`✅ Success! I now have ${ironIngotCount} iron ingot(s).`);
  } else {
    bot.chat(`⚠️ Smelting completed but only ${ironIngotCount} iron ingot(s) in inventory.`);
  }
}