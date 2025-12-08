// main function to mine at least 5 coal ore and end up with 5 coal items
async function mineFiveCoal(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;
  const Vec3 = require('vec3').Vec3;

  // ---------- helper: pick the best pickaxe and equip it ----------
  async function ensurePickaxe() {
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
    await bot.chat("❌ No pickaxe (iron or better) found in inventory.");
    return false;
  }

  // ---------- helper: random direction vector (components -1,0,1, not all zero) ----------
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }

  // ---------- start of main logic ----------
  // 1️⃣ Equip a pickaxe
  if (!(await ensurePickaxe())) return;

  // 2️⃣ Helper to count coal in inventory
  const coalId = mcData.itemsByName.coal.id;
  function coalCount() {
    return bot.inventory.count(coalId);
  }

  // 3️⃣ If we already have enough coal, we're done
  if (coalCount() >= 5) {
    await bot.chat(`✅ Already have ${coalCount()} coal. Task completed.`);
    return;
  }

  // 4️⃣ Loop until we have at least 5 coal
  for (let attempt = 0; attempt < 5; attempt++) {
    const have = coalCount();
    if (have >= 5) break; // success

    const need = 5 - have;
    await bot.chat(`🔎 Need ${need} more coal (currently ${have}). Searching for coal ore...`);

    // Try to find coal ore nearby
    let oreBlock = bot.findBlock({
      matching: mcData.blocksByName.coal_ore.id,
      maxDistance: 32
    });

    // If not found, explore
    if (!oreBlock) {
      await bot.chat("🚶‍♂️ Exploring for coal ore...");
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const blk = bot.findBlock({
          matching: mcData.blocksByName.coal_ore.id,
          maxDistance: 32
        });
        return blk ? true : null;
      });
      if (!found) {
        await bot.chat("❌ Exploration timed out – no coal ore found.");
        break;
      }
      oreBlock = bot.findBlock({
        matching: mcData.blocksByName.coal_ore.id,
        maxDistance: 32
      });
    }
    if (!oreBlock) {
      await bot.chat("❌ Still couldn't locate coal ore. Stopping.");
      break;
    }
    await bot.chat(`✅ Coal ore located at ${oreBlock.position}. Mining ${need} block(s)...`);
    // Mine the required amount (mineBlock will stop early if not enough blocks are found)
    await mineBlock(bot, "coal_ore", need);

    // Small pause to let inventory update
    await bot.waitForTicks(10);
  }

  // 5️⃣ Final report
  const finalCount = coalCount();
  if (finalCount >= 5) {
    await bot.chat(`✅ Success! I now have ${finalCount} coal.`);
  } else {
    await bot.chat(`⚠️ Task finished but only have ${finalCount} coal.`);
  }
}