// main function: catch at least five fish
async function catchFiveFish(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // ---------- helpers ----------
  const countItem = name => {
    const info = mcData.itemsByName[name];
    if (!info) return 0;
    const item = bot.inventory.findInventoryItem(info.id);
    return item ? item.count : 0;
  };
  const totalFish = () => {
    return countItem('cod') + countItem('salmon') + countItem('tropical_fish') + countItem('pufferfish');
  };
  const hasFishingRod = () => {
    const rodInfo = mcData.itemsByName.fishing_rod;
    return !!bot.inventory.findInventoryItem(rodInfo.id);
  };

  // Find a water block (still or flowing) within 32 blocks
  const findWaterBlock = () => {
    return bot.findBlock({
      matching: b => b && (b.name === 'water' || b.name === 'flowing_water'),
      maxDistance: 32
    });
  };

  // Choose a random cardinal/diagonal direction vector
  const randomDirection = () => {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  };

  // ---------- 1. Ensure we have a fishing rod ----------
  if (!hasFishingRod()) {
    await bot.chat('❌ I have no fishing rod, cannot fish.');
    return;
  }

  // ---------- 2. Locate water ----------
  let waterBlock = findWaterBlock();
  if (!waterBlock) {
    await bot.chat('🔎 Searching for water...');
    const dir = randomDirection();
    waterBlock = await exploreUntil(bot, dir, 60, () => findWaterBlock());
  }
  if (!waterBlock) {
    await bot.chat('❌ Could not find any water within 32 blocks.');
    return;
  }

  // ---------- 3. Move next to water ----------
  await bot.chat('🚶‍♂️ Moving next to water...');
  await bot.pathfinder.goto(new GoalNear(waterBlock.position.x, waterBlock.position.y, waterBlock.position.z, 1));

  // ---------- 4. Equip fishing rod ----------
  const rodInfo = mcData.itemsByName.fishing_rod;
  const rodItem = bot.inventory.findInventoryItem(rodInfo.id);
  await bot.equip(rodItem, 'hand');

  // ---------- 5. Fish until we have 5 ----------
  await bot.chat('🎣 Starting to fish...');
  while (totalFish() < 5) {
    try {
      await bot.fish(); // resolves when a catch occurs
      // short pause for inventory to update
      await bot.waitForTicks(5);
    } catch (err) {
      await bot.chat('⚠️ Fishing attempt failed, retrying...');
    }
  }

  // ---------- 6. Final report ----------
  await bot.chat(`✅ I have caught ${totalFish()} fish!`);
}