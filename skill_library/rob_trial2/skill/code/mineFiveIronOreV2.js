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

  // ensure we have at least `needed` sticks (craft from oak planks if necessary)
  const ensureSticks = async needed => {
    if (countItem('stick') >= needed) return true;
    const missing = needed - countItem('stick');
    // 2 oak planks → 4 sticks, so calculate planks required
    const planksNeeded = Math.ceil(missing / 4) * 2;
    if (countItem('oak_planks') < planksNeeded) {
      await bot.chat('❌ Not enough oak planks to craft sticks.');
      return false;
    }
    await bot.chat(`Crafting ${missing} sticks from ${planksNeeded} oak planks...`);
    await craftItem(bot, 'stick', missing); // craft the exact number of sticks
    await bot.waitForTicks(5);
    return countItem('stick') >= needed;
  };

  // ensure we have a pickaxe that can mine iron ore (stone or better)
  const ensurePickaxe = async () => {
    const pickaxeOrder = ['diamond_pickaxe', 'iron_pickaxe', 'gold_pickaxe', 'stone_pickaxe', 'wooden_pickaxe'];
    for (const name of pickaxeOrder) {
      const info = mcData.itemsByName[name];
      const item = bot.inventory.findInventoryItem(info.id);
      if (item) {
        await bot.equip(item, 'hand');
        await bot.chat(`Equipped ${name}.`);
        // stone pickaxe is sufficient for iron ore
        if (['stone_pickaxe', 'iron_pickaxe', 'diamond_pickaxe', 'gold_pickaxe'].includes(name)) {
          return true;
        }
      }
    }

    // No pickaxe found – craft a stone pickaxe (3 cobblestone + 2 sticks)
    await bot.chat('No pickaxe found, crafting a stone pickaxe...');
    if (countItem('cobblestone') < 3) {
      await bot.chat('❌ Not enough cobblestone to craft a stone pickaxe.');
      return false;
    }
    const sticksOk = await ensureSticks(2);
    if (!sticksOk) return false;
    await craftItem(bot, 'stone_pickaxe', 1);
    await bot.waitForTicks(5);
    const stonePickInfo = mcData.itemsByName['stone_pickaxe'];
    const stonePick = bot.inventory.findInventoryItem(stonePickInfo.id);
    if (stonePick) {
      await bot.equip(stonePick, 'hand');
      await bot.chat('Equipped newly crafted stone pickaxe.');
      return true;
    }
    await bot.chat('❌ Failed to craft a stone pickaxe.');
    return false;
  };

  // ---------- preparation ----------
  const hasPickaxe = await ensurePickaxe();
  if (!hasPickaxe) {
    await bot.chat('❌ Cannot continue without a suitable pickaxe.');
    return;
  }

  // random horizontal directions for exploration
  const exploreDirections = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];

  // ---------- main mining loop ----------
  while (countItem('raw_iron') < 5) {
    const needed = 5 - countItem('raw_iron');
    await bot.chat(`Need ${needed} more raw iron. Searching for iron ore...`);

    // try to locate iron ore nearby
    let oreBlock = bot.findBlock({
      matching: mcData.blocksByName['iron_ore'].id,
      maxDistance: 32
    });

    // if not found, explore in a random direction
    if (!oreBlock) {
      const dir = exploreDirections[Math.floor(Math.random() * exploreDirections.length)];
      await bot.chat('Exploring for iron ore...');
      oreBlock = await exploreUntil(bot, dir, 60, () => {
        return bot.findBlock({
          matching: mcData.blocksByName['iron_ore'].id,
          maxDistance: 32
        });
      });
      if (!oreBlock) {
        await bot.chat('❌ Could not locate any iron ore after exploring.');
        return; // give up
      }
    }

    // mine the needed amount (or as many as the cluster provides)
    await bot.chat(`Found iron ore at ${oreBlock.position}. Mining ${needed} block(s)...`);
    await mineBlock(bot, 'iron_ore', needed);
    await bot.waitForTicks(5); // let inventory update
  }
  await bot.chat('✅ Successfully obtained at least 5 raw iron!');
}