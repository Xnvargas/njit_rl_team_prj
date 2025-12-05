// ------------------------------------------------------------
// Helper: pick a random horizontal direction (no vertical)
// ------------------------------------------------------------
function randomHorizontalDirection() {
  const {
    Vec3
  } = require('vec3');
  const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
  return dirs[Math.floor(Math.random() * dirs.length)];
}

// ------------------------------------------------------------
// Main function: kill exactly one spider
// ------------------------------------------------------------

// ------------------------------------------------------------
// Main function: kill exactly one spider
// ------------------------------------------------------------
async function killOneSpider(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // 1) Ensure we have a sword and equip it
  const swordId = mcData.itemsByName.iron_sword?.id || mcData.itemsByName.diamond_sword?.id || mcData.itemsByName.stone_sword?.id || mcData.itemsByName.wooden_sword?.id;
  if (!swordId) {
    bot.chat('❌ No sword in inventory – cannot kill a spider.');
    return;
  }
  const swordItem = bot.inventory.findInventoryItem(swordId);
  if (!swordItem) {
    bot.chat('❌ Sword not found in inventory.');
    return;
  }
  await bot.equip(swordItem, 'hand');
  bot.chat('✅ Sword equipped, ready to fight.');

  // 2) Search for a spider
  let spider = null;
  const maxAttempts = 10; // avoid endless searching
  for (let attempt = 0; attempt < maxAttempts && !spider; attempt++) {
    // try to see if a spider is already nearby
    spider = bot.nearestEntity(e => e.name === 'spider' && e.position.distanceTo(bot.entity.position) < 32);
    if (spider) break;
    const dir = randomHorizontalDirection();
    bot.chat(`🔎 Searching for a spider (attempt ${attempt + 1})...`);
    // exploreUntil will move the bot in the chosen direction; the callback
    // stops as soon as a spider appears within 32 blocks.
    await exploreUntil(bot, dir, 60, () => {
      const found = bot.nearestEntity(ent => ent.name === 'spider' && ent.position.distanceTo(bot.entity.position) < 32);
      if (found) {
        spider = found; // store for later use
        return found; // stop exploration
      }
      return null; // keep exploring
    });
  }
  if (!spider) {
    bot.chat('❌ Could not locate any spider nearby.');
    return;
  }

  // 3) Kill the spider
  bot.chat(`⚔️ Spider spotted at ${spider.position}. Engaging...`);
  // killMob will handle pathfinding and attacking
  await killMob(bot, 'spider', 300); // 300 ticks ≈ 15 seconds timeout
  bot.chat('✅ Spider has been killed.');
}