async function mineFiveCoal(bot) {
  const mcData = require('minecraft-data')(bot.version);

  // helper: count items of a given name in inventory
  const countItem = name => {
    const itemInfo = mcData.itemsByName[name];
    if (!itemInfo) return 0;
    const invItem = bot.inventory.findInventoryItem(itemInfo.id);
    return invItem ? invItem.count : 0;
  };

  // 1. Check existing coal
  let coalCount = countItem('coal');
  if (coalCount >= 5) {
    await bot.chat('✅ I already have at least 5 coal.');
    return;
  }

  // 2. Ensure we have a pickaxe that can mine coal (stone or better)
  const hasPickaxe = countItem('stone_pickaxe') || countItem('iron_pickaxe') || countItem('golden_pickaxe') || countItem('diamond_pickaxe') || countItem('netherite_pickaxe');
  if (!hasPickaxe) {
    await bot.chat('❌ I have no pickaxe capable of mining coal.');
    return;
  }

  // 3. Equip a stone pickaxe (or any better one we have)
  const pickaxeItem = bot.inventory.findInventoryItem(mcData.itemsByName.stone_pickaxe.id) || bot.inventory.findInventoryItem(mcData.itemsByName.iron_pickaxe.id) || bot.inventory.findInventoryItem(mcData.itemsByName.golden_pickaxe.id) || bot.inventory.findInventoryItem(mcData.itemsByName.diamond_pickaxe.id) || bot.inventory.findInventoryItem(mcData.itemsByName.netherite_pickaxe.id);
  if (!pickaxeItem) {
    await bot.chat('❌ Unexpectedly could not locate a pickaxe in inventory.');
    return;
  }
  await bot.equip(pickaxeItem, 'hand');

  // possible direction vectors (components are -1, 0, or 1)
  const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];

  // 4. Mining loop
  let attempts = 0;
  const maxAttempts = 10; // safety limit
  while (coalCount < 5 && attempts < maxAttempts) {
    const needed = 5 - coalCount;

    // a. Look for coal ore nearby
    let coalBlock = bot.findBlock({
      matching: mcData.blocksByName.coal_ore.id,
      maxDistance: 32
    });

    // b. If not found, explore randomly until we see one
    if (!coalBlock) {
      const randomDir = directions[Math.floor(Math.random() * directions.length)];
      await bot.chat('🚶‍♂️ Exploring for coal ore...');
      coalBlock = await exploreUntil(bot, randomDir, 60, () => {
        return bot.findBlock({
          matching: mcData.blocksByName.coal_ore.id,
          maxDistance: 32
        });
      });
      if (!coalBlock) {
        await bot.chat('❌ Could not locate any coal ore after exploring.');
        break;
      }
    }

    // c. Mine the required amount (or as many as we can find)
    await bot.chat(`⛏️ Mining ${needed} coal ore block(s)...`);
    await mineBlock(bot, 'coal_ore', needed);
    // d. Small pause for inventory update
    await bot.waitForTicks(5);
    coalCount = countItem('coal');
    attempts++;
  }

  // 5. Final report
  if (coalCount >= 5) {
    await bot.chat(`✅ Success! I now have ${coalCount} coal.`);
  } else {
    await bot.chat(`❌ Task incomplete: only ${coalCount} coal collected.`);
  }
}