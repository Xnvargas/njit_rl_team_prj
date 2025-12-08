// main function to craft a golden apple
async function craftGoldenApple(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  const countItem = name => {
    const info = mcData.itemsByName[name];
    if (!info) return 0;
    const stack = bot.inventory.findInventoryItem(info.id);
    return stack ? stack.count : 0;
  };

  // ---------- 1. Ensure required materials ----------
  // Need 8 gold ingots and 1 apple
  const needGold = 8;
  const needApple = 1;

  // Gold ingots
  let gold = countItem('gold_ingot');
  if (gold < needGold) {
    const missingGold = needGold - gold;

    // Try to smelt raw gold first
    const rawGold = countItem('raw_gold');
    const coal = countItem('coal');
    const smeltCount = Math.min(missingGold, rawGold, coal);
    if (smeltCount > 0) {
      await bot.chat(`Smelting ${smeltCount} raw gold into gold ingots...`);
      await smeltItem(bot, 'raw_gold', 'coal', smeltCount);
      await bot.waitForTicks(5);
      gold = countItem('gold_ingot');
    }

    // If still not enough, mine gold ore
    if (gold < needGold) {
      const stillMissing = needGold - gold;
      await bot.chat(`Mining ${stillMissing} gold ore to get more gold ingots...`);
      await mineBlock(bot, 'gold_ore', stillMissing);
      await bot.waitForTicks(5);
      // Smelt the newly mined ore (requires coal)
      const newRawGold = countItem('raw_gold');
      const newCoal = countItem('coal');
      const toSmelt = Math.min(stillMissing, newRawGold, newCoal);
      if (toSmelt > 0) {
        await bot.chat(`Smelting mined raw gold (${toSmelt})...`);
        await smeltItem(bot, 'raw_gold', 'coal', toSmelt);
        await bot.waitForTicks(5);
        gold = countItem('gold_ingot');
      }
    }
  }

  // Apple
  const apple = countItem('apple');
  if (apple < needApple) {
    await bot.chat('❌ I do not have an apple to craft a golden apple.');
    return;
  }

  // ---------- 2. Ensure a crafting table is placed ----------
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
        placed = true;
        break;
      }
    }
    if (!placed || !tableBlock) {
      await bot.chat('❌ Failed to place a crafting table.');
      return;
    }
  }

  // ---------- 3. Craft the golden apple ----------
  await bot.chat('Crafting a golden apple...');
  await craftItem(bot, 'golden_apple', 1);
  await bot.waitForTicks(5);

  // ---------- 4. Verify ----------
  const goldenAppleCount = countItem('golden_apple');
  if (goldenAppleCount >= 1) {
    await bot.chat(`✅ Successfully crafted ${goldenAppleCount} golden apple(s)!`);
  } else {
    await bot.chat('❌ Crafting failed – no golden apple in inventory.');
  }
}