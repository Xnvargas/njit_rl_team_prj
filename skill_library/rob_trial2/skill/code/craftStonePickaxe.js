// main function to craft one stone pickaxe
async function craftStonePickaxe(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ----- helper to count items in inventory -----
  const countItem = name => {
    const itemInfo = mcData.itemsByName[name];
    if (!itemInfo) return 0;
    const invItem = bot.inventory.findInventoryItem(itemInfo.id);
    return invItem ? invItem.count : 0;
  };

  // ----- 1. Check required materials -----
  if (countItem('cobblestone') < 3) {
    await bot.chat('❌ I need at least 3 cobblestone to craft a stone pickaxe.');
    return;
  }
  if (countItem('stick') < 2) {
    await bot.chat('❌ I need at least 2 sticks to craft a stone pickaxe.');
    return;
  }

  // ----- 2. Ensure a crafting table is placed -----
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!tableBlock) {
    await bot.chat('Placing a crafting table...');
    // Find a solid reference block to place the table against
    const reference = bot.findBlock({
      matching: block => block && block.boundingBox === 'block' && block.name !== 'air',
      maxDistance: 32
    });
    if (!reference) {
      await bot.chat('❌ No suitable block nearby to place a crafting table.');
      return;
    }

    // Choose an adjacent air position (simple +1 on X, fallback to other sides)
    const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
    let placed = false;
    for (const off of offsets) {
      const pos = reference.position.offset(off.x, off.y, off.z);
      const target = bot.blockAt(pos);
      if (target && target.name === 'air') {
        await placeItem(bot, 'crafting_table', pos);
        placed = true;
        break;
      }
    }
    if (!placed) {
      await bot.chat('❌ Could not find a free spot next to the reference block to place the table.');
      return;
    }

    // Wait a moment for the block to appear and locate it again
    await bot.waitForTicks(5);
    tableBlock = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32
    });
    if (!tableBlock) {
      await bot.chat('❌ Failed to place the crafting table.');
      return;
    }
    await bot.chat('✅ Crafting table placed.');
  } else {
    await bot.chat('✅ Crafting table already present.');
  }

  // ----- 3. Craft the stone pickaxe -----
  await bot.chat('Crafting a stone pickaxe...');
  await craftItem(bot, 'stone_pickaxe', 1);
  await bot.waitForTicks(5); // allow inventory to update

  // ----- 4. Verify result -----
  if (countItem('stone_pickaxe') >= 1) {
    await bot.chat('✅ Successfully crafted a stone pickaxe!');
  } else {
    await bot.chat('❌ Crafting failed – stone pickaxe not found in inventory.');
  }
}