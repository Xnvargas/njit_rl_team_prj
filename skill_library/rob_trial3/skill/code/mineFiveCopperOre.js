// main function to mine at least 5 raw copper ore items
async function mineFiveCopperOre(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;
  const Vec3 = require('vec3').Vec3;

  // helper: pick a random direction vector (components -1,0,1, not all zero)
  function randomDirection() {
    const choices = [-1, 0, 1];
    let v;
    do {
      v = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (v.x === 0 && v.y === 0 && v.z === 0);
    return v;
  }

  // 1️⃣ Check current raw copper amount
  const rawCopperId = mcData.itemsByName["raw_copper"].id;
  let rawCopper = bot.inventory.count(rawCopperId);
  if (rawCopper >= 5) {
    await bot.chat(`✅ I already have ${rawCopper} raw copper. Task completed.`);
    return;
  }
  await bot.chat(`🔎 Need ${5 - rawCopper} more raw copper.`);

  // 2️⃣ Ensure we have a stone‑tier pickaxe (stone, iron, gold, diamond, netherite)
  const pickaxeNames = ["stone_pickaxe", "iron_pickaxe", "golden_pickaxe", "diamond_pickaxe", "netherite_pickaxe"];
  let pickaxeItem = null;
  for (const name of pickaxeNames) {
    const item = bot.inventory.findInventoryItem(mcData.itemsByName[name].id);
    if (item) {
      pickaxeItem = item;
      break;
    }
  }
  // fallback: craft a wooden pickaxe if none found
  if (!pickaxeItem) {
    await bot.chat("⚒️ No suitable pickaxe found, crafting a wooden pickaxe...");
    // ensure we have 3 planks and 2 sticks (craftItem will handle missing items)
    await craftItem(bot, "wooden_pickaxe", 1);
    pickaxeItem = bot.inventory.findInventoryItem(mcData.itemsByName["wooden_pickaxe"].id);
    if (!pickaxeItem) {
      await bot.chat("❌ Failed to obtain a pickaxe.");
      return;
    }
  }

  // 3️⃣ Equip the pickaxe
  try {
    await bot.equip(pickaxeItem, "hand");
    await bot.chat(`🪓 Equipped ${pickaxeItem.name}.`);
  } catch (e) {
    await bot.chat(`❌ Could not equip pickaxe: ${e.message}`);
    return;
  }

  // 4️⃣ Mine copper ore until we have 5 raw copper
  const copperOreName = "copper_ore";
  while (rawCopper < 5) {
    // a. Find copper ore blocks nearby
    let oreBlock = bot.findBlock({
      matching: mcData.blocksByName[copperOreName].id,
      maxDistance: 32
    });

    // b. If none, explore
    if (!oreBlock) {
      await bot.chat("🚶‍♂️ No copper ore nearby, exploring...");
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const blk = bot.findBlock({
          matching: mcData.blocksByName[copperOreName].id,
          maxDistance: 32
        });
        return blk ? true : null;
      });
      if (!found) {
        await bot.chat("❌ Could not locate copper ore after exploring.");
        return;
      }
      oreBlock = bot.findBlock({
        matching: mcData.blocksByName[copperOreName].id,
        maxDistance: 32
      });
    }

    // c. Determine how many more we need
    const need = 5 - rawCopper;
    await bot.chat(`⛏️ Mining ${need} copper ore block(s)...`);
    // mineBlock will collect up to `need` blocks; it safely stops if fewer are found
    await mineBlock(bot, copperOreName, need);

    // d. Re‑count raw copper
    rawCopper = bot.inventory.count(rawCopperId);
    await bot.chat(`📦 Raw copper now: ${rawCopper}/5`);
  }

  // 5️⃣ Completion message
  await bot.chat(`✅ Task finished – I have ${rawCopper} raw copper!`);
}