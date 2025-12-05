// main function to mine at least three coal items
async function mineThreeCoal(bot) {
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

  // ---------- 1. already have enough coal? ----------
  if (countItem('coal') >= 3) {
    bot.chat('I already have at least three coal.');
    return;
  }

  // ---------- 2. ensure a pickaxe is equipped ----------
  // Prefer stone_pickaxe, otherwise any pickaxe
  const pickaxeNames = ['stone_pickaxe', 'iron_pickaxe', 'golden_pickaxe', 'diamond_pickaxe', 'netherite_pickaxe', 'wooden_pickaxe'];
  let pickaxeItem = null;
  for (const name of pickaxeNames) {
    const item = bot.inventory.findInventoryItem(mcData.itemsByName[name]?.id);
    if (item) {
      pickaxeItem = item;
      break;
    }
  }
  if (!pickaxeItem) {
    bot.chat('No pickaxe found in inventory – cannot mine coal.');
    return;
  }
  await bot.equip(pickaxeItem, 'hand');
  bot.chat(`Equipped ${pickaxeItem.name} for mining.`);

  // ---------- 3. locate coal ore ----------
  let coalBlock = bot.findBlock({
    matching: mcData.blocksByName.coal_ore.id,
    maxDistance: 32
  });
  if (!coalBlock) {
    bot.chat('No coal ore nearby, exploring...');
    const dir = randomDirection();
    await exploreUntil(bot, dir, 60, () => {
      const blk = bot.findBlock({
        matching: mcData.blocksByName.coal_ore.id,
        maxDistance: 32
      });
      return blk ? blk : null;
    });
    coalBlock = bot.findBlock({
      matching: mcData.blocksByName.coal_ore.id,
      maxDistance: 32
    });
    if (!coalBlock) {
      bot.chat('Could not find any coal ore after exploring.');
      return;
    }
  }
  bot.chat(`Found coal ore at ${coalBlock.position}. Starting mining.`);

  // ---------- 4. mine three coal ore blocks ----------
  await mineBlock(bot, 'coal_ore', 3);
  bot.chat('Mined three coal ore blocks.');

  // ---------- 5. verify we have enough coal, mine extra if needed ----------
  let coalCount = countItem('coal');
  let extraAttempts = 0;
  while (coalCount < 3 && extraAttempts < 2) {
    bot.chat(`Only have ${coalCount} coal, mining one more ore block.`);
    await mineBlock(bot, 'coal_ore', 1);
    coalCount = countItem('coal');
    extraAttempts++;
  }

  // ---------- 6. final report ----------
  if (coalCount >= 3) {
    bot.chat(`Success! I now have ${coalCount} coal.`);
  } else {
    bot.chat(`Failed to collect enough coal. I have ${coalCount} coal.`);
  }
}