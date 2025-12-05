// main function to smelt four iron ingots
async function smeltFourIronIngot(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ----- helper to count items in inventory -----
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // ----- 1. verify required materials -----
  if (countItem('raw_iron') < 4) {
    bot.chat('I need at least 4 raw_iron to smelt, but I don\'t have enough.');
    return;
  }
  if (countItem('coal') < 1) {
    bot.chat('I need some fuel (coal) to smelt the iron.');
    return;
  }
  if (!bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id)) {
    bot.chat('I have no furnace item in my inventory.');
    return;
  }

  // ----- 2. try to find an existing furnace -----
  let furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 32
  });

  // ----- 3. place a furnace if none is found -----
  if (!furnaceBlock) {
    bot.chat('No furnace nearby, looking for a free spot to place one...');
    // possible horizontal offsets (order can be random)
    const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];

    // shuffle offsets to avoid deterministic placement
    for (let i = offsets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
    }
    let placePos = null;
    for (const off of offsets) {
      const candidate = bot.entity.position.offset(off.x, off.y, off.z);
      const block = bot.blockAt(candidate);
      const below = bot.blockAt(candidate.offset(0, -1, 0));
      if (block && block.name === 'air' && below && below.name !== 'air') {
        placePos = candidate;
        break;
      }
    }

    // if still not found, explore a random direction and try again
    if (!placePos) {
      const randomDir = offsets[Math.floor(Math.random() * offsets.length)];
      await exploreUntil(bot, randomDir, 60, () => {
        for (const off of offsets) {
          const cand = bot.entity.position.offset(off.x, off.y, off.z);
          const blk = bot.blockAt(cand);
          const below = bot.blockAt(cand.offset(0, -1, 0));
          if (blk && blk.name === 'air' && below && below.name !== 'air') {
            placePos = cand;
            return true;
          }
        }
        return false;
      });
    }
    if (!placePos) {
      bot.chat('Could not find a free place to put the furnace.');
      return;
    }
    bot.chat(`Placing furnace at ${placePos}`);
    await placeItem(bot, 'furnace', placePos);
    furnaceBlock = bot.blockAt(placePos);
    if (!furnaceBlock || furnaceBlock.name !== 'furnace') {
      bot.chat('Failed to place the furnace.');
      return;
    }
    bot.chat('Furnace placed successfully.');
  } else {
    bot.chat('Found an existing furnace nearby.');
  }

  // ----- 4. smelt the iron -----
  bot.chat('Smelting 4 raw iron into iron ingots...');
  await smeltItem(bot, 'raw_iron', 'coal', 4);
  bot.chat('Finished smelting. Check inventory for iron_ingot.');
}