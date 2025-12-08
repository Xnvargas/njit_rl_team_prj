// main function to craft one iron boot pair
async function craftOneIronBoots(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // helper: count how many items of a given name are in the inventory
  const countItem = name => {
    const itemInfo = mcData.itemsByName[name];
    if (!itemInfo) return 0;
    const stack = bot.inventory.findInventoryItem(itemInfo.id);
    return stack ? stack.count : 0;
  };

  // 1. Ensure we have enough iron ingots (4 needed)
  if (countItem('iron_ingot') < 4) {
    await bot.chat('❌ Not enough iron ingots to craft boots (need 4).');
    return;
  }

  // 2. Find a placed crafting table nearby
  let craftingTableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });

  // 3. If none found, place one from inventory
  if (!craftingTableBlock) {
    await bot.chat('Placing a crafting table...');
    // find a free spot next to the bot (offset by 1 block on X axis)
    const placePos = bot.entity.position.offset(1, 0, 0);
    await placeItem(bot, 'crafting_table', placePos);
    // after placing, locate the newly placed table
    craftingTableBlock = bot.blockAt(placePos);
    if (!craftingTableBlock || craftingTableBlock.name !== 'crafting_table') {
      await bot.chat('❌ Failed to place a crafting table.');
      return;
    }
  }

  // 4. Craft the iron boots
  await bot.chat('Crafting iron boots...');
  try {
    await craftItem(bot, 'iron_boots', 1);
  } catch (err) {
    await bot.chat(`❌ Crafting failed: ${err.message}`);
    return;
  }

  // 5. Verify the boots are now in inventory
  if (countItem('iron_boots') >= 1) {
    await bot.chat('✅ Successfully crafted 1 iron boot pair!');
  } else {
    await bot.chat('❌ Crafting completed but boots not found in inventory.');
  }
}