// ---------------------------------------------------------------
// Helper: random direction vector (components -1,0,1, not all zero)
function randomDirection() {
  const choices = [-1, 0, 1];
  let vec;
  do {
    vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
  } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
  return vec;
}

// ---------------------------------------------------------------
// Helper: ensure we have an iron‑or‑better pickaxe equipped

// ---------------------------------------------------------------
// Helper: ensure we have an iron‑or‑better pickaxe equipped
async function ensurePickaxe(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const order = ["netherite_pickaxe", "diamond_pickaxe", "iron_pickaxe", "stone_pickaxe", "golden_pickaxe", "wooden_pickaxe"];
  for (const name of order) {
    const id = mcData.itemsByName[name].id;
    const item = bot.inventory.findInventoryItem(id);
    if (item) {
      await bot.equip(item, "hand");
      await bot.chat(`✅ Equipped ${name}.`);
      return true;
    }
  }
  await bot.chat("❌ No pickaxe (iron or better) in inventory.");
  return false;
}

// ---------------------------------------------------------------
// Helper: ensure we have at least `count` coal (mines if needed)

// ---------------------------------------------------------------
// Helper: ensure we have at least `count` coal (mines if needed)
async function ensureCoal(bot, count) {
  const mcData = require('minecraft-data')(bot.version);
  const coalId = mcData.itemsByName.coal.id;
  const have = bot.inventory.count(coalId);
  if (have >= count) {
    await bot.chat(`✅ Coal check passed (${have}/${count}).`);
    return;
  }
  const need = count - have;
  await bot.chat(`🔨 Need ${need} more coal, mining coal ore...`);
  await mineBlock(bot, "coal_ore", need);
}

// ---------------------------------------------------------------
// Helper: ensure a furnace exists within 32 blocks of the bot.
// If none is found, place a new one next to the bot.

// ---------------------------------------------------------------
// Helper: ensure a furnace exists within 32 blocks of the bot.
// If none is found, place a new one next to the bot.
async function ensureFurnaceNearby(bot) {
  const mcData = require('minecraft-data')(bot.version);
  // look for any furnace within 32 blocks of current position
  let furnace = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 32
  });
  if (furnace) {
    await bot.chat(`✅ Found nearby furnace at ${furnace.position}`);
    return furnace;
  }

  // need a furnace item to place
  const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id);
  if (!furnaceItem) {
    await bot.chat("❌ No furnace item in inventory to place.");
    return null;
  }

  // find a solid block adjacent to the bot to serve as reference
  const reference = bot.findBlock({
    matching: b => b.name !== "air",
    maxDistance: 3
  });
  if (!reference) {
    await bot.chat("❌ No solid block nearby to place a furnace on.");
    return null;
  }
  const placePos = reference.position.offset(0, 1, 0);
  await bot.chat(`Placing furnace at ${placePos}`);
  await placeItem(bot, "furnace", placePos);
  return bot.blockAt(placePos);
}

// ---------------------------------------------------------------
// Main function: mine at least 5 gold ore and smelt them

// ---------------------------------------------------------------
// Main function: mine at least 5 gold ore and smelt them
async function mineFiveGoldOre(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // 1️⃣ Pickaxe
  if (!(await ensurePickaxe(bot))) return;

  // 2️⃣ Coal for smelting (5 pieces)
  await ensureCoal(bot, 5);

  // 3️⃣ Locate gold ore (explore if necessary)
  const goldOreId = mcData.blocksByName.gold_ore.id;
  let goldBlock = bot.findBlock({
    matching: goldOreId,
    maxDistance: 32
  });
  if (!goldBlock) {
    await bot.chat("🔎 Gold ore not nearby, exploring...");
    const found = await exploreUntil(bot, randomDirection(), 60, () => {
      const blk = bot.findBlock({
        matching: goldOreId,
        maxDistance: 32
      });
      return blk ? true : null;
    });
    if (!found) {
      await bot.chat("❌ Exploration failed to locate gold ore.");
      return;
    }
    goldBlock = bot.findBlock({
      matching: goldOreId,
      maxDistance: 32
    });
  }
  await bot.chat(`✅ Gold ore located at ${goldBlock.position}`);

  // 4️⃣ Mine 5 gold ore blocks
  await bot.chat("⛏️ Mining gold ore...");
  await mineBlock(bot, "gold_ore", 5);

  // 5️⃣ Verify we have at least 5 raw_gold
  const rawGoldId = mcData.itemsByName.raw_gold.id;
  let rawGoldCount = bot.inventory.count(rawGoldId);
  if (rawGoldCount < 5) {
    const need = 5 - rawGoldCount;
    await bot.chat(`⚠️ Only ${rawGoldCount} raw gold, mining ${need} more ore...`);
    await mineBlock(bot, "gold_ore", need);
    rawGoldCount = bot.inventory.count(rawGoldId);
  }

  // 6️⃣ Ensure a furnace is nearby
  const furnaceBlock = await ensureFurnaceNearby(bot);
  if (!furnaceBlock) {
    await bot.chat("❌ Cannot continue without a furnace.");
    return;
  }

  // 7️⃣ Move next to the furnace
  await bot.pathfinder.goto(new GoalNear(furnaceBlock.position.x, furnaceBlock.position.y, furnaceBlock.position.z, 1));

  // 8️⃣ Smelt raw gold into ingots
  await bot.chat(`🔥 Smelting ${rawGoldCount} raw gold into ingots...`);
  await smeltItem(bot, "raw_gold", "coal", rawGoldCount);

  // 9️⃣ Report result
  const goldIngotId = mcData.itemsByName.gold_ingot.id;
  const goldIngotCount = bot.inventory.count(goldIngotId);
  if (goldIngotCount >= 5) {
    await bot.chat(`✅ Success! I now have ${goldIngotCount} gold ingot(s).`);
  } else {
    await bot.chat(`❌ Finished but only have ${goldIngotCount} gold ingot(s).`);
  }
}