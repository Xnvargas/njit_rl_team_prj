// main function to kill a single spider
async function killOneSpider(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // Helper: pick a random direction vector (components -1,0,1, not all zero)
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }

  // 1️⃣ Ensure we have a sword to use
  const swordItem = bot.inventory.findInventoryItem(mcData.itemsByName["iron_sword"].id);
  if (!swordItem) {
    await bot.chat("❌ I don't have a sword to kill the spider.");
    return;
  }

  // Function to equip the sword
  async function equipSword() {
    try {
      await bot.equip(swordItem, "hand");
    } catch (e) {
      await bot.chat(`❌ Failed to equip sword: ${e.message}`);
      throw e;
    }
  }

  // 2️⃣ Look for a spider nearby (within 32 blocks)
  let spider = bot.nearestEntity(e => e.name === "spider" && e.position.distanceTo(bot.entity.position) < 32);

  // 3️⃣ If not found, explore until we see one
  if (!spider) {
    await bot.chat("🔎 No spider nearby, exploring to find one...");
    const found = await exploreUntil(bot, randomDirection(), 60, () => {
      const ent = bot.nearestEntity(e => e.name === "spider" && e.position.distanceTo(bot.entity.position) < 32);
      return ent ? true : null; // stop when a spider is detected
    });
    if (!found) {
      await bot.chat("❌ Could not locate a spider after exploring.");
      return;
    }

    // Re‑search after exploration succeeded
    spider = bot.nearestEntity(e => e.name === "spider" && e.position.distanceTo(bot.entity.position) < 32);
    if (!spider) {
      await bot.chat("❌ Spider disappeared before I could attack.");
      return;
    }
  }

  // 4️⃣ Equip sword and kill the spider
  await bot.chat("⚔️ Spider found! Equipping sword and attacking...");
  await equipSword();

  // killMob will handle moving to the entity and attacking
  try {
    await killMob(bot, "spider", 300);
    await bot.chat("✅ Spider has been killed.");
  } catch (e) {
    await bot.chat(`❌ Failed to kill spider: ${e.message}`);
  }
}