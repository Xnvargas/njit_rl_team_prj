// main function to mine three iron ore blocks
async function mineThreeIronOre(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // helper: count items in inventory by name
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // helper: pick a random direction vector (components -1,0,1, not all zero)
  function randomDirection() {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  // 1️⃣ Ensure we have a stone (or better) pickaxe and equip it
  const pickaxeNames = ['stone_pickaxe', 'iron_pickaxe', 'golden_pickaxe', 'diamond_pickaxe', 'netherite_pickaxe'];
  let pickaxeItem = null;
  for (const name of pickaxeNames) {
    const item = bot.inventory.findInventoryItem(mcData.itemsByName[name]?.id);
    if (item) {
      pickaxeItem = item;
      break;
    }
  }
  if (!pickaxeItem) {
    bot.chat('I do not have a stone or better pickaxe, cannot mine iron ore.');
    return;
  }
  await bot.equip(pickaxeItem, 'hand');
  bot.chat(`Equipped ${pickaxeItem.name} for mining iron ore.`);

  // 2️⃣ Locate an iron ore block within 32 blocks
  let ironBlock = bot.findBlock({
    matching: mcData.blocksByName.iron_ore.id,
    maxDistance: 32
  });

  // 3️⃣ If not found, explore randomly until we locate one (max 60 s)
  if (!ironBlock) {
    bot.chat('No iron ore nearby, exploring...');
    await exploreUntil(bot, randomDirection(), 60, () => {
      const blk = bot.findBlock({
        matching: mcData.blocksByName.iron_ore.id,
        maxDistance: 32
      });
      return blk ? blk : null;
    });
    ironBlock = bot.findBlock({
      matching: mcData.blocksByName.iron_ore.id,
      maxDistance: 32
    });
    if (!ironBlock) {
      bot.chat('Could not find any iron ore after exploring.');
      return;
    }
  }

  // 4️⃣ Mine three iron ore blocks
  bot.chat(`Found iron ore at ${ironBlock.position}. Mining three blocks...`);
  await mineBlock(bot, 'iron_ore', 3);

  // 5️⃣ Verify we now have at least three iron ore items
  const ironCount = countItem('iron_ore');
  if (ironCount >= 3) {
    bot.chat(`Success! I now have ${ironCount} iron ore.`);
  } else {
    bot.chat(`Failed to collect enough iron ore. I have ${ironCount}.`);
  }
}