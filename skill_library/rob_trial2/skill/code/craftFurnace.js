// main function to craft a furnace
async function craftFurnace(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  const countItem = name => {
    const itemInfo = mcData.itemsByName[name];
    if (!itemInfo) return 0;
    const stack = bot.inventory.findInventoryItem(itemInfo.id);
    return stack ? stack.count : 0;
  };

  // ---------- 1. Ensure a crafting table block is placed ----------
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!tableBlock) {
    // need to place one
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      await bot.chat('❌ I have no crafting table item to place.');
      return;
    }

    // pick a nearby air block to place the table
    const placePos = bot.entity.position.offset(1, 0, 0);
    await bot.chat('Placing a crafting table...');
    await placeItem(bot, 'crafting_table', placePos);
    await bot.waitForTicks(5); // give time for the block to appear

    // re‑check
    tableBlock = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32
    });
    if (!tableBlock) {
      await bot.chat('❌ Failed to place the crafting table.');
      return;
    }
  }

  // ---------- 2. Ensure enough cobblestone ----------
  const neededCobble = 8;
  if (countItem('cobblestone') < neededCobble) {
    const missing = neededCobble - countItem('cobblestone');
    await bot.chat(`Need ${missing} more cobblestone, mining now...`);
    await mineBlock(bot, 'cobblestone', missing);
    await bot.waitForTicks(5);
  }

  // ---------- 3. Craft the furnace ----------
  await bot.chat('Crafting a furnace...');
  await craftItem(bot, 'furnace', 1);
  await bot.waitForTicks(5);

  // ---------- 4. Verify ----------
  if (countItem('furnace') >= 1) {
    await bot.chat('✅ Successfully crafted a furnace!');
  } else {
    await bot.chat('❌ Crafting failed – furnace not found in inventory.');
  }
}