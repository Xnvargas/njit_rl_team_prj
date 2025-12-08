// main function to craft a stone pickaxe
async function craftStonePickaxe(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // helper: count items in inventory by name
  const countItem = name => {
    const info = mcData.itemsByName[name];
    if (!info) return 0;
    const stack = bot.inventory.findInventoryItem(info.id);
    return stack ? stack.count : 0;
  };

  // 1) Already have a stone pickaxe?
  if (countItem('stone_pickaxe') >= 1) {
    await bot.chat('✅ I already have a stone pickaxe.');
    return;
  }

  // 2) Ensure we have the raw materials (cobblestone & sticks)
  if (countItem('cobblestone') < 3) {
    await bot.chat('❌ Not enough cobblestone (need 3).');
    return;
  }
  if (countItem('stick') < 2) {
    await bot.chat('❌ Not enough sticks (need 2).');
    return;
  }

  // 3) Ensure a crafting table is placed
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!tableBlock) {
    // we have a crafting table item?
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      await bot.chat('❌ No crafting table item in inventory.');
      return;
    }

    // Try vertical placement: on top of the block we stand on
    const belowPos = bot.entity.position.offset(0, -1, 0);
    const belowBlock = bot.blockAt(belowPos);
    const targetPos = bot.entity.position; // same X,Z, Y = bot's feet (air)

    if (belowBlock && belowBlock.name !== 'air' && bot.blockAt(targetPos).name === 'air') {
      await bot.chat('Placing crafting table on top of the block I stand on...');
      await placeItem(bot, 'crafting_table', targetPos);
    } else {
      // fallback: search a horizontal free spot
      const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
      let placed = false;
      for (const dir of directions) {
        const ref = bot.findBlock({
          matching: b => b && b.boundingBox === 'block' && b.name !== 'air',
          maxDistance: 32
        });
        if (!ref) continue;
        const pos = ref.position.offset(dir.x, dir.y, dir.z);
        if (bot.blockAt(pos).name === 'air') {
          await bot.chat('Placing crafting table at a nearby free spot...');
          await placeItem(bot, 'crafting_table', pos);
          placed = true;
          break;
        }
      }
      if (!placed) {
        await bot.chat('❌ Could not find any free spot to place the crafting table.');
        return;
      }
    }

    // give the world a tick to register the block
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

  // 4) Craft the stone pickaxe
  await bot.chat('Crafting a stone pickaxe...');
  await craftItem(bot, 'stone_pickaxe', 1);
  await bot.waitForTicks(5);

  // 5) Verify result
  if (countItem('stone_pickaxe') >= 1) {
    await bot.chat('✅ Successfully crafted a stone pickaxe!');
  } else {
    await bot.chat('❌ Crafting failed – stone pickaxe not found in inventory.');
  }
}