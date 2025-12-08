// main function: mine at least 5 redstone dust
async function mineFiveRedstoneDust(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;
  const {
    Vec3
  } = require('vec3');

  // helper: pick a random non‑zero direction vector (components -1,0,1)
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }

  // 1️⃣ Ensure we have an iron‑tier pickaxe
  const pickaxeIds = [mcData.itemsByName.iron_pickaxe.id, mcData.itemsByName.diamond_pickaxe.id, mcData.itemsByName.netherite_pickaxe.id, mcData.itemsByName.stone_pickaxe.id // stone works but slower; keep as fallback
  ];
  let pickaxeItem = null;
  for (const id of pickaxeIds) {
    const it = bot.inventory.findInventoryItem(id);
    if (it) {
      pickaxeItem = it;
      break;
    }
  }
  if (!pickaxeItem) {
    await bot.chat('❌ No suitable pickaxe found. Cannot mine redstone.');
    return;
  }

  // 2️⃣ Equip the pickaxe
  try {
    await bot.equip(pickaxeItem, 'hand');
    await bot.chat(`🪓 Equipped ${pickaxeItem.name}.`);
  } catch (e) {
    await bot.chat(`❌ Failed to equip pickaxe: ${e.message}`);
    return;
  }

  // 3️⃣ Mine until we have 5 redstone dust
  const redstoneDustId = mcData.itemsByName.redstone.id; // dust item
  let redstoneCount = bot.inventory.count(redstoneDustId);
  while (redstoneCount < 5) {
    // a. Look for redstone ore (stone or deepslate version)
    let oreBlock = bot.findBlock({
      matching: [mcData.blocksByName.redstone_ore.id, mcData.blocksByName.deepslate_redstone_ore?.id].filter(Boolean),
      // filter out undefined on older versions
      maxDistance: 32
    });

    // b. If not found, explore
    if (!oreBlock) {
      await bot.chat('🔎 No redstone ore nearby, exploring...');
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const blk = bot.findBlock({
          matching: [mcData.blocksByName.redstone_ore.id, mcData.blocksByName.deepslate_redstone_ore?.id].filter(Boolean),
          maxDistance: 32
        });
        return blk ? true : null;
      });
      if (!found) {
        await bot.chat('❌ Could not locate redstone ore after exploring.');
        return;
      }
      // re‑search after exploration
      oreBlock = bot.findBlock({
        matching: [mcData.blocksByName.redstone_ore.id, mcData.blocksByName.deepslate_redstone_ore?.id].filter(Boolean),
        maxDistance: 32
      });
    }

    // c. Mine a single ore block
    await bot.chat('⛏️ Mining a redstone ore block...');
    await mineBlock(bot, oreBlock.name, 1); // mineBlock will collect the block(s)

    // d. Update count and report
    redstoneCount = bot.inventory.count(redstoneDustId);
    await bot.chat(`📦 Redstone dust collected: ${redstoneCount}/5`);
  }

  // 4️⃣ Completion
  await bot.chat('✅ Task complete – I have at least 5 redstone dust!');
}