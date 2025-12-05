// ------------------------------------------------------------
// Helper functions (local to the main function)
// ------------------------------------------------------------
async function countItem(bot, mcData, name) {
  const id = mcData.itemsByName[name]?.id;
  return id ? bot.inventory.count(id) : 0;
}

function getBestPickaxe(bot, mcData) {
  // order from best to worst (iron or better is required)
  const order = ["netherite_pickaxe", "diamond_pickaxe", "iron_pickaxe", "golden_pickaxe", "stone_pickaxe", "wooden_pickaxe"];
  for (const n of order) {
    const id = mcData.itemsByName[n]?.id;
    if (!id) continue;
    const item = bot.inventory.findInventoryItem(id);
    if (item) return item;
  }
  return null;
}

async function eatIfHungry(bot, mcData) {
  if (bot.food >= 14) return;
  const foods = ["cooked_porkchop", "cooked_beef", "porkchop", "beef"];
  for (const f of foods) {
    const item = bot.inventory.findInventoryItem(mcData.itemsByName[f]?.id);
    if (item) {
      await bot.equip(item, "hand");
      await bot.consume();
      bot.chat(`🍖 Ate a ${f} (hunger ${bot.food}/20).`);
      if (bot.food >= 14) break;
    }
  }
}

// ------------------------------------------------------------
// Main function
// ------------------------------------------------------------

// ------------------------------------------------------------
// Main function
// ------------------------------------------------------------
async function mineThreeDiamondOre(bot) {
  const mcData = require("minecraft-data")(bot.version);
  const {
    Vec3
  } = require("vec3");

  // 1️⃣ Ensure we are not starving
  await eatIfHungry(bot, mcData);

  // 2️⃣ Get and equip a suitable pickaxe (iron or better)
  const pickaxe = getBestPickaxe(bot, mcData);
  if (!pickaxe) {
    bot.chat("❌ I have no pickaxe strong enough to mine diamonds.");
    return;
  }
  await bot.equip(pickaxe, "hand");
  bot.chat(`✅ Equipped ${pickaxe.name} for mining diamonds.`);

  // 3️⃣ Try to locate a diamond ore block
  let diamondOre = bot.findBlock({
    matching: mcData.blocksByName.diamond_ore.id,
    maxDistance: 32
  });

  // 4️⃣ If not found, explore in random directions (up to 3 attempts)
  const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
  for (let attempt = 0; attempt < 3 && !diamondOre; attempt++) {
    const dir = directions[Math.floor(Math.random() * directions.length)];
    bot.chat(`🔎 Exploring ${dir} to find diamond ore (attempt ${attempt + 1})...`);
    await exploreUntil(bot, dir, 60, () => {
      const blk = bot.findBlock({
        matching: mcData.blocksByName.diamond_ore.id,
        maxDistance: 32
      });
      return blk ? blk : null; // stop when found
    });
    // after exploration, try again
    diamondOre = bot.findBlock({
      matching: mcData.blocksByName.diamond_ore.id,
      maxDistance: 32
    });
  }
  if (!diamondOre) {
    bot.chat("❌ Could not locate any diamond ore after exploring.");
    return;
  }
  bot.chat(`✅ Found diamond ore at ${diamondOre.position}. Starting mining.`);

  // 5️⃣ Mine three diamond ore blocks
  await mineBlock(bot, "diamond_ore", 3);
  bot.chat("⛏️ Mined three diamond ore blocks.");

  // 6️⃣ Verify we have at least three diamonds
  const diamondCount = await countItem(bot, mcData, "diamond");
  if (diamondCount >= 3) {
    bot.chat(`✅ Success! I now have ${diamondCount} diamond(s).`);
  } else {
    bot.chat(`⚠️ I only have ${diamondCount} diamond(s) after mining.`);
  }
}