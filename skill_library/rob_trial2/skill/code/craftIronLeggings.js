// Main function to craft iron leggings
async function craftIronLeggings(bot) {
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

  // 1. Ensure we have enough iron ingots (7 needed)
  const neededIron = 7;
  let ironCount = countItem('iron_ingot');
  if (ironCount < neededIron) {
    const missing = neededIron - ironCount;
    await bot.chat(`I need ${missing} more iron ingots, trying to smelt raw iron...`);
    // smelt as many as possible from raw_iron using coal
    const rawIron = countItem('raw_iron');
    const coal = countItem('coal');
    const toSmelt = Math.min(missing, rawIron, coal);
    if (toSmelt > 0) {
      await smeltItem(bot, 'raw_iron', 'coal', toSmelt);
      await bot.waitForTicks(5);
      ironCount = countItem('iron_ingot');
    }
    if (ironCount < neededIron) {
      await bot.chat('❌ Not enough iron ingots after smelting. Cannot craft leggings.');
      return;
    }
  }

  // 2. Ensure a crafting table block is placed nearby
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!tableBlock) {
    // Need to place one from inventory
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      await bot.chat('❌ No crafting table item in inventory to place.');
      return;
    }

    // Find a nearby air block to place the table
    const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    let placed = false;
    for (const off of offsets) {
      const pos = bot.entity.position.offset(off.x, off.y, off.z);
      const block = bot.blockAt(pos);
      if (block && block.name === 'air') {
        await bot.chat(`Placing crafting table at ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}...`);
        await placeItem(bot, 'crafting_table', pos);
        await bot.waitForTicks(5);
        tableBlock = bot.findBlock({
          matching: mcData.blocksByName.crafting_table.id,
          maxDistance: 32
        });
        if (tableBlock) {
          placed = true;
          break;
        }
      }
    }
    if (!placed) {
      await bot.chat('❌ Failed to place a crafting table nearby.');
      return;
    }
  }

  // 3. Craft the iron leggings
  await bot.chat('Crafting iron leggings...');
  await craftItem(bot, 'iron_leggings', 1);
  await bot.waitForTicks(5);

  // 4. Verify result
  const leggingsCount = countItem('iron_leggings');
  if (leggingsCount >= 1) {
    await bot.chat(`✅ Successfully crafted ${leggingsCount} iron leggings!`);
  } else {
    await bot.chat('❌ Crafting failed – iron leggings not found in inventory.');
  }
}