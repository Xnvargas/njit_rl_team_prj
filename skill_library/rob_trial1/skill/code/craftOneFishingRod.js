// ---------------------------------------------------------------------------
// Main function: craft one fishing rod (generic, reusable)
// ---------------------------------------------------------------------------
async function craftOneFishingRod(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');
  const {
    GoalNear,
    GoalPlaceBlock
  } = require('mineflayer-pathfinder').goals;

  // ---------- helpers ----------
  const countItem = name => {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  };

  // get items from the nearest chest (max 32 blocks)
  async function fetchFromChest(need) {
    const chestBlock = bot.findBlock({
      matching: mcData.blocksByName.chest.id,
      maxDistance: 32
    });
    if (!chestBlock) {
      bot.chat('❌ No chest within 32 blocks.');
      return false;
    }
    await bot.pathfinder.goto(new GoalNear(chestBlock.position.x, chestBlock.position.y, chestBlock.position.z, 1));
    await getItemFromChest(bot, chestBlock.position, need);
    return true;
  }

  // ---------- 1) ensure sticks ----------
  const needSticks = Math.max(0, 3 - countItem('stick'));
  if (needSticks > 0) {
    bot.chat(`🔎 Need ${needSticks} stick(s).`);
    if (!(await fetchFromChest({
      stick: needSticks
    }))) return;
    bot.chat(`✅ Got sticks.`);
  } else {
    bot.chat('✅ Already have enough sticks.');
  }

  // ---------- 2) ensure strings ----------
  const needStrings = Math.max(0, 2 - countItem('string'));
  if (needStrings > 0) {
    bot.chat(`🔎 Need ${needStrings} string(s).`);
    if (!(await fetchFromChest({
      string: needStrings
    }))) return;
    bot.chat(`✅ Got strings.`);
  } else {
    bot.chat('✅ Already have enough strings.');
  }

  // ---------- 3) locate or place a crafting table ----------
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 5
  });

  // helper: find a suitable placement position around the bot
  function findPlacementPos() {
    const base = bot.entity.position.floored(); // integer foot position
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const pos = base.offset(dx, 1, dz); // one block above ground
        const block = bot.blockAt(pos);
        if (!block || block.name !== 'air') continue; // must be air
        const below = bot.blockAt(pos.minus(new Vec3(0, 1, 0)));
        if (below && below.name !== 'air') return pos; // solid support
      }
    }
    return null;
  }
  async function tryPlaceTable() {
    for (let attempt = 0; attempt < 3; attempt++) {
      let placePos = findPlacementPos();
      // if not found, walk a bit in a random horizontal direction and retry
      if (!placePos) {
        const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
        const randomDir = dirs[Math.floor(Math.random() * dirs.length)];
        await exploreUntil(bot, randomDir, 60, () => null);
        placePos = findPlacementPos();
      }
      if (!placePos) continue; // try next attempt

      // move close enough to place
      await bot.pathfinder.goto(new GoalPlaceBlock(placePos, bot.world, {}));
      try {
        await placeItem(bot, 'crafting_table', placePos);
        const placed = bot.blockAt(placePos);
        if (placed && placed.name === 'crafting_table') return placed;
      } catch (e) {
        bot.chat(`⚠️ Placement attempt ${attempt + 1} failed: ${e.message}`);
      }
    }
    return null;
  }
  if (!tableBlock) {
    bot.chat('🔨 No crafting table nearby – attempting to place one...');
    tableBlock = await tryPlaceTable();
    if (!tableBlock) {
      bot.chat('❌ Could not place a crafting table.');
      return;
    }
    bot.chat(`✅ Crafting table placed at ${tableBlock.position}.`);
  } else {
    bot.chat('✅ Found existing crafting table nearby.');
  }

  // ---------- 4) craft the fishing rod ----------
  bot.chat('🎣 Crafting a fishing rod...');
  try {
    await bot.pathfinder.goto(new GoalNear(tableBlock.position.x, tableBlock.position.y, tableBlock.position.z, 2));
    await craftItem(bot, 'fishing_rod', 1);
    bot.chat('✅ Fishing rod crafted successfully!');
  } catch (err) {
    bot.chat(`❌ Failed to craft fishing rod: ${err.message}`);
  }
}