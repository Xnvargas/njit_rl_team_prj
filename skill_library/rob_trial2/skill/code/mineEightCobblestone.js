// main function to mine at least 8 cobblestone
async function mineEightCobblestone(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ----- helper: count items in inventory -----
  const countItem = name => {
    const itemInfo = mcData.itemsByName[name];
    if (!itemInfo) return 0;
    const invItem = bot.inventory.findInventoryItem(itemInfo.id);
    return invItem ? invItem.count : 0;
  };

  // ----- 1. Check current cobblestone -----
  const targetAmount = 8;
  let have = countItem('cobblestone');
  if (have >= targetAmount) {
    await bot.chat(`✅ I already have ${have} cobblestone.`);
    return;
  }
  await bot.chat(`🔎 I need ${targetAmount - have} more cobblestone.`);

  // ----- 2. Ensure we have a pickaxe (any) -----
  const hasPickaxe = countItem('wooden_pickaxe') || countItem('stone_pickaxe') || countItem('iron_pickaxe') || countItem('golden_pickaxe') || countItem('diamond_pickaxe') || countItem('netherite_pickaxe');
  if (!hasPickaxe) {
    await bot.chat('❌ I have no pickaxe to mine stone.');
    return;
  }

  // ----- 3. Mining loop -----
  while (have < targetAmount) {
    const needed = targetAmount - have;

    // try to find stone nearby
    let stoneBlock = bot.findBlock({
      matching: mcData.blocksByName.stone.id,
      maxDistance: 32
    });

    // if not found, explore in a random direction
    if (!stoneBlock) {
      const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
      const randomDir = directions[Math.floor(Math.random() * directions.length)];
      await bot.chat('🚶‍♂️ Exploring for stone...');
      stoneBlock = await exploreUntil(bot, randomDir, 60, () => {
        return bot.findBlock({
          matching: mcData.blocksByName.stone.id,
          maxDistance: 32
        });
      });
      if (!stoneBlock) {
        await bot.chat('❌ Could not find any stone after exploring.');
        return;
      }
    }

    // mine the required amount (or as many as we can find)
    const toMine = Math.min(needed, 8); // mine up to 8 at once; mineBlock will collect up to this count
    await bot.chat(`⛏️ Mining ${toMine} stone block(s)...`);
    await mineBlock(bot, 'stone', toMine);
    // small pause to let inventory update
    await bot.waitForTicks(5);
    have = countItem('cobblestone');
  }

  // ----- 4. Final report -----
  await bot.chat(`✅ Successfully collected ${have} cobblestone!`);
}