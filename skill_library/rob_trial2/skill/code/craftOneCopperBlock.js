// main function: craft one copper block (robust placement of crafting table)
async function craftOneCopperBlock(bot) {
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

  // Find a solid block (not air) within 32 blocks
  const findSolidBlock = () => {
    return bot.findBlock({
      matching: b => b && b.boundingBox === 'block',
      maxDistance: 32
    });
  };

  // Try to place a block of given name next to a solid reference block
  const tryPlaceBlock = async itemName => {
    const item = bot.inventory.findInventoryItem(mcData.itemsByName[itemName].id);
    if (!item) {
      await bot.chat(`❌ No ${itemName} item in inventory.`);
      return false;
    }
    const reference = findSolidBlock();
    if (!reference) {
      await bot.chat('❌ No solid block nearby to use as reference for placement.');
      return false;
    }

    // directions to test for a free air spot around the reference block
    const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(0, 1, 0),
    // above
    new Vec3(0, -1, 0) // below (rarely useful)
    ];
    for (const off of offsets) {
      const targetPos = reference.position.offset(off.x, off.y, off.z);
      const targetBlock = bot.blockAt(targetPos);
      if (targetBlock && targetBlock.name === 'air') {
        await bot.chat(`Placing ${itemName} at ${targetPos}`);
        await placeItem(bot, itemName, targetPos);
        await bot.waitForTicks(5);
        // verify placement
        const placed = bot.blockAt(targetPos);
        if (placed && placed.name === itemName) return true;
      }
    }
    await bot.chat(`❌ Could not find a free spot next to a solid block to place ${itemName}.`);
    return false;
  };

  // ---------- 1. Ensure enough copper ingots ----------
  const requiredIngots = 9;
  let copperIngotCount = countItem('copper_ingot');
  if (copperIngotCount < requiredIngots) {
    const need = requiredIngots - copperIngotCount;
    const rawCount = countItem('raw_copper');
    if (rawCount < need) {
      await bot.chat(`❌ Not enough raw copper to smelt (${rawCount}/${need}).`);
      return;
    }

    // Ensure furnace exists (place if necessary)
    let furnaceBlock = bot.findBlock({
      matching: mcData.blocksByName.furnace.id,
      maxDistance: 32
    });
    if (!furnaceBlock) {
      const placed = await tryPlaceBlock('furnace');
      if (!placed) return;
      furnaceBlock = bot.findBlock({
        matching: mcData.blocksByName.furnace.id,
        maxDistance: 32
      });
      if (!furnaceBlock) {
        await bot.chat('❌ Failed to place furnace.');
        return;
      }
    }
    await bot.chat(`Smelting ${need} raw copper into ingots...`);
    await smeltItem(bot, 'raw_copper', 'coal', need);
    copperIngotCount = countItem('copper_ingot');
  }

  // ---------- 2. Ensure a crafting table ----------
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!tableBlock) {
    const placed = await tryPlaceBlock('crafting_table');
    if (!placed) return;
    tableBlock = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32
    });
    if (!tableBlock) {
      await bot.chat('❌ Failed to place crafting table after attempt.');
      return;
    }
  }

  // ---------- 3. Craft the copper block ----------
  await bot.chat('Crafting 1 copper block...');
  await craftItem(bot, 'copper_block', 1);
  await bot.waitForTicks(5);

  // ---------- 4. Verify ----------
  if (countItem('copper_block') >= 1) {
    await bot.chat('✅ Successfully crafted a copper block!');
  } else {
    await bot.chat('❌ Crafting failed – no copper block in inventory.');
  }
}