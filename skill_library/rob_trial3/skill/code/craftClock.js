// ---------- helper functions ----------
function randomDirection() {
  const choices = [-1, 0, 1];
  let vec;
  do {
    vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
  } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
  return vec;
}

// equip any pickaxe (iron or better)

// equip any pickaxe (iron or better)
async function ensurePickaxe(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const pickaxeOrder = ["netherite_pickaxe", "diamond_pickaxe", "iron_pickaxe", "stone_pickaxe", "golden_pickaxe", "wooden_pickaxe"];
  for (const name of pickaxeOrder) {
    const id = mcData.itemsByName[name].id;
    const item = bot.inventory.findInventoryItem(id);
    if (item) {
      await bot.equip(item, "hand");
      await bot.chat(`✅ Equipped ${name}.`);
      return true;
    }
  }
  await bot.chat("❌ No pickaxe found in inventory.");
  return false;
}

// ensure we have at least `count` redstone dust

// ensure we have at least `count` redstone dust
async function ensureRedstone(bot, count = 1) {
  const mcData = require('minecraft-data')(bot.version);
  const redstoneId = mcData.itemsByName.redstone.id;
  let have = bot.inventory.count(redstoneId);
  if (have >= count) {
    await bot.chat(`✅ Redstone check passed (${have}/${count}).`);
    return true;
  }

  // try to take from a chest nearby
  const nearbyChest = bot.findBlock({
    matching: mcData.blocksByName.chest.id,
    maxDistance: 5
  });
  if (nearbyChest) {
    const chestBlock = bot.blockAt(nearbyChest.position);
    const chest = await bot.openContainer(chestBlock);
    const stack = chest.findContainerItem(redstoneId);
    if (stack) {
      const toTake = Math.min(count - have, stack.count);
      await chest.withdraw(redstoneId, null, toTake);
      await chest.close();
      have = bot.inventory.count(redstoneId);
      if (have >= count) {
        await bot.chat(`✅ Took ${toTake} redstone from chest.`);
        return true;
      }
    }
    await chest.close();
  }

  // need to mine redstone ore
  await bot.chat(`🔎 Need ${count - have} more redstone dust – mining redstone ore...`);
  // find ore nearby
  const mc = require('minecraft-data')(bot.version);
  let ore = bot.findBlock({
    matching: mc.blocksByName.redstone_ore.id,
    maxDistance: 32
  });
  if (!ore) {
    await bot.chat("Exploring for redstone ore...");
    const found = await exploreUntil(bot, randomDirection(), 60, () => {
      const blk = bot.findBlock({
        matching: mc.blocksByName.redstone_ore.id,
        maxDistance: 32
      });
      return blk ? true : null;
    });
    if (!found) {
      await bot.chat("❌ Could not locate redstone ore.");
      return false;
    }
    ore = bot.findBlock({
      matching: mc.blocksByName.redstone_ore.id,
      maxDistance: 32
    });
  }

  // mine enough ore blocks
  const needBlocks = Math.ceil((count - have) / 1); // each ore drops at least 1 dust
  await mineBlock(bot, "redstone_ore", needBlocks);
  // short wait for inventory update
  await bot.waitForTicks(10);
  have = bot.inventory.count(redstoneId);
  if (have >= count) {
    await bot.chat(`✅ Acquired ${have} redstone dust.`);
    return true;
  }
  await bot.chat(`❌ Still missing redstone dust after mining (have ${have}).`);
  return false;
}

// ensure a crafting table block exists nearby, otherwise place one

// ensure a crafting table block exists nearby, otherwise place one
async function ensureCraftingTable(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const tableId = mcData.blocksByName.crafting_table.id;
  const nearby = bot.findBlock({
    matching: tableId,
    maxDistance: 5
  });
  if (nearby) {
    await bot.chat(`✅ Crafting table already present at ${nearby.position}.`);
    return true;
  }

  // need a crafting table item
  const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
  if (!tableItem) {
    await bot.chat("❌ No crafting table item in inventory.");
    return false;
  }

  // find a free air block adjacent to the bot
  const candidates = [bot.entity.position.offset(1, 0, 0), bot.entity.position.offset(-1, 0, 0), bot.entity.position.offset(0, 0, 1), bot.entity.position.offset(0, 0, -1), bot.entity.position.offset(0, 1, 0)];
  let placePos = null;
  for (const pos of candidates) {
    const block = bot.blockAt(pos);
    if (block && block.name === "air") {
      placePos = pos;
      break;
    }
  }
  if (!placePos) {
    await bot.chat("❌ No suitable air block to place a crafting table.");
    return false;
  }
  await bot.chat(`Placing crafting table at ${placePos}...`);
  try {
    await placeItem(bot, "crafting_table", placePos);
    await bot.chat("✅ Crafting table placed.");
    return true;
  } catch (e) {
    await bot.chat(`❌ Failed to place crafting table: ${e.message}`);
    return false;
  }
}

// ---------- main function ----------

// ---------- main function ----------
async function craftClock(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const goldId = mcData.itemsByName.gold_ingot.id;
  const redstoneId = mcData.itemsByName.redstone.id;

  // 1. Equip a pickaxe
  if (!(await ensurePickaxe(bot))) return;

  // 2. Ensure we have at least 4 gold ingots
  const goldCount = bot.inventory.count(goldId);
  if (goldCount < 4) {
    await bot.chat(`❌ Need at least 4 gold ingots (have ${goldCount}).`);
    return;
  }
  await bot.chat(`✅ Gold ingots check passed (${goldCount} available).`);

  // 3. Ensure we have at least 1 redstone dust
  if (!(await ensureRedstone(bot, 1))) return;

  // 4. Ensure a crafting table is present
  if (!(await ensureCraftingTable(bot))) return;

  // 5. Craft the clock
  await bot.chat("🛠️ Crafting a clock...");
  try {
    await craftItem(bot, "clock", 1);
    await bot.chat("✅ Clock crafted successfully!");
  } catch (e) {
    await bot.chat(`❌ Failed to craft clock: ${e.message}`);
  }
}