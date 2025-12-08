// main function: mine at least three cobblestone reliably
async function mineThreeCobblestoneReliable(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const Vec3 = require('vec3').Vec3;

  // ---------- helpers ----------
  const countItem = name => {
    const info = mcData.itemsByName[name];
    if (!info) return 0;
    const stack = bot.inventory.findInventoryItem(info.id);
    return stack ? stack.count : 0;
  };
  const hasPickaxe = () => {
    return bot.inventory.items().some(item => {
      const name = mcData.items[item.type]?.name;
      return name && name.endsWith('_pickaxe');
    });
  };
  const equipPickaxe = async () => {
    const pick = bot.inventory.items().find(item => {
      const name = mcData.items[item.type]?.name;
      return name && name.endsWith('_pickaxe');
    });
    if (pick) await bot.equip(pick, 'hand');
  };
  const ensurePickaxe = async () => {
    if (hasPickaxe()) {
      await equipPickaxe();
      return true;
    }
    await bot.chat('🔨 I need a pickaxe. Crafting a wooden pickaxe...');
    // --- ensure planks ---
    if (countItem('oak_planks') < 3) {
      if (countItem('oak_log') > 0) {
        const needed = Math.ceil((3 - countItem('oak_planks')) / 4);
        await bot.chat(`Crafting ${needed * 4} oak planks...`);
        await craftItem(bot, 'oak_planks', needed);
      } else {
        await bot.chat('❌ No oak logs to make planks.');
        return false;
      }
    }
    // --- ensure sticks ---
    if (countItem('stick') < 2) {
      const needed = Math.ceil((2 - countItem('stick')) / 4);
      await bot.chat(`Crafting ${needed * 4} sticks...`);
      await craftItem(bot, 'stick', needed);
    }
    // --- ensure crafting table ---
    let tableBlock = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32
    });
    if (!tableBlock) {
      const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
      if (!tableItem) {
        await bot.chat('❌ No crafting table item available.');
        return false;
      }
      const placePos = bot.entity.position.offset(1, 0, 0);
      await bot.chat('Placing a crafting table...');
      await placeItem(bot, 'crafting_table', placePos);
      await bot.waitForTicks(5);
    }
    // --- craft pickaxe ---
    await bot.chat('Crafting a wooden pickaxe...');
    await craftItem(bot, 'wooden_pickaxe', 1);
    await bot.waitForTicks(5);
    await equipPickaxe();
    return true;
  };
  const randomDirection = () => {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  };
  // --------------------------------

  // 1) Already have enough cobblestone?
  if (countItem('cobblestone') >= 3) {
    await bot.chat('✅ I already have at least 3 cobblestone.');
    return;
  }

  // 2) Ensure we have a pickaxe equipped
  const canPick = await ensurePickaxe();
  if (!canPick) {
    await bot.chat('❌ Cannot obtain a pickaxe, aborting task.');
    return;
  }

  // 3) Mine stone until we have 3 cobblestone
  let attempts = 0;
  const maxAttempts = 10; // safety limit
  while (countItem('cobblestone') < 3 && attempts < maxAttempts) {
    attempts++;

    // find a stone block
    let stoneBlock = bot.findBlock({
      matching: mcData.blocksByName.stone.id,
      maxDistance: 32
    });

    // if none, explore
    if (!stoneBlock) {
      const dir = randomDirection();
      await bot.chat('🔎 Exploring for stone...');
      stoneBlock = await exploreUntil(bot, dir, 60, () => {
        return bot.findBlock({
          matching: mcData.blocksByName.stone.id,
          maxDistance: 32
        });
      });
      if (!stoneBlock) {
        await bot.chat('❌ Could not locate any stone this round.');
        continue; // try next attempt
      }
    }

    // mine ONE stone block
    await bot.chat('⛏️ Mining a stone block...');
    await mineBlock(bot, 'stone', 1);
    await bot.waitForTicks(5); // let the drop be collected

    // re‑count cobblestone
    const cur = countItem('cobblestone');
    await bot.chat(`📦 I now have ${cur} cobblestone.`);
  }

  // 4) Final verification
  const finalCount = countItem('cobblestone');
  if (finalCount >= 3) {
    await bot.chat(`✅ Success! I now have ${finalCount} cobblestone.`);
  } else {
    await bot.chat(`❌ Task incomplete. Only ${finalCount} cobblestone collected.`);
  }
}