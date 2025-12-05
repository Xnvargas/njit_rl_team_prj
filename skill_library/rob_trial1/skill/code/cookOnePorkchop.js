// main function to cook a single porkchop robustly
async function cookOnePorkchop(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // pick a random horizontal direction (y = 0)
  function randomHorizontalDirection() {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  // ---------- 1. raw porkchop ----------
  if (countItem('porkchop') < 1) {
    bot.chat('I have no raw porkchop to cook.');
    return;
  }

  // ---------- 2. choose fuel ----------
  let fuelName = null;
  if (countItem('oak_planks') > 0) fuelName = 'oak_planks';else if (countItem('stick') > 0) fuelName = 'stick';else {
    bot.chat('I have no fuel (oak planks or sticks) to smelt the porkchop.');
    return;
  }

  // ---------- 3. find or place a furnace ----------
  let furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 32
  });
  if (furnaceBlock) {
    bot.chat('Found an existing furnace nearby.');
  } else {
    // need a furnace item
    const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id);
    if (!furnaceItem) {
      bot.chat('I have no furnace item to place.');
      return;
    }

    // try a few random positions
    let placed = false;
    for (let attempt = 0; attempt < 5 && !placed; attempt++) {
      const dir = randomHorizontalDirection();
      const candidatePos = bot.entity.position.offset(dir.x, 0, dir.z);
      const targetBlock = bot.blockAt(candidatePos);
      const belowBlock = bot.blockAt(candidatePos.offset(0, -1, 0));

      // need air to place into and a solid block below
      if (targetBlock && targetBlock.name === 'air' && belowBlock && belowBlock.name !== 'air') {
        bot.chat(`Attempting to place furnace at ${candidatePos}`);
        try {
          await placeItem(bot, 'furnace', candidatePos);
          const placedBlock = bot.blockAt(candidatePos);
          if (placedBlock && placedBlock.name === 'furnace') {
            furnaceBlock = placedBlock;
            placed = true;
            bot.chat('Furnace placed successfully.');
          } else {
            bot.chat('Furnace placement reported success but block not found.');
          }
        } catch (err) {
          bot.chat(`Failed to place furnace (attempt ${attempt + 1}): ${err.message}`);
        }
      } else {
        // not a valid spot, try another direction
        continue;
      }
    }
    if (!placed) {
      bot.chat('Could not place a furnace after several attempts.');
      return;
    }
  }

  // ---------- 4. smelt the porkchop ----------
  bot.chat(`Smelting 1 porkchop using ${fuelName} as fuel...`);
  await smeltItem(bot, 'porkchop', fuelName, 1);

  // ---------- 5. verify result ----------
  if (countItem('cooked_porkchop') >= 1) {
    bot.chat('Successfully cooked a porkchop!');
  } else {
    bot.chat('Cooking failed – no cooked porkchop in inventory.');
  }
}