// main function to mine exactly one iron ore block
async function mineOneIronOre(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // helper: count how many of a given item are in inventory
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // 1️⃣ Already have raw iron?
  if (countItem('raw_iron') >= 1) {
    bot.chat('I already have raw iron in my inventory.');
    return;
  }

  // 2️⃣ Ensure we have a stone pickaxe (or better)
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
    bot.chat('I have no suitable pickaxe to mine iron ore.');
    return;
  }
  await bot.equip(pickaxeItem, 'hand');
  bot.chat(`Equipped ${pickaxeItem.name} for mining.`);

  // 3️⃣ Look for iron ore nearby
  let ironOreBlock = bot.findBlock({
    matching: mcData.blocksByName.iron_ore.id,
    maxDistance: 32
  });

  // 4️⃣ If not found, explore randomly until we locate one
  if (!ironOreBlock) {
    bot.chat('No iron ore nearby, exploring...');
    const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    await exploreUntil(bot, randomDir, 60, () => {
      const blk = bot.findBlock({
        matching: mcData.blocksByName.iron_ore.id,
        maxDistance: 32
      });
      return blk ? blk : null; // stop when found
    });
    ironOreBlock = bot.findBlock({
      matching: mcData.blocksByName.iron_ore.id,
      maxDistance: 32
    });
  }

  // 5️⃣ If still not found, give up
  if (!ironOreBlock) {
    bot.chat('Could not locate any iron ore after exploring.');
    return;
  }

  // 6️⃣ Mine one iron ore block
  bot.chat(`Found iron ore at ${ironOreBlock.position}. Mining one...`);
  await mineBlock(bot, 'iron_ore', 1);

  // 7️⃣ Verify we now have raw iron
  if (countItem('raw_iron') >= 1) {
    bot.chat('Successfully mined raw iron.');
  } else {
    bot.chat('Failed to obtain raw iron after mining.');
  }
}