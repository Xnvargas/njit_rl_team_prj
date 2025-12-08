// main function to kill a single spider
async function killOneSpider(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // -------- 1. Find a sword ----------
  const swordNames = ["netherite_sword", "diamond_sword", "golden_sword", "iron_sword", "stone_sword", "wooden_sword"];
  let swordItem = null;
  for (const name of swordNames) {
    const id = mcData.itemsByName[name]?.id;
    if (!id) continue;
    const item = bot.inventory.findInventoryItem(id);
    if (item) {
      swordItem = item;
      break;
    }
  }
  if (!swordItem) {
    await bot.chat("❌ I have no sword to fight a spider.");
    return;
  }

  // -------- 2. Equip the sword ----------
  try {
    await bot.equip(swordItem, "hand");
    await bot.chat(`🗡️ Equipped ${swordItem.name} for fighting.`);
  } catch (e) {
    await bot.chat(`❌ Could not equip sword: ${e.message}`);
    return;
  }

  // -------- 3. Helper to pick a random direction vector ----------
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }

  // -------- 4. Try to locate a spider ----------
  async function findSpider() {
    const spider = bot.nearestEntity(e => e.name === "spider" && e.position.distanceTo(bot.entity.position) < 32);
    return spider;
  }
  let spider = await findSpider();

  // -------- 5. Explore if not found ----------
  if (!spider) {
    await bot.chat("🔎 No spider nearby, exploring...");
    const found = await exploreUntil(bot, randomDirection(), 60, async () => {
      const s = await findSpider();
      return s ? true : null; // stop when a spider is found
    });
    if (!found) {
      await bot.chat("❌ Could not find a spider after exploring.");
      return;
    }
    spider = await findSpider(); // retrieve the spider after exploration
  }

  // -------- 6. Kill the spider ----------
  if (spider) {
    await bot.chat(`🐞 Spider located at ${spider.position}. Engaging...`);
    try {
      await killMob(bot, "spider", 300);
      await bot.chat("✅ Spider has been killed.");
    } catch (e) {
      await bot.chat(`❌ Failed to kill spider: ${e.message}`);
    }
  } else {
    await bot.chat("❌ Unexpected error: spider disappeared.");
  }
}