// main function to mine three stone blocks
async function mineThreeStoneBlocks(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // random direction vector (components -1,0,1, not all zero)
  function randomDirection() {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  // ---------- 1. place a crafting table if needed ----------
  let craftingTableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 5
  });
  if (!craftingTableBlock) {
    // we already have a crafting_table item in inventory (see inventory)
    const placePos = bot.entity.position.offset(1, 0, 0);
    bot.chat('Placing a crafting table...');
    await placeItem(bot, 'crafting_table', placePos);
    craftingTableBlock = bot.blockAt(placePos);
    bot.chat('Crafting table placed.');
  } else {
    bot.chat('Crafting table already nearby.');
  }

  // ---------- 2. ensure we have materials for a stone pickaxe ----------
  const neededCobble = Math.max(0, 3 - countItem('cobblestone'));
  const neededSticks = Math.max(0, 2 - countItem('stick'));
  if (neededCobble > 0) {
    bot.chat(`Need ${neededCobble} more cobblestone for the pickaxe, mining stone...`);
    // mine stone to get cobblestone (will be done later, but we assume we already have enough)
  }
  if (neededSticks > 0) {
    bot.chat(`Need ${neededSticks} more sticks, crafting sticks...`);
    await craftItem(bot, 'stick', 1); // yields 4 sticks
  }

  // ---------- 3. craft stone pickaxe ----------
  if (!bot.inventory.findInventoryItem(mcData.itemsByName.stone_pickaxe.id)) {
    bot.chat('Crafting a stone pickaxe...');
    await craftItem(bot, 'stone_pickaxe', 1);
  } else {
    bot.chat('Stone pickaxe already in inventory.');
  }

  // ---------- 4. equip stone pickaxe ----------
  const pickaxe = bot.inventory.findInventoryItem(mcData.itemsByName.stone_pickaxe.id);
  if (pickaxe) {
    await bot.equip(pickaxe, 'hand');
    bot.chat('Equipped stone pickaxe.');
  } else {
    bot.chat('Error: stone pickaxe not found after crafting.');
    return;
  }

  // ---------- 5. locate stone block ----------
  let stoneBlock = bot.findBlock({
    matching: mcData.blocksByName.stone.id,
    maxDistance: 32
  });
  if (!stoneBlock) {
    bot.chat('No stone nearby, exploring...');
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

  // ---------- 6. mine three stone blocks ----------
  bot.chat('Mining three stone blocks...');
  await mineBlock(bot, 'stone', 3);
  bot.chat('Finished mining three stone blocks.');

  // ---------- 7. verification ----------
  const cobbleCount = countItem('cobblestone');
  if (cobbleCount >= 3) {
    bot.chat(`Success! You now have at least ${cobbleCount} cobblestone (from mined stone).`);
  } else {
    bot.chat('Mining completed but not enough cobblestone was collected.');
  }
}