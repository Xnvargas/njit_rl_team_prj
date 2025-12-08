// main function to craft a fishing rod (robust version)
async function craftFishingRod(bot) {
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

  // ----- helper: ensure we have at least `n` sticks -----
  const ensureSticks = async n => {
    const have = countItem('stick');
    if (have >= n) return true;
    const need = n - have;
    const table = await ensureCraftingTable();
    if (!table) return false;
    const craftTimes = Math.ceil(need / 4); // 4 sticks per recipe
    await bot.chat(`Crafting ${craftTimes * 4} sticks (need ${need})`);
    await craftItem(bot, 'stick', craftTimes);
    await bot.waitForTicks(5);
    return countItem('stick') >= n;
  };

  // ----- helper: ensure a crafting table is placed nearby -----
  const ensureCraftingTable = async () => {
    // 1. Look for an existing table
    let tableBlock = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32
    });
    if (tableBlock) return tableBlock;

    // 2. Need to place one from inventory
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      await bot.chat('❌ No crafting table item in inventory.');
      return null;
    }

    // 3. Search for a valid placement position
    const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    for (const off of offsets) {
      // candidate position is one block above the offset (so we place on top of a solid block)
      const pos = bot.entity.position.offset(off.x, off.y + 1, off.z);
      const blockHere = bot.blockAt(pos);
      const blockBelow = bot.blockAt(pos.offset(0, -1, 0));

      // need air at the target and a non‑air block below to support the table
      if (blockHere && blockHere.name === 'air' && blockBelow && blockBelow.name !== 'air') {
        await bot.chat(`Placing crafting table at ${pos.x.toFixed(1)} ${pos.y.toFixed(1)} ${pos.z.toFixed(1)}`);
        await placeItem(bot, 'crafting_table', pos);
        await bot.waitForTicks(5);
        // re‑search for the placed table
        tableBlock = bot.findBlock({
          matching: mcData.blocksByName.crafting_table.id,
          maxDistance: 32
        });
        if (tableBlock) return tableBlock;
      }
    }
    await bot.chat('❌ Failed to find a suitable spot for a crafting table.');
    return null;
  };

  // ----- 1. Ensure we have sticks and strings -----
  if (!(await ensureSticks(3))) {
    await bot.chat('❌ Could not obtain enough sticks.');
    return;
  }
  const neededStrings = Math.max(0, 2 - countItem('string'));
  if (neededStrings > 0) {
    await bot.chat('❌ Not enough strings and we have no routine to obtain them here.');
    return;
  }

  // ----- 2. Ensure a crafting table is present -----
  const tableBlock = await ensureCraftingTable();
  if (!tableBlock) return; // already reported the problem inside helper

  // ----- 3. Craft the fishing rod -----
  await bot.chat('Crafting a fishing rod...');
  await craftItem(bot, 'fishing_rod', 1);
  await bot.waitForTicks(5);

  // ----- 4. Verify -----
  const rodCount = countItem('fishing_rod');
  if (rodCount >= 1) {
    await bot.chat(`✅ Successfully crafted a fishing rod! (${rodCount} in inventory)`);
  } else {
    await bot.chat('❌ Crafting failed – no fishing rod found.');
  }
}