// main function to mine at least five coal ore blocks
async function mineFiveCoal(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // pick a random horizontal direction (components -1,0,1, not all zero)
  function randomHorizontalDirection() {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  // ---------- 1. ensure we have a pickaxe ----------
  const pickaxeNames = ['iron_pickaxe', 'stone_pickaxe', 'wooden_pickaxe'];
  let pickaxeItem = null;
  for (const name of pickaxeNames) {
    const id = mcData.itemsByName[name]?.id;
    if (id && bot.inventory.count(id) > 0) {
      pickaxeItem = bot.inventory.findInventoryItem(id);
      break;
    }
  }
  if (!pickaxeItem) {
    bot.chat('I have no pickaxe, trying to craft a stone pickaxe...');
    // need 3 cobblestone + 2 sticks
    if (countItem('cobblestone') < 3 || countItem('stick') < 2) {
      bot.chat('Not enough resources to craft a stone pickaxe.');
      return;
    }
    await craftItem(bot, 'stone_pickaxe', 1);
    const id = mcData.itemsByName.stone_pickaxe.id;
    pickaxeItem = bot.inventory.findInventoryItem(id);
    if (!pickaxeItem) {
      bot.chat('Failed to craft a stone pickaxe.');
      return;
    }
  }

  // equip the pickaxe
  await bot.equip(pickaxeItem, 'hand');
  bot.chat(`Equipped ${pickaxeItem.name} for mining.`);

  // ---------- 2. locate coal ore ----------
  let coalBlock = bot.findBlock({
    matching: mcData.blocksByName.coal_ore.id,
    maxDistance: 32
  });
  if (!coalBlock) {
    bot.chat('No coal ore nearby, exploring...');
    coalBlock = await exploreUntil(bot, randomHorizontalDirection(), 60, () => {
      const blk = bot.findBlock({
        matching: mcData.blocksByName.coal_ore.id,
        maxDistance: 32
      });
      return blk || null;
    });
  }
  if (!coalBlock) {
    bot.chat('Could not find any coal ore after exploring.');
    return;
  }
  bot.chat('Coal ore found, starting mining...');

  // ---------- 3. mine at least 5 coal ore blocks ----------
  await mineBlock(bot, 'coal_ore', 5);

  // ---------- 4. verify ----------
  const coalCount = countItem('coal');
  if (coalCount >= 5) {
    bot.chat(`Success! I now have ${coalCount} coal.`);
  } else {
    bot.chat(`Mining finished but I only have ${coalCount} coal.`);
  }
}