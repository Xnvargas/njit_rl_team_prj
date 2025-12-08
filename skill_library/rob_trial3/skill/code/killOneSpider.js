// main function to kill a single spider
async function killOneSpider(bot) {
  const {
    Vec3
  } = require('vec3');

  // 1️⃣ Ensure we have a sword (iron_sword is present in the inventory)
  const mcData = require('minecraft-data')(bot.version);
  const swordItem = bot.inventory.findInventoryItem(mcData.itemsByName["iron_sword"].id);
  if (!swordItem) {
    await bot.chat("❌ I don't have an iron sword to kill the spider.");
    return;
  }

  // 2️⃣ Equip the sword
  try {
    await bot.equip(swordItem, "hand");
    await bot.chat("🗡️ Equipped iron sword.");
  } catch (e) {
    await bot.chat(`❌ Failed to equip sword: ${e.message}`);
    return;
  }

  // helper: pick a random direction vector (components -1,0,1, not all zero)
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }

  // 3️⃣ Find a spider nearby
  let spider = bot.nearestEntity(e => e.name === "spider" && e.position.distanceTo(bot.entity.position) < 32);

  // 4️⃣ If none, explore until we see one
  if (!spider) {
    await bot.chat("🔎 No spider nearby, exploring...");
    const found = await exploreUntil(bot, randomDirection(), 60, () => {
      const e = bot.nearestEntity(ent => ent.name === "spider" && ent.position.distanceTo(bot.entity.position) < 32);
      return e ? true : null;
    });
    if (!found) {
      await bot.chat("❌ Couldn't locate a spider after exploring.");
      return;
    }
    spider = bot.nearestEntity(e => e.name === "spider" && e.position.distanceTo(bot.entity.position) < 32);
  }

  // 5️⃣ Attack the spider
  await bot.chat(`⚔️ Attacking spider at ${spider.position}`);
  try {
    await killMob(bot, "spider", 300); // 5‑minute timeout
    await bot.chat("✅ Spider has been killed!");
  } catch (e) {
    await bot.chat(`❌ Failed to kill spider: ${e.message}`);
  }
}