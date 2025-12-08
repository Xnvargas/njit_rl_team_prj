// main function to smelt exactly 9 raw copper
async function smeltNineRawCopper(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ----- helper: count items in inventory -----
  const countItem = name => {
    const info = mcData.itemsByName[name];
    if (!info) return 0;
    const stack = bot.inventory.findInventoryItem(info.id);
    return stack ? stack.count : 0;
  };

  // ----- 1. Check we have enough raw copper -----
  const neededCopper = 9;
  const haveCopper = countItem('raw_copper');
  if (haveCopper < neededCopper) {
    await bot.chat(`❌ Not enough raw copper (have ${haveCopper}, need ${neededCopper}).`);
    return;
  }

  // ----- 2. Check we have enough fuel (coal) -----
  const neededCoal = neededCopper; // smeltItem uses 1 coal per item
  const haveCoal = countItem('coal');
  if (haveCoal < neededCoal) {
    await bot.chat(`❌ Not enough coal (have ${haveCoal}, need ${neededCoal}).`);
    return;
  }

  // ----- 3. Ensure a furnace is placed -----
  let furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 32
  });
  if (!furnaceBlock) {
    // we need a furnace item in inventory
    const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id);
    if (!furnaceItem) {
      await bot.chat('❌ No furnace item in inventory to place.');
      return;
    }

    // find a suitable air block with a solid neighbour
    const findPlace = () => {
      const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(0, 1, 0), new Vec3(0, -1, 0)];
      const radius = 2;
      const base = bot.entity.position.floored(); // integer block position
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = 0; dy <= 1; dy++) {
          // only ground level and one above
          for (let dz = -radius; dz <= radius; dz++) {
            const pos = base.offset(dx, dy, dz);
            const block = bot.blockAt(pos);
            if (!block || block.name !== 'air') continue;
            // check for at least one solid neighbour
            for (const off of offsets) {
              const nb = bot.blockAt(pos.minus(off));
              if (nb && nb.name !== 'air') {
                return pos; // good spot
              }
            }
          }
        }
      }
      return null;
    };

    // try a few random directions if the first scan fails
    let targetPos = null;
    const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    for (let attempt = 0; attempt < 5 && !targetPos; attempt++) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      // move a bit in that direction before scanning
      await bot.pathfinder.goto(new GoalNear(bot.entity.position.x + dir.x * 5, bot.entity.position.y, bot.entity.position.z + dir.z * 5, 2));
      targetPos = findPlace();
    }
    if (!targetPos) {
      await bot.chat('❌ Could not find a suitable place to put a furnace.');
      return;
    }
    await bot.chat(`🔧 Placing furnace at ${targetPos.x}, ${targetPos.y}, ${targetPos.z}...`);
    await placeItem(bot, 'furnace', targetPos);
    await bot.waitForTicks(5);

    // re‑search for the placed furnace
    furnaceBlock = bot.findBlock({
      matching: mcData.blocksByName.furnace.id,
      maxDistance: 32
    });
    if (!furnaceBlock) {
      await bot.chat('❌ Failed to place the furnace.');
      return;
    }
  }

  // ----- 4. Smelt the copper -----
  const beforeIngots = countItem('copper_ingot');
  await bot.chat(`🔥 Smelting ${neededCopper} raw copper using ${neededCoal} coal...`);
  await smeltItem(bot, 'raw_copper', 'coal', neededCopper);
  // give the furnace a moment to finish
  await bot.waitForTicks(12 * 20); // 12 seconds per item ≈ 9*12s, but smeltItem already waits internally; extra wait for safety
  await bot.waitForTicks(5);

  // ----- 5. Verify result -----
  const afterIngots = countItem('copper_ingot');
  const gained = afterIngots - beforeIngots;
  if (gained >= neededCopper) {
    await bot.chat(`✅ Smelting complete! Gained ${gained} copper ingot(s). Total copper ingots: ${afterIngots}.`);
  } else {
    await bot.chat(`❌ Smelting finished but only gained ${gained} ingot(s).`);
  }
}