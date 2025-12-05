// ------------------------------------------------------------
// Helper functions (reuse when possible)
// ------------------------------------------------------------
async function countItem(bot, mcData, name) {
  const id = mcData.itemsByName[name]?.id;
  return id ? bot.inventory.count(id) : 0;
}

function randomHorizontalDirection(Vec3) {
  const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
  return dirs[Math.floor(Math.random() * dirs.length)];
}

// ------------------------------------------------------------
// 1) Ensure a furnace exists (place one if necessary)
// ------------------------------------------------------------

// ------------------------------------------------------------
// 1) Ensure a furnace exists (place one if necessary)
// ------------------------------------------------------------
async function ensureFurnace(bot, mcData, Vec3) {
  // look for an existing furnace
  let furnace = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 32
  });
  if (furnace) {
    bot.chat('Found a furnace nearby.');
    return furnace;
  }

  // need to place a furnace
  const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id);
  if (!furnaceItem) {
    bot.chat('I have no furnace item to place.');
    return null;
  }

  // try adjacent positions for a valid placement spot
  const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
  let placePos = null;
  for (const off of offsets) {
    const cand = bot.entity.position.offset(off.x, off.y, off.z);
    const target = bot.blockAt(cand);
    const below = bot.blockAt(cand.offset(0, -1, 0));
    if (target && target.name === 'air' && below && below.name !== 'air') {
      placePos = cand;
      break;
    }
  }

  // if not found locally, explore a bit
  if (!placePos) {
    await exploreUntil(bot, randomHorizontalDirection(Vec3), 60, () => {
      for (const off of offsets) {
        const cand = bot.entity.position.offset(off.x, off.y, off.z);
        const target = bot.blockAt(cand);
        const below = bot.blockAt(cand.offset(0, -1, 0));
        if (target && target.name === 'air' && below && below.name !== 'air') {
          placePos = cand;
          return true;
        }
      }
      return false;
    });
  }
  if (!placePos) {
    bot.chat('Could not find a suitable spot to place a furnace.');
    return null;
  }
  bot.chat(`Placing furnace at ${placePos}`);
  await placeItem(bot, 'furnace', placePos);
  // give the world a tick so the block state updates
  await bot.waitForTicks(1);
  furnace = bot.blockAt(placePos);
  if (!furnace || furnace.name !== 'furnace') {
    bot.chat('Failed to place the furnace.');
    return null;
  }
  bot.chat('Furnace placed successfully.');
  return furnace;
}

// ------------------------------------------------------------
// 2) Ensure we have at least one fuel item
// ------------------------------------------------------------

// ------------------------------------------------------------
// 2) Ensure we have at least one fuel item
// ------------------------------------------------------------
async function ensureFuel(bot, mcData) {
  const fuelPriority = ['coal', 'oak_planks', 'stick'];
  // already have fuel?
  if (fuelPriority.some(f => bot.inventory.findInventoryItem(mcData.itemsByName[f].id))) {
    return true;
  }

  // try to craft planks from logs
  if ((await countItem(bot, mcData, 'oak_log')) > 0) {
    bot.chat('Crafting oak planks from oak logs for fuel.');
    await craftItem(bot, 'oak_planks', 4); // 1 log → 4 planks
    // after crafting we should have planks
    if (fuelPriority.some(f => bot.inventory.findInventoryItem(mcData.itemsByName[f].id))) {
      return true;
    }
  }
  bot.chat('No fuel available and cannot craft more.');
  return false;
}

// ------------------------------------------------------------
// 3) Obtain enough raw porkchops
// ------------------------------------------------------------

// ------------------------------------------------------------
// 3) Obtain enough raw porkchops
// ------------------------------------------------------------
async function obtainRawPorkchops(bot, mcData, Vec3, target) {
  while ((await countItem(bot, mcData, 'porkchop')) < target) {
    // find a pig nearby
    let pig = bot.nearestEntity(e => e.name === 'pig' && e.position.distanceTo(bot.entity.position) < 32);
    if (!pig) {
      bot.chat('No pig nearby, exploring...');
      pig = await exploreUntil(bot, randomHorizontalDirection(Vec3), 60, () => {
        const p = bot.nearestEntity(e => e.name === 'pig' && e.position.distanceTo(bot.entity.position) < 32);
        return p || null;
      });
    }
    if (!pig) {
      bot.chat('Could not find any pig to kill.');
      return false;
    }
    bot.chat(`Found pig at ${pig.position}, attacking...`);
    await killMob(bot, 'pig', 300);
    // give a short pause for drops to be picked up
    await bot.waitForTicks(20);
  }
  return true;
}

// ------------------------------------------------------------
// Main function: cook three porkchops
// ------------------------------------------------------------

// ------------------------------------------------------------
// Main function: cook three porkchops
// ------------------------------------------------------------
async function cookThreePorkchops(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // 1) Make sure a furnace is available
  const furnace = await ensureFurnace(bot, mcData, Vec3);
  if (!furnace) return; // cannot continue without a furnace

  // 2) Make sure we have fuel
  if (!(await ensureFuel(bot, mcData))) return;

  // 3) Ensure we have at least 3 raw porkchops
  if (!(await obtainRawPorkchops(bot, mcData, Vec3, 3))) return;

  // 4) Determine how many cooked porkchops are still needed
  const cookedNow = await countItem(bot, mcData, 'cooked_porkchop');
  const needed = Math.max(0, 3 - cookedNow);
  if (needed === 0) {
    bot.chat('Already have three cooked porkchops.');
    return;
  }
  bot.chat(`Need to cook ${needed} porkchop(s).`);

  // 5) Smelt the required amount, checking fuel each iteration
  const fuelPriority = ['coal', 'oak_planks', 'stick'];
  for (let i = 0; i < needed; i++) {
    // re‑check fuel before each smelt
    let fuelName = null;
    for (const f of fuelPriority) {
      if ((await countItem(bot, mcData, f)) > 0) {
        fuelName = f;
        break;
      }
    }
    if (!fuelName) {
      // try to craft more planks if possible
      if (!(await ensureFuel(bot, mcData))) {
        bot.chat('Ran out of fuel while cooking.');
        return;
      }
      // re‑determine fuel after crafting
      for (const f of fuelPriority) {
        if ((await countItem(bot, mcData, f)) > 0) {
          fuelName = f;
          break;
        }
      }
    }
    bot.chat(`Smelting porkchop ${i + 1}/${needed} using ${fuelName}.`);
    await smeltItem(bot, 'porkchop', fuelName, 1);
  }

  // 6) Final verification
  if ((await countItem(bot, mcData, 'cooked_porkchop')) >= 3) {
    bot.chat('Successfully cooked three porkchops!');
  } else {
    bot.chat('Failed to obtain three cooked porkchops.');
  }
}