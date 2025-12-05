// -----------------------------------------------------------------------------
// Main function: mine at least five redstone ore blocks (≥5 redstone dust)
// -----------------------------------------------------------------------------
async function mineFiveRedstoneOre(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // --------------------------- helpers ---------------------------------------
  const countItem = name => {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  };
  const getPickaxe = () => {
    const order = ['netherite_pickaxe', 'diamond_pickaxe', 'iron_pickaxe', 'golden_pickaxe', 'stone_pickaxe', 'wooden_pickaxe'];
    for (const n of order) {
      const id = mcData.itemsByName[n]?.id;
      if (!id) continue;
      const item = bot.inventory.findInventoryItem(id);
      if (item) return item;
    }
    return null;
  };

  // eat until hunger is decent (≥14)
  const eatIfHungry = async () => {
    if (bot.food >= 14) return;
    const foodPriority = ['cooked_porkchop', 'porkchop', 'cooked_beef', 'beef'];
    for (const name of foodPriority) {
      const item = bot.inventory.findInventoryItem(mcData.itemsByName[name]?.id);
      if (item) {
        await bot.equip(item, 'hand');
        await bot.consume();
        bot.chat(`🍖 Ate a ${name} (hunger ${bot.food}/20).`);
        if (bot.food >= 14) break;
      }
    }
  };

  // pick a random horizontal direction (no vertical component)
  const randomHorizontal = () => {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  };

  // -------------------------------------------------------------------------
  // 1. Prepare (food & tool)
  // -------------------------------------------------------------------------
  await eatIfHungry();
  const pickaxe = getPickaxe();
  if (!pickaxe) {
    bot.chat('❌ No pickaxe in inventory – cannot mine redstone.');
    return;
  }
  // iron pickaxe or better is required
  const ironId = mcData.itemsByName.iron_pickaxe?.id;
  if (ironId && pickaxe.type < ironId) {
    bot.chat('❌ My best pickaxe is weaker than iron – cannot mine redstone.');
    return;
  }
  await bot.equip(pickaxe, 'hand');
  bot.chat(`✅ Equipped ${pickaxe.name} for mining.`);

  // -------------------------------------------------------------------------
  // 2. Descend to mining depth (Y ≤ 16) while looking for redstone ore
  // -------------------------------------------------------------------------
  const maxDescendSteps = 8; // each step moves ~5 blocks down
  let redstoneBlock = null;
  for (let step = 0; step < maxDescendSteps; step++) {
    // Try to locate ore at current depth
    redstoneBlock = bot.findBlock({
      matching: mcData.blocksByName.redstone_ore.id,
      maxDistance: 32
    });
    if (redstoneBlock) break; // found!

    // Not found – descend a bit
    bot.chat(`🔎 No redstone ore at Y=${Math.floor(bot.entity.position.y)}. Descending...`);
    const downDir = new Vec3(0, -1, 0);
    // exploreUntil will move the bot in the given direction for up to 60 s
    await exploreUntil(bot, downDir, 60, () => null);
    // safety: if we are already below Y=16, stop descending
    if (bot.entity.position.y <= 16) break;
  }

  // Final check after descent
  if (!redstoneBlock) {
    // One last search after the final descent
    redstoneBlock = bot.findBlock({
      matching: mcData.blocksByName.redstone_ore.id,
      maxDistance: 32
    });
  }
  if (!redstoneBlock) {
    bot.chat('❌ Could not locate any redstone ore after descending.');
    return;
  }
  bot.chat(`✅ Found redstone ore at ${redstoneBlock.position}. Starting mining.`);

  // -------------------------------------------------------------------------
  // 3. Mine five redstone ore blocks
  // -------------------------------------------------------------------------
  await mineBlock(bot, 'redstone_ore', 5);
  bot.chat('⛏️ Mined five redstone ore blocks.');

  // -------------------------------------------------------------------------
  // 4. Verify we have at least 5 redstone dust
  // -------------------------------------------------------------------------
  const dustCount = countItem('redstone');
  if (dustCount >= 5) {
    bot.chat(`✅ Success! I now have ${dustCount} redstone dust (≥5).`);
  } else {
    bot.chat(`⚠️ I only have ${dustCount} redstone dust after mining.`);
  }
}