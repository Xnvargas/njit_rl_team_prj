// ------------------------------------------------------------
// Helper functions (only those not already provided above)
// ------------------------------------------------------------
async function randomDirection(Vec3) {
  const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
  return dirs[Math.floor(Math.random() * dirs.length)];
}

/**
 * Count how many items of a given name are in the bot's inventory.
 */

/**
 * Count how many items of a given name are in the bot's inventory.
 */
function countItem(bot, mcData, name) {
  const id = mcData.itemsByName[name]?.id;
  return id ? bot.inventory.count(id) : 0;
}

/**
 * Place a block (crafting table or furnace) if none exists within 5 blocks.
 */

/**
 * Place a block (crafting table or furnace) if none exists within 5 blocks.
 */
async function ensureBlockPlaced(bot, mcData, itemName, blockId) {
  const existing = bot.findBlock({
    matching: blockId,
    maxDistance: 5
  });
  if (existing) return existing;
  const item = bot.inventory.findInventoryItem(mcData.itemsByName[itemName].id);
  if (!item) {
    bot.chat(`I don't have a ${itemName} to place.`);
    return null;
  }
  const placePos = bot.entity.position.offset(1, 0, 0);
  await placeItem(bot, itemName, placePos);
  return bot.blockAt(placePos);
}

/**
 * Move at least one coal stack to a slot >= startSlot (default 3) so smeltItem can find it.
 */

/**
 * Move at least one coal stack to a slot >= startSlot (default 3) so smeltItem can find it.
 */
async function ensureFuelInSlotRange(bot, mcData, fuelName = 'coal', startSlot = 3) {
  const fuelId = mcData.itemsByName[fuelName].id;
  const fuelItem = bot.inventory.findInventoryItem(fuelId);
  if (!fuelItem) {
    bot.chat(`I have no ${fuelName} for fuel.`);
    return false;
  }
  // If the coal is already in the acceptable range, we are done.
  if (fuelItem.slot >= startSlot) return true;

  // Find an empty slot in the allowed range.
  const emptySlot = bot.inventory.firstEmptySlot(startSlot, 39);
  if (emptySlot === null) {
    bot.chat('No free inventory slot to move fuel into.');
    return false;
  }
  // Transfer the whole stack (or at least one) to the empty slot.
  await bot.transfer(fuelItem.slot, emptySlot, fuelItem.count);
  bot.chat(`Moved ${fuelName} to slot ${emptySlot} for smelting.`);
  return true;
}

// ------------------------------------------------------------
// Main function
// ------------------------------------------------------------

// ------------------------------------------------------------
// Main function
// ------------------------------------------------------------
async function mineFiveCopperOre(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // 1. Ensure a crafting table (required for pickaxe crafting)
  const craftingTable = await ensureBlockPlaced(bot, mcData, 'crafting_table', mcData.blocksByName.crafting_table.id);
  if (!craftingTable) {
    bot.chat('Cannot continue without a crafting table.');
    return;
  }

  // 2. Ensure we have an iron pickaxe
  if (!bot.inventory.findInventoryItem(mcData.itemsByName.iron_pickaxe.id)) {
    // Need iron ingots and sticks
    if (countItem(bot, mcData, 'iron_ingot') < 3) {
      bot.chat('Not enough iron ingots to craft an iron pickaxe.');
      return;
    }
    if (countItem(bot, mcData, 'stick') < 2) {
      bot.chat('Not enough sticks to craft an iron pickaxe.');
      return;
    }
    bot.chat('Crafting iron pickaxe...');
    await craftItem(bot, 'iron_pickaxe', 1);
  }

  // 3. Equip the iron pickaxe
  const ironPick = bot.inventory.findInventoryItem(mcData.itemsByName.iron_pickaxe.id);
  if (ironPick) await bot.equip(ironPick, 'hand');

  // 4. Ensure a furnace for smelting
  const furnace = await ensureBlockPlaced(bot, mcData, 'furnace', mcData.blocksByName.furnace.id);
  if (!furnace) {
    bot.chat('Cannot continue without a furnace.');
    return;
  }

  // 5. Make sure we have fuel in the correct slot range
  const fuelReady = await ensureFuelInSlotRange(bot, mcData, 'coal', 3);
  if (!fuelReady) return;

  // 6. Locate copper ore blocks (need 5)
  const copperId = mcData.blocksByName.copper_ore.id;
  let copperBlocks = bot.findBlocks({
    matching: copperId,
    maxDistance: 32,
    count: 5
  });
  if (copperBlocks.length < 5) {
    bot.chat('Not enough copper ore nearby, exploring...');
    const needed = 5 - copperBlocks.length;
    const dir = await randomDirection(Vec3);
    const found = await exploreUntil(bot, dir, 60, () => {
      const foundBlocks = bot.findBlocks({
        matching: copperId,
        maxDistance: 32,
        count: needed
      });
      return foundBlocks.length >= needed ? foundBlocks : null;
    });
    if (found) copperBlocks = found;
  }
  if (copperBlocks.length < 5) {
    bot.chat('Could not locate 5 copper ore blocks.');
    return;
  }

  // 7. Mine exactly 5 copper ore blocks
  bot.chat(`Mining ${copperBlocks.length} copper ore blocks...`);
  await mineBlock(bot, 'copper_ore', 5);

  // 8. Smelt all raw copper we just obtained
  const rawCopperCount = countItem(bot, mcData, 'raw_copper');
  if (rawCopperCount === 0) {
    bot.chat('No raw copper was obtained after mining.');
    return;
  }

  // Ensure fuel is still available (smeltItem will consume it)
  if (countItem(bot, mcData, 'coal') === 0) {
    bot.chat('Ran out of coal before smelting.');
    return;
  }
  bot.chat(`Smelting ${rawCopperCount} raw copper using coal...`);
  await smeltItem(bot, 'raw_copper', 'coal', rawCopperCount);

  // 9. Verify we have at least 5 copper ingots
  const copperIngotCount = countItem(bot, mcData, 'copper_ingot');
  if (copperIngotCount >= 5) {
    bot.chat(`Success! I now have ${copperIngotCount} copper ingots.`);
  } else {
    bot.chat(`Failed to obtain enough copper ingots. I have only ${copperIngotCount}.`);
  }
}