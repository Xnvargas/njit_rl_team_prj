// main function to craft an iron pickaxe
async function craftIronPickaxe(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helper ----------
  const countItem = name => {
    const info = mcData.itemsByName[name];
    if (!info) return 0;
    const stack = bot.inventory.findInventoryItem(info.id);
    return stack ? stack.count : 0;
  };

  // ---------- 1. Ensure enough iron ingots ----------
  const neededIngots = 3;
  if (countItem('iron_ingot') < neededIngots) {
    const missing = neededIngots - countItem('iron_ingot');
    await bot.chat(`Need ${missing} more iron ingot(s). Smelting raw iron...`);

    // Ensure a furnace block is placed
    let furnaceBlock = bot.findBlock({
      matching: mcData.blocksByName.furnace.id,
      maxDistance: 32
    });
    if (!furnaceBlock) {
      const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id);
      if (!furnaceItem) {
        await bot.chat('❌ No furnace item available to place.');
        return;
      }
      const placePos = bot.entity.position.offset(1, 0, 0);
      await bot.chat('Placing furnace...');
      await placeItem(bot, 'furnace', placePos);
      await bot.waitForTicks(5);
      furnaceBlock = bot.findBlock({
        matching: mcData.blocksByName.furnace.id,
        maxDistance: 32
      });
      if (!furnaceBlock) {
        await bot.chat('❌ Failed to place furnace.');
        return;
      }
    }

    // Smelt the required amount (each smelt consumes 1 coal)
    const coalAvailable = countItem('coal');
    if (coalAvailable < missing) {
      await bot.chat('❌ Not enough coal to smelt the required iron.');
      return;
    }
    await smeltItem(bot, 'raw_iron', 'coal', missing);
    await bot.chat(`Smelted ${missing} iron ingot(s).`);
  }

  // ---------- 2. Ensure enough sticks ----------
  const neededSticks = 2;
  if (countItem('stick') < neededSticks) {
    const missingSticks = neededSticks - countItem('stick');
    await bot.chat(`Need ${missingSticks} more stick(s). Crafting sticks...`);
    // Sticks are crafted from oak planks; ensure we have planks
    if (countItem('oak_planks') < 1) {
      // Ensure we have at least one oak log to turn into planks
      if (countItem('oak_log') < 1) {
        await bot.chat('❌ No oak log available to make planks for sticks.');
        return;
      }
      await bot.chat('Crafting oak planks from oak log...');
      await craftItem(bot, 'oak_planks', 1); // 1 recipe = 4 planks
    }
    await craftItem(bot, 'stick', 1); // 1 recipe = 4 sticks
    await bot.chat('Sticks crafted.');
  }

  // ---------- 3. Ensure a crafting table block is placed ----------
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!tableBlock) {
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      await bot.chat('❌ No crafting table item in inventory.');
      return;
    }
    const placePos = bot.entity.position.offset(1, 0, 0);
    await bot.chat('Placing crafting table...');
    await placeItem(bot, 'crafting_table', placePos);
    await bot.waitForTicks(5);
    tableBlock = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32
    });
    if (!tableBlock) {
      await bot.chat('❌ Failed to place crafting table.');
      return;
    }
  }

  // ---------- 4. Craft the iron pickaxe ----------
  await bot.chat('Crafting iron pickaxe...');
  await craftItem(bot, 'iron_pickaxe', 1);
  await bot.waitForTicks(5);

  // ---------- 5. Verify ----------
  if (countItem('iron_pickaxe') >= 1) {
    await bot.chat('✅ Successfully crafted an iron pickaxe!');
  } else {
    await bot.chat('❌ Crafting failed – iron pickaxe not found in inventory.');
  }
}