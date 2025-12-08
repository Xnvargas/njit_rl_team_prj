// main function to craft one lightning rod
async function craftLightningRod(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helper to count items ----------
  const countItem = name => {
    const info = mcData.itemsByName[name];
    if (!info) return 0;
    const stack = bot.inventory.findInventoryItem(info.id);
    return stack ? stack.count : 0;
  };

  // ---------- 1. Ensure we have at least 3 copper ingots ----------
  const neededCopper = 3;
  let copper = countItem('copper_ingot');
  if (copper < neededCopper) {
    const missing = neededCopper - copper;

    // Check we have enough raw copper and coal
    const rawCopper = countItem('raw_copper');
    const coal = countItem('coal');
    const canSmelt = Math.min(missing, rawCopper, coal);
    if (canSmelt <= 0) {
      await bot.chat('❌ Not enough raw copper or coal to obtain copper ingots.');
      return;
    }
    await bot.chat(`Smelting ${canSmelt} raw copper into copper ingots...`);
    await smeltItem(bot, 'raw_copper', 'coal', canSmelt);
    await bot.waitForTicks(5);
    copper = countItem('copper_ingot');
    if (copper < neededCopper) {
      await bot.chat('❌ Still not enough copper ingots after smelting.');
      return;
    }
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

    // Find a free air block next to the bot
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

  // ---------- 3. Craft the lightning rod ----------
  await bot.chat('Crafting a lightning rod...');
  await craftItem(bot, 'lightning_rod', 1);
  await bot.waitForTicks(5);

  // ---------- 4. Verify ----------
  const lightningRodCount = countItem('lightning_rod');
  if (lightningRodCount >= 1) {
    await bot.chat(`✅ Successfully crafted ${lightningRodCount} lightning rod(s)!`);
  } else {
    await bot.chat('❌ Crafting failed – no lightning rod in inventory.');
  }
}