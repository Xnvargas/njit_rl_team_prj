// main function to smelt 10 raw copper
async function smeltTenRawCopper(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helper ----------
  const countItem = name => {
    const info = mcData.itemsByName[name];
    if (!info) return 0;
    const stack = bot.inventory.findInventoryItem(info.id);
    return stack ? stack.count : 0;
  };

  // ---------- 1. Ensure we have at least 10 raw copper ----------
  const neededCopper = 10;
  let rawCopper = countItem('raw_copper');
  if (rawCopper < neededCopper) {
    const missing = neededCopper - rawCopper;
    await bot.chat(`Need ${missing} more raw copper, mining now...`);
    await mineBlock(bot, 'raw_copper', missing);
    await bot.waitForTicks(5);
    rawCopper = countItem('raw_copper');
    if (rawCopper < neededCopper) {
      await bot.chat('❌ Still not enough raw copper after mining.');
      return;
    }
  }

  // ---------- 2. Ensure we have enough coal (one per item for smeltItem) ----------
  const neededCoal = neededCopper; // smeltItem consumes 1 coal per item
  let coal = countItem('coal');
  if (coal < neededCoal) {
    const missing = neededCoal - coal;
    await bot.chat(`Need ${missing} more coal, mining coal ore...`);
    await mineBlock(bot, 'coal_ore', missing);
    await bot.waitForTicks(5);
    // smelt the newly mined raw coal (if any) – here we just assume we got coal directly
    coal = countItem('coal');
    if (coal < neededCoal) {
      await bot.chat('❌ Not enough coal after mining.');
      return;
    }
  }

  // ---------- 3. Ensure a furnace block is placed ----------
  let furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 32
  });
  if (!furnaceBlock) {
    // need to place one from inventory
    const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id);
    if (!furnaceItem) {
      await bot.chat('❌ No furnace item in inventory to place.');
      return;
    }

    // pick a nearby air block (simple offsets around the bot)
    const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    let placed = false;
    for (const off of offsets) {
      const pos = bot.entity.position.offset(off.x, off.y, off.z);
      const block = bot.blockAt(pos);
      if (block && block.name === 'air') {
        await bot.chat(`Placing furnace at ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}...`);
        await placeItem(bot, 'furnace', pos);
        await bot.waitForTicks(5);
        furnaceBlock = bot.findBlock({
          matching: mcData.blocksByName.furnace.id,
          maxDistance: 32
        });
        if (furnaceBlock) placed = true;
        break;
      }
    }
    if (!placed || !furnaceBlock) {
      await bot.chat('❌ Failed to place a furnace.');
      return;
    }
  }

  // ---------- 4. Smelt the raw copper ----------
  await bot.chat(`Smelting ${neededCopper} raw copper using ${neededCoal} coal...`);
  await smeltItem(bot, 'raw_copper', 'coal', neededCopper);
  await bot.waitForTicks(5);

  // ---------- 5. Verify result ----------
  const copperIngots = countItem('copper_ingot');
  if (copperIngots >= neededCopper) {
    await bot.chat(`✅ Successfully smelted ${neededCopper} copper ingots!`);
  } else {
    await bot.chat(`❌ Smelting incomplete. Copper ingots in inventory: ${copperIngots}`);
  }
}