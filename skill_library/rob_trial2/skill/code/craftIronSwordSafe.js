// main function to craft one iron sword safely
async function craftIronSwordSafe(bot) {
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

  // 1. Ensure we have at least 2 iron ingots
  const neededIron = 2;
  let ironCount = countItem('iron_ingot');
  if (ironCount < neededIron) {
    const missing = neededIron - ironCount;
    const rawIron = countItem('raw_iron');
    const coal = countItem('coal');
    const smeltable = Math.min(missing, rawIron, coal);
    if (smeltable > 0) {
      await bot.chat(`Smelting ${smeltable} raw iron into ingots...`);
      await smeltItem(bot, 'raw_iron', 'coal', smeltable);
      await bot.waitForTicks(5);
      ironCount = countItem('iron_ingot');
    }
    if (ironCount < neededIron) {
      await bot.chat('❌ Not enough iron ingots after smelting.');
      return;
    }
  }

  // 2. Ensure we have at least 1 stick
  if (countItem('stick') < 1) {
    await bot.chat('❌ Not enough sticks to craft an iron sword.');
    return;
  }

  // 3. Locate or place a crafting table
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

    // candidate offsets around the bot (randomized order each attempt)
    const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    // shuffle offsets
    for (let i = offsets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
    }
    let placed = false;
    for (const off of offsets) {
      const targetPos = bot.entity.position.offset(off.x, off.y, off.z);
      const targetBlock = bot.blockAt(targetPos);
      const belowBlock = bot.blockAt(targetPos.offset(0, -1, 0));

      // target must be air; block below must be solid (not air, water, lava)
      if (targetBlock && targetBlock.name === 'air' && belowBlock && !['air', 'water', 'lava'].includes(belowBlock.name)) {
        await bot.chat(`Placing crafting table at ${targetPos.toString().replace('Vec3', '')}...`);
        await placeItem(bot, 'crafting_table', targetPos);
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
      await bot.chat('❌ Failed to find a suitable spot to place a crafting table.');
      return;
    }
  }

  // 4. Craft the iron sword
  await bot.chat('Crafting an iron sword...');
  await craftItem(bot, 'iron_sword', 1);
  await bot.waitForTicks(5);

  // 5. Verify result
  if (countItem('iron_sword') >= 1) {
    await bot.chat('✅ Successfully crafted an iron sword!');
  } else {
    await bot.chat('❌ Crafting failed – iron sword not found in inventory.');
  }
}