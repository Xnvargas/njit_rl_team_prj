// main function to mine at least 5 gravel
async function mineFiveGravel(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // helper: pick a random direction vector (components -1,0,1, not all zero)
  function randomDirection() {
    const choices = [-1, 0, 1];
    let dir;
    do {
      dir = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (dir.x === 0 && dir.y === 0 && dir.z === 0);
    return dir;
  }
  const gravelId = mcData.itemsByName['gravel'].id;
  let gravelCount = bot.inventory.count(gravelId);
  if (gravelCount >= 5) {
    await bot.chat(`✅ I already have ${gravelCount} gravel. Task completed.`);
    return;
  }
  await bot.chat(`🔎 Need ${5 - gravelCount} more gravel.`);

  // ---- ensure we have a pickaxe and equip it ----
  const pickaxeNames = ['wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe', 'golden_pickaxe', 'diamond_pickaxe', 'netherite_pickaxe'];
  let pickaxeItem = null;
  for (const name of pickaxeNames) {
    const item = bot.inventory.findInventoryItem(mcData.itemsByName[name].id);
    if (item) {
      pickaxeItem = item;
      break;
    }
  }
  if (pickaxeItem) {
    try {
      await bot.equip(pickaxeItem, 'hand');
      await bot.chat(`🪓 Equipped ${pickaxeItem.name}.`);
    } catch (e) {
      await bot.chat(`⚠️ Could not equip pickaxe: ${e.message}`);
    }
  } else {
    await bot.chat('⚠️ No pickaxe found in inventory. I will try to mine with my hand.');
  }

  // ---- mining loop ----
  while (gravelCount < 5) {
    // find a gravel block nearby
    let gravelBlock = bot.findBlock({
      matching: mcData.blocksByName['gravel'].id,
      maxDistance: 32
    });

    // if none, explore until we find one
    if (!gravelBlock) {
      await bot.chat('🚶‍♂️ No gravel nearby, exploring...');
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const blk = bot.findBlock({
          matching: mcData.blocksByName['gravel'].id,
          maxDistance: 32
        });
        return blk ? true : null;
      });
      if (!found) {
        await bot.chat('❌ Could not locate gravel after exploring. Stopping.');
        return;
      }
      gravelBlock = bot.findBlock({
        matching: mcData.blocksByName['gravel'].id,
        maxDistance: 32
      });
    }
    const need = 5 - gravelCount;
    await bot.chat(`⛏️ Mining ${need} gravel block(s)...`);
    await mineBlock(bot, 'gravel', need);

    // recount
    gravelCount = bot.inventory.count(gravelId);
    await bot.chat(`📦 Gravel now: ${gravelCount}/5`);
  }
  await bot.chat('✅ Task finished – I have collected at least 5 gravel!');
}