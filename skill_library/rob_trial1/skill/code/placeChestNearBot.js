// main function to place a chest near the bot
async function placeChestNearBot(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- 1. check if a chest already exists ----------
  const existingChest = bot.findBlock({
    matching: mcData.blocksByName.chest.id,
    maxDistance: 32
  });
  if (existingChest) {
    bot.chat('Chest already placed nearby, task complete.');
    return;
  }

  // ---------- 2. ensure we have a chest item ----------
  const chestItem = bot.inventory.findInventoryItem(mcData.itemsByName.chest.id);
  if (!chestItem) {
    bot.chat('I have no chest in my inventory, cannot place one.');
    return;
  }

  // helper: pick a random horizontal direction (y = 0)
  function randomHorizontalDirection() {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  // ---------- 3. try to find a suitable spot nearby ----------
  let placePos = null;
  for (let attempt = 0; attempt < 8 && !placePos; attempt++) {
    const dir = randomHorizontalDirection();
    const candidate = bot.entity.position.offset(dir.x, 0, dir.z);
    const block = bot.blockAt(candidate);
    const below = bot.blockAt(candidate.offset(0, -1, 0));
    if (block && block.name === 'air' && below && below.name !== 'air') {
      placePos = candidate;
    }
  }

  // ---------- 4. if not found, explore until a spot appears ----------
  if (!placePos) {
    bot.chat('Looking for a free spot to place the chest...');
    placePos = await exploreUntil(bot, randomHorizontalDirection(), 60, () => {
      const dir = randomHorizontalDirection();
      const cand = bot.entity.position.offset(dir.x, 0, dir.z);
      const blk = bot.blockAt(cand);
      const below = bot.blockAt(cand.offset(0, -1, 0));
      if (blk && blk.name === 'air' && below && below.name !== 'air') {
        return cand; // stop exploration, return position
      }
      return null;
    });
    if (!placePos) {
      bot.chat('Could not find a suitable place for the chest.');
      return;
    }
  }

  // ---------- 5. place the chest ----------
  try {
    bot.chat(`Placing chest at ${placePos}`);
    await placeItem(bot, 'chest', placePos);
  } catch (err) {
    bot.chat(`Failed to place chest: ${err.message}`);
    return;
  }

  // ---------- 6. verify ----------
  const placedChest = bot.blockAt(placePos);
  if (placedChest && placedChest.name === 'chest') {
    bot.chat('Chest placed successfully! Task complete.');
  } else {
    bot.chat('Chest placement attempted but block not found.');
  }
}