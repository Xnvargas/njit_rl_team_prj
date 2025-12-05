// main function to mine exactly two stone blocks (producing cobblestone)
async function mineTwoStoneBlocks(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // helper: pick a random direction vector (components -1,0,1, not all zero)
  function randomDirection() {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  // helper: count items in inventory by name
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // 1️⃣ Ensure we have a stone (or better) pickaxe
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
    bot.chat('I have no stone or better pickaxe, cannot mine stone.');
    return;
  }
  await bot.equip(pickaxeItem, 'hand');
  bot.chat(`Equipped ${pickaxeItem.name} for mining stone.`);

  // 2️⃣ Locate a stone block nearby
  let stoneBlock = bot.findBlock({
    matching: mcData.blocksByName.stone.id,
    maxDistance: 32
  });

  // 3️⃣ If not found, explore randomly until we locate one (max 60 s)
  if (!stoneBlock) {
    bot.chat('No stone block nearby, exploring...');
    await exploreUntil(bot, randomDirection(), 60, () => {
      const blk = bot.findBlock({
        matching: mcData.blocksByName.stone.id,
        maxDistance: 32
      });
      return blk ? blk : null;
    });
    stoneBlock = bot.findBlock({
      matching: mcData.blocksByName.stone.id,
      maxDistance: 32
    });
    if (!stoneBlock) {
      bot.chat('Could not find any stone block after exploring.');
      return;
    }
  }

  // 4️⃣ Mine two stone blocks (will give cobblestone)
  bot.chat(`Found stone at ${stoneBlock.position}. Mining two blocks...`);
  await mineBlock(bot, 'stone', 2);

  // 5️⃣ Verify we now have at least two cobblestone items
  const cobbleCount = countItem('cobblestone');
  if (cobbleCount >= 2) {
    bot.chat(`Success! I now have ${cobbleCount} cobblestone (mined from stone).`);
  } else {
    bot.chat(`Failed to obtain enough cobblestone. I have ${cobbleCount}.`);
  }
}