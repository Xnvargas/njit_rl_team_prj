// main function: smelt 10 raw iron using available furnace and fuel
async function smeltTenRawIron(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');
  const {
    GoalPlaceBlock,
    GoalLookAtBlock
  } = require('mineflayer-pathfinder').goals;

  // ----- helper to count items in inventory -----
  const countItem = name => {
    const info = mcData.itemsByName[name];
    if (!info) return 0;
    const stack = bot.inventory.findInventoryItem(info.id);
    return stack ? stack.count : 0;
  };

  // ----- 1. Verify we have enough raw iron -----
  const rawIronCount = countItem('raw_iron');
  if (rawIronCount < 10) {
    await bot.chat('❌ I need at least 10 raw iron to smelt, but I only have ' + rawIronCount + '.');
    return;
  }

  // ----- 2. Ensure a furnace block is placed -----
  let furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 32
  });
  if (!furnaceBlock) {
    // we have a furnace item in inventory?
    const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id);
    if (!furnaceItem) {
      await bot.chat('❌ No furnace block placed and I have no furnace item.');
      return;
    }
    // place the furnace at a free adjacent air block
    const placePos = bot.entity.position.offset(1, 0, 0);
    await bot.chat('Placing a furnace...');
    await placeItem(bot, 'furnace', placePos);
    await bot.waitForTicks(5); // give the world a moment to update
    furnaceBlock = bot.findBlock({
      matching: mcData.blocksByName.furnace.id,
      maxDistance: 32
    });
    if (!furnaceBlock) {
      await bot.chat('❌ Failed to place the furnace.');
      return;
    }
  } else {
    await bot.chat('✅ Furnace already placed.');
  }

  // ----- 3. Determine fuel distribution -----
  const fuelInfo = [{
    name: 'coal',
    per: 1,
    count: countItem('coal')
  }, {
    name: 'oak_log',
    per: 10,
    count: countItem('oak_log')
  }, {
    name: 'oak_planks',
    per: 1,
    count: countItem('oak_planks')
  }];
  const neededSmelts = 10;
  let remaining = neededSmelts;
  const fuelPlan = [];
  for (const fuel of fuelInfo) {
    if (remaining <= 0) break;
    if (fuel.count <= 0) continue;
    const maxSmeltsWithThisFuel = fuel.count * fuel.per;
    const smeltsNow = Math.min(remaining, maxSmeltsWithThisFuel);
    // how many fuel items are needed for those smelts?
    const fuelItemsNeeded = Math.ceil(smeltsNow / fuel.per);
    fuelPlan.push({
      fuelName: fuel.name,
      amount: fuelItemsNeeded
    });
    remaining -= smeltsNow;
  }
  if (remaining > 0) {
    await bot.chat('❌ Not enough fuel to smelt 10 raw iron. I need ' + remaining + ' more smelt operations.');
    return;
  }

  // ----- 4. Perform smelting using the plan -----
  await bot.chat('Starting smelting of 10 raw iron...');
  for (const step of fuelPlan) {
    await bot.chat(`Smelting ${step.amount * (step.fuelName === 'oak_log' ? 10 : 1)} raw iron using ${step.amount} ${step.fuelName}(s)...`);
    await smeltItem(bot, 'raw_iron', step.fuelName, step.amount);
  }

  // ----- 5. Verify result -----
  const ironIngotCount = countItem('iron_ingot');
  if (ironIngotCount >= 10) {
    await bot.chat(`✅ Successfully smelted at least 10 iron ingots! I now have ${ironIngotCount} iron ingot(s).`);
  } else {
    await bot.chat(`❌ Smelting finished but I only have ${ironIngotCount} iron ingot(s).`);
  }
}