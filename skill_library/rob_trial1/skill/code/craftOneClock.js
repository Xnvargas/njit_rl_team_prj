// main function: craft exactly one clock
async function craftOneClock(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');
  const {
    GoalNear,
    GoalPlaceBlock,
    GoalLookAtBlock
  } = require('mineflayer-pathfinder').goals;

  // ---------- small helpers ----------
  const countItem = name => {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  };

  // pick a random horizontal direction (no vertical component)
  const randomHorizontalDirection = () => {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  };

  // find an air block with a solid block underneath within radius r
  const findAirWithGround = (radius = 4) => {
    const base = bot.entity.position.floored(); // foot block
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const pos = base.offset(dx, 1, dz); // one block above ground level
        const block = bot.blockAt(pos);
        const below = bot.blockAt(pos.minus(new Vec3(0, 1, 0)));
        if (block && block.name === 'air' && below && below.name !== 'air') {
          return pos;
        }
      }
    }
    return null;
  };

  // ---------- 1. Verify required materials ----------
  if (countItem('gold_ingot') < 4) {
    bot.chat('❌ Need 4 gold ingots to craft a clock.');
    return;
  }
  if (countItem('redstone') < 1) {
    bot.chat('❌ Need redstone dust to craft a clock.');
    return;
  }
  bot.chat('✅ Required materials are present.');

  // ---------- 2. Ensure a crafting table ----------
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 5
  });
  if (!tableBlock) {
    bot.chat('🔨 No crafting table nearby – attempting to place one...');
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      bot.chat('❌ No crafting table item in inventory.');
      return;
    }

    // try up to three placement attempts
    for (let attempt = 0; attempt < 3; attempt++) {
      // 2a. locate a suitable spot
      let placePos = findAirWithGround(4);
      if (!placePos) {
        // move a bit randomly and try again
        const dir = randomHorizontalDirection();
        bot.chat(`🚶‍♂️ Exploring a bit to find space (attempt ${attempt + 1})...`);
        await exploreUntil(bot, dir, 20, () => null); // just walk
        placePos = findAirWithGround(4);
      }
      if (!placePos) {
        bot.chat('⚠️ Still could not find a free spot for the table.');
        continue;
      }

      // 2b. if the target block is not air, clear it (mine)
      const targetBlock = bot.blockAt(placePos);
      if (targetBlock && targetBlock.name !== 'air') {
        bot.chat('⛏️ Clearing block that occupies the placement spot...');
        await mineBlock(bot, targetBlock.name, 1);
      }

      // 2c. move close enough and place
      try {
        await bot.pathfinder.goto(new GoalPlaceBlock(placePos, bot.world, {}));
        await placeItem(bot, 'crafting_table', placePos);
        tableBlock = bot.blockAt(placePos);
        if (tableBlock && tableBlock.name === 'crafting_table') {
          bot.chat(`✅ Placed crafting table at ${placePos}.`);
          break;
        }
      } catch (e) {
        bot.chat(`⚠️ Placement attempt ${attempt + 1} failed: ${e.message}`);
      }
    }
    if (!tableBlock) {
      bot.chat('❌ Failed to place a crafting table – cannot craft the clock.');
      return;
    }
  } else {
    bot.chat('✅ Found an existing crafting table nearby.');
  }

  // ---------- 3. Craft the clock ----------
  bot.chat('⏱️ Crafting the clock...');
  try {
    // ensure we are close enough to the table
    await bot.pathfinder.goto(new GoalNear(tableBlock.position.x, tableBlock.position.y, tableBlock.position.z, 2));
    await craftItem(bot, 'clock', 1);
    bot.chat('✅ Clock crafted successfully!');
  } catch (err) {
    bot.chat(`❌ Failed to craft the clock: ${err.message}`);
  }
}