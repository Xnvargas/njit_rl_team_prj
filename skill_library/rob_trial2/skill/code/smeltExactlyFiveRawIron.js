// Main function: smelt exactly five raw iron and verify the inventory changes
async function smeltExactlyFiveRawIron(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ----- helper to count items in inventory -----
  const countItem = name => {
    const info = mcData.itemsByName[name];
    if (!info) return 0;
    const stack = bot.inventory.findInventoryItem(info.id);
    return stack ? stack.count : 0;
  };

  // ----- 1. Verify we have enough raw iron and fuel -----
  const rawIronBefore = countItem('raw_iron');
  const coalBefore = countItem('coal');
  if (rawIronBefore < 5) {
    await bot.chat(`❌ I only have ${rawIronBefore} raw iron – need at least 5.`);
    return;
  }
  if (coalBefore < 1) {
    await bot.chat('❌ I need at least one piece of coal as fuel.');
    return;
  }
  await bot.chat('✅ Required items are present. Preparing to smelt...');

  // ----- 2. Ensure a furnace block is placed -----
  let furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 32
  });
  if (!furnaceBlock) {
    // We need a furnace item in inventory
    const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id);
    if (!furnaceItem) {
      await bot.chat('❌ No furnace item in inventory to place.');
      return;
    }

    // Find an adjacent air block to place the furnace
    const reference = bot.findBlock({
      matching: b => b && b.name !== 'air',
      maxDistance: 32
    });
    if (!reference) {
      await bot.chat('❌ Could not find a solid block to place the furnace next to.');
      return;
    }

    // Try a few offsets until we hit air
    const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
    let placed = false;
    for (const off of offsets) {
      const pos = reference.position.offset(off.x, off.y, off.z);
      const target = bot.blockAt(pos);
      if (target && target.name === 'air') {
        await bot.chat(`Placing a furnace at ${pos.x}, ${pos.y}, ${pos.z}...`);
        await placeItem(bot, 'furnace', pos);
        await bot.waitForTicks(5);
        furnaceBlock = bot.findBlock({
          matching: mcData.blocksByName.furnace.id,
          maxDistance: 32
        });
        placed = true;
        break;
      }
    }
    if (!placed || !furnaceBlock) {
      await bot.chat('❌ Failed to place the furnace.');
      return;
    }
    await bot.chat('✅ Furnace placed.');
  } else {
    await bot.chat('✅ Furnace already present.');
  }

  // ----- 3. Record pre‑smelt counts -----
  const ironIngotBefore = countItem('iron_ingot');

  // ----- 4. Smelt exactly 5 raw iron -----
  await bot.chat('⛏️ Starting smelting of 5 raw iron...');
  await smeltItem(bot, 'raw_iron', 'coal', 5);
  await bot.waitForTicks(5); // allow inventory to update

  // ----- 5. Verify result -----
  const rawIronAfter = countItem('raw_iron');
  const ironIngotAfter = countItem('iron_ingot');
  const rawIronConsumed = rawIronBefore - rawIronAfter;
  const ingotsGained = ironIngotAfter - ironIngotBefore;
  if (rawIronConsumed === 5 && ingotsGained === 5) {
    await bot.chat(`✅ Smelting complete! Consumed 5 raw iron and produced 5 iron ingots (now ${ironIngotAfter} total).`);
  } else {
    await bot.chat(`❌ Smelting result unexpected. Raw iron consumed: ${rawIronConsumed}, iron ingots gained: ${ingotsGained}.`);
  }
}