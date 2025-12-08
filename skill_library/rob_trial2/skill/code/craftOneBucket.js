// main function to craft one bucket
async function craftOneBucket(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // helper: count items in inventory by name
  const countItem = name => {
    const itemInfo = mcData.itemsByName[name];
    if (!itemInfo) return 0;
    const stack = bot.inventory.findInventoryItem(itemInfo.id);
    return stack ? stack.count : 0;
  };

  // 1. Ensure we have at least 3 iron ingots
  const neededIron = 3;
  let ironCount = countItem('iron_ingot');
  if (ironCount < neededIron) {
    const missing = neededIron - ironCount;
    await bot.chat(`I need ${missing} more iron ingot(s), smelting raw iron...`);
    // make sure we have enough raw iron and coal
    if (countItem('raw_iron') < missing) {
      await bot.chat('❌ Not enough raw iron to smelt the required ingots.');
      return;
    }
    if (countItem('coal') < missing) {
      await bot.chat('❌ Not enough coal to smelt the required ingots.');
      return;
    }
    await smeltItem(bot, 'raw_iron', 'coal', missing);
    await bot.waitForTicks(5);
    ironCount = countItem('iron_ingot');
  }

  // 2. Ensure a crafting table block is placed nearby
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!tableBlock) {
    // we need to place one
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      await bot.chat('❌ I have no crafting table item to place.');
      return;
    }
    // pick a free air block next to the bot
    const placePos = bot.entity.position.offset(1, 0, 0);
    await bot.chat('Placing a crafting table...');
    await placeItem(bot, 'crafting_table', placePos);
    await bot.waitForTicks(5);
    tableBlock = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32
    });
    if (!tableBlock) {
      await bot.chat('❌ Failed to place the crafting table.');
      return;
    }
  }

  // 3. Craft the bucket
  await bot.chat('Crafting a bucket...');
  await craftItem(bot, 'bucket', 1);
  await bot.waitForTicks(5);

  // 4. Verify the bucket is now in inventory
  if (countItem('bucket') >= 1) {
    await bot.chat('✅ Successfully crafted a bucket!');
  } else {
    await bot.chat('❌ Crafting failed – bucket not found in inventory.');
  }
}