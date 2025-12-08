// main function to mine at least five iron ore blocks
async function mineFiveIronOre(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  const countItem = name => {
    const info = mcData.itemsByName[name];
    if (!info) return 0;
    const stack = bot.inventory.findInventoryItem(info.id);
    return stack ? stack.count : 0;
  };
  const equipStonePickaxe = async () => {
    const pickaxe = bot.inventory.items().find(item => {
      const n = mcData.items[item.type]?.name;
      return n && n.endsWith('_pickaxe') && n !== 'wooden_pickaxe';
    });
    if (pickaxe) await bot.equip(pickaxe, 'hand');
  };
  // --------------------------------

  // 1) Do we already have enough iron ore?
  let ironCount = countItem('iron_ore');
  if (ironCount >= 5) {
    await bot.chat('✅ I already have at least 5 iron ore.');
    return;
  }

  // 2) Ensure a stone (or better) pickaxe is equipped
  await equipStonePickaxe();

  // 3) Mining loop
  let attempts = 0;
  const maxAttempts = 10; // safety cap
  while (ironCount < 5 && attempts < maxAttempts) {
    attempts++;

    // a) Try to find iron ore nearby
    let oreBlock = bot.findBlock({
      matching: mcData.blocksByName.iron_ore.id,
      maxDistance: 32
    });

    // b) If not found, explore in a random direction
    if (!oreBlock) {
      const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
      const randomDir = dirs[Math.floor(Math.random() * dirs.length)];
      await bot.chat('🔎 Exploring for iron ore...');
      oreBlock = await exploreUntil(bot, randomDir, 60, () => bot.findBlock({
        matching: mcData.blocksByName.iron_ore.id,
        maxDistance: 32
      }));
      if (!oreBlock) {
        await bot.chat('❌ Could not locate any iron ore this round.');
        continue; // go to next attempt
      }
    }

    // c) Mine the needed amount (or as many as we can find at once)
    const needed = 5 - ironCount;
    await bot.chat(`⛏️ Mining ${needed} iron ore block(s)...`);
    await mineBlock(bot, 'iron_ore', needed);
    // small pause for inventory to update
    await bot.waitForTicks(5);
    ironCount = countItem('iron_ore');
    await bot.chat(`📦 I now have ${ironCount} iron ore.`);
  }

  // 4) Final report
  if (ironCount >= 5) {
    await bot.chat(`✅ Success! Collected ${ironCount} iron ore.`);
  } else {
    await bot.chat(`❌ Task incomplete. Only ${ironCount} iron ore collected.`);
  }
}