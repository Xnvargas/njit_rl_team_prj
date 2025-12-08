// Main function to mine at least 8 coal ore blocks
async function mineEightCoal(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // Helper: pick a random direction vector (components -1,0,1, not all zero)
  function randomDirection() {
    const choices = [-1, 0, 1];
    let v;
    do {
      v = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (v.x === 0 && v.y === 0 && v.z === 0);
    return v;
  }

  // 1️⃣ Check current coal amount
  const coalId = mcData.itemsByName["coal"].id;
  let coalCount = bot.inventory.count(coalId);
  if (coalCount >= 8) {
    await bot.chat(`✅ I already have ${coalCount} coal. Task completed.`);
    return;
  }
  await bot.chat(`🔎 Need ${8 - coalCount} more coal.`);

  // 2️⃣ Ensure we have a suitable pickaxe (stone tier or better)
  const pickaxeNames = ["stone_pickaxe", "iron_pickaxe", "golden_pickaxe", "diamond_pickaxe", "netherite_pickaxe"];
  let pickaxeItem = null;
  for (const name of pickaxeNames) {
    const item = bot.inventory.findInventoryItem(mcData.itemsByName[name].id);
    if (item) {
      pickaxeItem = item;
      break;
    }
  }

  // Fallback: craft a wooden pickaxe if nothing found (unlikely)
  if (!pickaxeItem) {
    await bot.chat("⚒️ No pickaxe found, crafting a wooden pickaxe...");
    await craftItem(bot, "wooden_pickaxe", 1);
    pickaxeItem = bot.inventory.findInventoryItem(mcData.itemsByName["wooden_pickaxe"].id);
    if (!pickaxeItem) {
      await bot.chat("❌ Failed to obtain any pickaxe.");
      return;
    }
  }

  // Equip the pickaxe
  try {
    await bot.equip(pickaxeItem, "hand");
    await bot.chat(`🪓 Equipped ${pickaxeItem.name}.`);
  } catch (e) {
    await bot.chat(`❌ Could not equip pickaxe: ${e.message}`);
    return;
  }

  // 3️⃣ Mine coal until we have 8
  const coalOreName = "coal_ore";
  while (coalCount < 8) {
    // a. Look for coal ore nearby
    let oreBlock = bot.findBlock({
      matching: mcData.blocksByName[coalOreName].id,
      maxDistance: 32
    });

    // b. If none, explore
    if (!oreBlock) {
      await bot.chat("🚶‍♂️ No coal ore nearby, exploring...");
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const blk = bot.findBlock({
          matching: mcData.blocksByName[coalOreName].id,
          maxDistance: 32
        });
        return blk ? true : null;
      });
      if (!found) {
        await bot.chat("❌ Could not locate coal ore after exploring.");
        return;
      }
      // re‑search after exploration
      oreBlock = bot.findBlock({
        matching: mcData.blocksByName[coalOreName].id,
        maxDistance: 32
      });
    }

    // c. Mine the needed amount
    const need = 8 - coalCount;
    await bot.chat(`⛏️ Mining ${need} coal ore block(s)...`);
    await mineBlock(bot, coalOreName, need);

    // d. Re‑count coal
    coalCount = bot.inventory.count(coalId);
    await bot.chat(`📦 Coal now: ${coalCount}/8`);
  }

  // 4️⃣ Completion
  await bot.chat(`✅ Task finished – I now have ${coalCount} coal!`);
}