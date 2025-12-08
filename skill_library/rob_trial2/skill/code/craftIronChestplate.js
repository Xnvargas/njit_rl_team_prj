// main function to craft one iron chestplate
async function craftIronChestplate(bot) {
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

  // ---------- 1. Ensure we have 5 iron ingots ----------
  const neededIron = 5;
  let ironCount = countItem('iron_ingot');
  if (ironCount < neededIron) {
    const missing = neededIron - ironCount;
    // try to smelt raw iron (requires coal)
    const rawIron = countItem('raw_iron');
    const coal = countItem('coal');
    const smeltable = Math.min(missing, rawIron, coal);
    if (smeltable > 0) {
      await bot.chat(`Smelting ${smeltable} raw iron into iron ingots...`);
      await smeltItem(bot, 'raw_iron', 'coal', smeltable);
      await bot.waitForTicks(5);
      ironCount = countItem('iron_ingot');
    }
    if (ironCount < neededIron) {
      await bot.chat('❌ Not enough iron ingots to craft a chestplate.');
      return;
    }
  }

  // ---------- 2. Ensure a crafting table is placed ----------
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!tableBlock) {
    // need to place one from inventory
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      await bot.chat('❌ No crafting table item in inventory to place.');
      return;
    }

    // find a nearby air block to place the table
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
        if (tableBlock) placed = true;
        break;
      }
    }
    if (!placed || !tableBlock) {
      await bot.chat('❌ Failed to place a crafting table.');
      return;
    }
  }

  // ---------- 3. Craft the iron chestplate ----------
  await bot.chat('Crafting an iron chestplate...');
  await craftItem(bot, 'iron_chestplate', 1);
  await bot.waitForTicks(5);

  // ---------- 4. Verify ----------
  const chestplateCount = countItem('iron_chestplate');
  if (chestplateCount >= 1) {
    await bot.chat(`✅ Successfully crafted ${chestplateCount} iron chestplate(s)!`);
  } else {
    await bot.chat('❌ Crafting failed – iron chestplate not found in inventory.');
  }
}