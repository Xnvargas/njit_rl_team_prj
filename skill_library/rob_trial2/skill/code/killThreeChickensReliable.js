// main function to kill three chickens reliably
async function killThreeChickensReliable(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  // Return a random horizontal direction (X or Z non‑zero, Y = 0)
  const randomHorizontalDirection = () => {
    const vals = [-1, 0, 1];
    let x = 0,
      z = 0;
    // keep looping until we get a non‑zero vector
    while (x === 0 && z === 0) {
      x = vals[Math.floor(Math.random() * vals.length)];
      z = vals[Math.floor(Math.random() * vals.length)];
    }
    return new Vec3(x, 0, z);
  };

  // Equip any pickaxe or sword we have; return true if successful
  const ensureWeaponEquipped = async () => {
    const weapon = bot.inventory.items().find(item => {
      const name = mcData.items[item.type]?.name;
      return name && (name.endsWith('_pickaxe') || name.endsWith('_sword'));
    });
    if (!weapon) {
      await bot.chat('❌ No weapon (pickaxe or sword) in inventory – cannot fight.');
      return false;
    }
    await bot.equip(weapon, 'hand');
    await bot.chat('🔨 Equipped a weapon for combat.');
    return true;
  };

  // Find the nearest chicken within 32 blocks, or null
  const findChicken = () => {
    return bot.nearestEntity(e => e.name === 'chicken' && e.position.distanceTo(bot.entity.position) < 32);
  };

  // Explore in random directions until a chicken is found or attempts run out
  const searchForChicken = async (maxAttempts = 8) => {
    let chicken = findChicken();
    let attempts = 0;
    while (!chicken && attempts < maxAttempts) {
      const dir = randomHorizontalDirection();
      await bot.chat(`🚶‍♂️ Exploring in direction ${dir} (attempt ${attempts + 1})...`);
      // explore up to 120 seconds per attempt
      chicken = await exploreUntil(bot, dir, 120, () => findChicken());
      attempts++;
    }
    return chicken;
  };

  // ---------- start ----------
  const canFight = await ensureWeaponEquipped();
  if (!canFight) return;
  for (let i = 0; i < 3; i++) {
    await bot.chat(`🐔 Searching for chicken #${i + 1}...`);
    const chicken = await searchForChicken();
    if (!chicken) {
      await bot.chat('❌ Could not locate any chickens after several explorations. Stopping.');
      return;
    }
    await bot.chat(`⚔️ Attacking chicken #${i + 1}...`);
    // killMob attacks the nearest entity of the given name (within 32 blocks)
    await killMob(bot, 'chicken', 300);

    // short pause to let drops be collected
    await bot.waitForTicks(20);
  }
  await bot.chat('✅ Successfully killed three chickens!');
}