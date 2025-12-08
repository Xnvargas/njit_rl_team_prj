// Main function to kill a single spider
async function killOneSpider(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // Helper: generate a random direction vector (components -1, 0, or 1, not all zero)
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }

  // 1️⃣ Look for a spider nearby (within 32 blocks)
  let spider = bot.nearestEntity(e => e.name === "spider" && e.position.distanceTo(bot.entity.position) <= 32);

  // 2️⃣ If not found, explore until we see one
  if (!spider) {
    await bot.chat("No spider nearby, exploring to find one...");
    const found = await exploreUntil(bot, randomDirection(), 60, () => {
      const e = bot.nearestEntity(ent => ent.name === "spider" && ent.position.distanceTo(bot.entity.position) <= 32);
      return e ? true : null; // stop when a spider is found
    });
    if (!found) {
      await bot.chat("❌ Could not locate any spider after exploring.");
      return;
    }
    // Re‑assign after exploration
    spider = bot.nearestEntity(e => e.name === "spider" && e.position.distanceTo(bot.entity.position) <= 32);
    if (!spider) {
      await bot.chat("❌ Spider disappeared before we could attack.");
      return;
    }
  }

  // 3️⃣ Move close enough (optional, killMob will handle movement)
  await bot.pathfinder.goto(new GoalNear(spider.position.x, spider.position.y, spider.position.z, 2));

  // 4️⃣ Attack the spider
  await bot.chat(`Attacking spider at ${spider.position}`);
  await killMob(bot, "spider", 300); // 300 seconds timeout is plenty

  // 5️⃣ Confirm the kill
  // After killMob returns, the spider should be dead; we can double‑check
  const stillAlive = bot.nearestEntity(e => e.name === "spider" && e.position.distanceTo(bot.entity.position) <= 5);
  if (stillAlive) {
    await bot.chat("❌ Spider is still alive. Something went wrong.");
  } else {
    await bot.chat("✅ Spider killed successfully!");
  }
}