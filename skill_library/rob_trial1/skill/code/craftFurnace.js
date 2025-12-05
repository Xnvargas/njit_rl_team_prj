// main function to craft a furnace
async function craftFurnace(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ----- helpers -------------------------------------------------
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // Find a solid block with air above within radius 5
  function findPlacePosForTable() {
    const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    const base = bot.entity.position.floored();
    for (const off of offsets) {
      const solidPos = base.offset(off.x, off.y, off.z);
      const abovePos = solidPos.offset(0, 1, 0);
      const solidBlock = bot.blockAt(solidPos);
      const aboveBlock = bot.blockAt(abovePos);
      if (solidBlock && solidBlock.name !== 'air' && aboveBlock && aboveBlock.name === 'air') {
        return abovePos; // place on top of solidBlock
      }
    }
    return null;
  }

  // Random direction vector (components -1,0,1, not all zero)
  function randomDirection() {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  // ----- 1. Ensure enough cobblestone -------------------------
  const neededCobble = Math.max(0, 8 - countItem('cobblestone'));
  if (neededCobble > 0) {
    bot.chat(`Need ${neededCobble} more cobblestone, mining stone...`);
    await mineBlock(bot, 'stone', neededCobble);
  } else {
    bot.chat('Enough cobblestone available.');
  }

  // ----- 2. Locate or place a crafting table -------------------
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 5
  });
  if (!tableBlock) {
    // we need to place one
    if (countItem('crafting_table') === 0) {
      bot.chat('No crafting table item in inventory – cannot craft furnace.');
      return;
    }

    // try to find a suitable spot
    let placePos = findPlacePosForTable();

    // if none, explore a bit and retry (max 30 s)
    if (!placePos) {
      bot.chat('No free spot nearby, moving to find a place...');
      await exploreUntil(bot, randomDirection(), 30, () => {
        placePos = findPlacePosForTable();
        return placePos ? placePos : null;
      });
    }
    if (!placePos) {
      bot.chat('Failed to find a place to put the crafting table.');
      return;
    }
    bot.chat(`Placing crafting table at ${placePos}`);
    await placeItem(bot, 'crafting_table', placePos);
    tableBlock = bot.blockAt(placePos);
    if (!tableBlock || tableBlock.name !== 'crafting_table') {
      bot.chat('Failed to place the crafting table.');
      return;
    }
    bot.chat('Crafting table placed successfully.');
  } else {
    bot.chat('Crafting table already placed nearby.');
  }

  // ----- 3. Craft the furnace ---------------------------------
  bot.chat('Crafting a furnace...');
  try {
    await craftItem(bot, 'furnace', 1);
    bot.chat('Furnace crafted successfully!');
  } catch (err) {
    bot.chat(`Failed to craft furnace: ${err.message}`);
  }
}